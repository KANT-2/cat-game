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

## 숲 공터 좌표와 배치

- 공터의 배치 상태는 `10 × 8` 논리 격자를 사용한다.
- `x`, `y`는 픽셀이 아니라 논리 셀 좌표다. `x`는 좌우, `y`는 먼 곳에서 화면 앞쪽으로 이어지는 깊이다.
- 회전값 `0`은 원본 점유 크기, `1`은 너비와 높이를 바꾼 크기다.
- `isPlacementFree()`는 공터 경계와 기존 가구의 직사각형 겹침을 검사한다.
- `gridToScreen()`과 `screenToGrid()`만 논리 좌표와 Canvas 좌표를 변환한다.

화면 투영은 먼 쪽 가로 폭이 좁고 가까운 쪽 가로 폭이 넓은 사다리꼴 벨트뷰다. 일반 플레이에서는 격자를 숨기고 꾸미기 모드에서만 배치 셀을 표시한다. 오브젝트 표시 순서는 `x + y`가 아니라 발 또는 바닥 접점의 `y` 깊이를 기준으로 정한다.

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

앱 시작 시 `src/assets/AssetCatalog.ts`가 카탈로그를 읽고 `src/assets/SpriteSheetLoader.ts`가
행 우선 시트를 PixiJS 프레임으로 자른다. `src/app`은 파일 경로 대신 고정 asset ID로 필요한
동작 세트를 조립해 장면에 주입한다. 장면과 액터는 이미 로드된 텍스처만 사용한다.

```json
{
  "id": "furniture.sofa.green.01",
  "kind": "furniture",
  "src": "/assets/furniture/sofa-green-01.webp",
  "anchor": { "x": 0.5, "y": 0.88 }
}
```

점유 크기, 충돌, 가격, 보상은 리소스 메타데이터가 아니라 게임 시스템 규칙이다.

행 우선 스프라이트 시트는 `spriteSheet`에 프레임 크기, 열 수, 실제 프레임 수, 초당 프레임 수와 재생 방식을 기록한다. 마지막 행의 남는 투명 칸은 `frameCount`에 포함하지 않는다. `playback`은 `loop`, `once`, `hold`만 사용한다.

고양이 동작 순서는 PixiJS와 분리된 `CatBehaviorStateMachine`이 관리하고 `CatActor`가 이동과 프레임
재생 명령을 실행한다. 대기 뒤에는 가중치에 따라 걷기·달리기·그루밍·긁기·수면·점프·장난 공격·
놀람 중 하나를 선택하되 직전 자율 행동은 연속으로 고르지 않는다. 동작별 대기 시간도 달라 그루밍·
긁기·수면 같은 긴 동작 뒤에는 다음 행동까지 충분히 쉰다. 걷기와 달리기 프레임은 시간에 따라 따로
재생하지 않고 실제로 이동한 논리 거리에 맞춰 진행한다. 목적지까지 남은 거리는 완전한 보폭 수로
나누어 마지막 위치에서 발이 보폭 경계에 맞게 멈춘다. 달리기는 막히지 않은 두 칸 경로를 우선 사용하며,
이동 중 목적지를 다시 지정해도 현재 발의 진행률을 유지한 채 남은 보폭만 다시 계산한다.

점프와 낙하는 착지 동작으로 연결된다. 수면은 잠든 마지막 프레임을 일정 시간 유지한 뒤 같은 클립을
역순으로 재생해 깨어난다. 고양이 클릭은 대기 중에는 즉시, 이동 중에는 현재 보폭이 끝날 때 한 번만
실행한다. 반응 재생 중의 연속 클릭과 반응 직후 2.5초 동안의 클릭은 무시한다. 비반복 동작 중 지정한
이동 목적지는 동작을 자르지 않고 대기 복귀 후 실행한다. 시스템용 `playAction()`만 현재 자율 행동을
즉시 우선할 수 있다.

주 포인터로 고양이를 8픽셀 이상 끌면 클릭 반응 대신 `scruffLift` 동작으로 전환한다. 들어 올리는
구간의 정점 프레임은 포인터를 누르고 있는 동안 유지하고, 놓으면 나머지 회복 프레임을 재생한 뒤
대기로 돌아간다. 드래그 중에는 가장 가까운 논리 셀을 초록색 또는 빨간색으로 표시한다. 빈 셀에
놓으면 해당 셀로 이동하고, 공터 밖이나 가구가 점유한 셀에 놓으면 시작 위치로 돌아간다. 이 위치도
걷기와 마찬가지로 화면 표현 상태이므로 현재 `GameState` 저장 형식에는 포함하지 않는다.

들어 올리는 동안 그림자는 고양이 아래의 바닥 위치를 따라가고, 실제 고양이 스프라이트만 그림자보다
52픽셀 위에 표시한다. 놓으면 그림자는 새 셀의 바닥 접점에 즉시 맞고 고양이는 `scruffLift` 회복
프레임의 남은 진행률에 맞춰 바닥까지 한 번에 내려온다. 별도의 시간 기반 하강을 겹치지 않아 시트의
회복 동작보다 먼저 멈췄다가 다시 떨어지는 현상을 방지한다.

고양이 그림자는 별도 타원이 아니라 같은 애니메이션 프레임을 검게 만든 뒤 바닥 방향으로
압축·투영하며 실제 스프라이트와 프레임 번호를 맞춘다. 행동 상태는 화면 표현에만 존재하며
`GameState`의 권위 있는 게임 규칙이나 저장 형식을 바꾸지 않는다.

그림자는 야외의 멀리 있는 해를 가정한 평행광 모델을 사용한다. 일반 사영식은 `그림자 = 바닥점 +
화면 높이 × 광선 방향`이다. 현재 해 위치 `(0, 0)`은 고양이 바로 위이므로 그림자 접점이 고양이
바로 아래에 머문다. 계산 함수는 `game/entities/shadowProjection.ts`에 남겨 향후 광원 위치가 바뀌면
Z에 비례한 접점 이동을 적용할 수 있다.

## 앱 시작과 로딩 장면

`GameApp.create()`는 HomeScene보다 `LoadingScene`을 먼저 Canvas에 붙인다. 로딩 장면은 카탈로그,
배경, 고양이 스프라이트의 실제 완료 비율을 표시하고 캐시가 빠른 경우에도 최소 3.4초 동안 유지된다.
idle 시트는 다른 동작보다 먼저 준비해 로딩 화면에서도 실제 플레이어 고양이를 사용한다. 준비가
끝나면 HomeScene을 아래에 배치하고 로딩 장면만 페이드 아웃하므로 빈 프레임이 노출되지 않는다.

로딩 안내 문구는 `ko.json`의 `loading.tip.*` 키만 사용한다. 실제 고양이가 하는 행동을 묘사한
후보 중 하나를 무작위로 고르고 약 1.6초마다 직전 문구와 겹치지 않게 교체한다. 문구 전환은 짧게
페이드되어 리소스 완료율 갱신과 시각적으로 충돌하지 않는다.

Canvas 초기화 전에는 `src/style.css`의 짙은 갈색 앱 셸 배경이 보인다. 이 색은 밤의 작업방 로딩
장면의 즉시 표시용 fallback과 맞춰 두며, HTML/DOM UI를 로딩 화면으로 사용하지 않는다. 로딩 장면의
게임 이름은 Canvas 텍스트 대신 카탈로그의 투명 `{ 냥 }` 로고 이미지를 사용한다.

설치형 PWA는 `catalog.json`, 카탈로그에 등록된 고양이 PNG 시트와 로딩 배경을 service worker에
미리 저장한다. 가챠로 획득한 고양이도 오프라인에서 바로 표시되어야 하므로 특정 품종을 precache에서
제외하지 않는다.

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

## 상점 구매와 보유 가구

구매 요청은 안정적인 상품 ID만 전달한다.

```json
{
  "itemId": "furniture.sofa"
}
```

성공 결과는 구매한 가구 종류와 남은 재화를 함께 보장한다.

```json
{
  "ok": true,
  "itemId": "furniture.sofa",
  "furnitureKind": "sofa",
  "remainingCoins": 995200,
  "remainingGems": 8
}
```

UI는 가격이나 잔액을 판정하지 않고 `buyShopItem()` 결과를 따른다. 성공한 가구는 `inventory`에 추가된다.
`placeFurniture()`는 배치할 때 보유 수량 한 개를 사용하고 `removeFurniture()`는 회수한 가구 한 개를 보유함에 돌려놓는다.
