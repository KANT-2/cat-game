# 코드 가이드

이 문서는 코드를 처음 여는 작업자가 데이터 흐름과 주요 계약을 빠르게 찾기 위한 개발 문서다. 제품 요구사항은 `PDR.md`, 구조 결정은 `ARCHITECTURE.md`와 ADR을 기준으로 한다.

## 인라인 문서 원칙

주석은 코드가 이미 말해 주는 내용을 반복하지 않는다.

- 호출자가 알아야 하는 부작용, 실패 결과, 좌표 기준이 있는 공개 함수에 TSDoc을 작성한다.
- 계층 사이에서 전달되는 복잡한 데이터 계약은 목적과 의도적으로 제외한 정보를 설명한다.
- 변수, 단순 상수, 클래스 이름을 다시 읽어 주는 주석은 작성하지 않는다.
- 구현 방법보다 계약이 보장하는 결과와 제한을 기록한다.
- Canvas 런타임 문구는 주석이나 TypeScript 문자열이 아니라 `src/content/ko.json`에 둔다. PWA manifest와 HTML 제목 같은 플랫폼 메타데이터는 빌드 설정에 둔다.

## 실행 시작점

```text
src/main.ts
  ├─ GameApp.create()
  │   ├─ PixiJS Application 생성
  │   ├─ GameStateStore 생성
  │   ├─ LocalGameClient 생성
  │   └─ HomeScene에 GameClient 주입
  └─ registerPwa()
      └─ 설치 가능 상태와 service worker 이벤트 연결
```

`src/app/GameApp.ts`만 구체적인 게임 클라이언트와 저장소 구현을 조립한다. 장면 코드에서 `LocalGameClient` 또는 `localStorage`를 직접 import하지 않는다.

## GameClient 데이터 흐름

UI는 `src/core/GameClient.ts`의 계약만 사용한다.

### 가구 배치

요청:

```json
{
  "kind": "bed",
  "x": 4,
  "y": 3,
  "rotation": 1
}
```

성공:

```json
{
  "ok": true,
  "instanceId": "bed-..."
}
```

실패:

```json
{
  "ok": false,
  "reason": "occupied"
}
```

UI는 `reason`을 메시지 키로 변환해 보여 줄 뿐 충돌을 다시 판정하지 않는다.

### 퀴즈 답안 제출

`getQuiz()` 결과에는 선택지 ID와 메시지 키만 있으며 정답 ID는 없다. `answerQuiz()`가 정답, 최초 완료와 보상을 함께 판정한다.

```json
{
  "ok": true,
  "correct": true,
  "feedbackMessage": "study.correct",
  "firstCompletion": true,
  "coinsAwarded": 25
}
```

게임 시스템은 사용자 문장을 반환하지 않는다. UI가 `feedbackMessage`를 `ko.json`에서 조회한다. 처리할 수 없는 ID는 `ok: false`와 기계 판독 가능한 `reason`으로 반환한다.

## 상태와 저장

`GameState`는 렌더 객체 없이 JSON으로 직렬화 가능한 값만 가진다.

```text
UI command
  → LocalGameClient 검증
  → 새 GameState 생성
  → GameStateRepository.save()
  → 구독자에게 복제된 snapshot 통지
  → HomeScene 다시 렌더링
```

`getSnapshot()`과 구독 결과는 복제본이므로 UI에서 객체를 변경해도 시스템 상태가 바뀌지 않는다. 저장 구조가 바뀌면 `GameStateStore.load()`에서 이전 데이터를 읽는 마이그레이션을 제공한다.

## 방 좌표와 배치

- 방 상태는 `10 × 8` 논리 격자를 사용한다.
- `x`, `y`는 픽셀이 아니라 논리 셀 좌표다.
- 회전값 `0`은 원본 점유 크기, `1`은 너비와 높이를 바꾼 크기다.
- `isPlacementFree()`는 방 경계와 기존 가구의 직사각형 겹침을 검사한다.
- `gridToScreen()`과 `screenToGrid()`만 논리 좌표와 Canvas 좌표를 변환한다.

배치 미리보기는 UI 반응성을 위해 같은 순수 규칙을 읽지만, 최종 성공 여부는 항상 `GameClient.placeFurniture()` 결과를 따른다.

## 메시지 JSON

`src/content/messages.ts`가 `ko.json`의 키를 `MessageId` 타입으로 만든다. 동적 값은 명명된 자리표시자를 사용한다.

```json
{
  "furniture.placed": "{item}를 배치했어요."
}
```

```ts
message("furniture.placed", { item: message("furniture.bed") });
```

키는 `기능.의미` 형식을 사용한다. 기존 문구의 의미가 같으면 키를 재사용하고, 의미가 달라지면 기존 키의 뜻을 바꾸지 말고 새 키를 만든다.

## 이미지 리소스

게임 장면용 이미지 경로는 `public/assets/catalog.json`에만 등록한다. 코드에는 카탈로그 ID를 전달하고 파일 경로를 직접 넣지 않는다. PWA 앱 아이콘은 게임 리소스가 아니므로 `vite.config.ts`에서 별도로 등록한다.

현재 절차형 도형은 렌더링·배치 검증을 위한 placeholder다. 실제 이미지가 추가되면 `src/assets/AssetCatalog.ts`의 계약을 통해 장면에 연결한다.

```json
{
  "id": "furniture.sofa.green.01",
  "kind": "furniture",
  "src": "/assets/room/furniture/sofa-green-01.webp",
  "anchor": { "x": 0.5, "y": 0.88 }
}
```

점유 크기, 충돌, 가격, 보상은 리소스 메타데이터가 아니라 게임 시스템 규칙이다.

## 새 기능을 넣을 위치

| 변경 내용 | 시작 경로 |
| --- | --- |
| 상태, 보상, 판정, 충돌 | `src/domain`, `src/core` |
| Canvas 화면과 입력 | `src/game` |
| 사용자 문구 | `src/content/ko.json` |
| 이미지와 앵커 | `public/assets/catalog.json` |
| 브라우저 저장 | `src/services` |
| 앱 설치와 service worker | `src/pwa` |
| 구현체 연결 | `src/app` |

공개 함수의 동작이나 `GameClient` JSON 형태가 바뀌면 같은 변경에서 TSDoc과 이 문서의 예시도 함께 갱신한다.
