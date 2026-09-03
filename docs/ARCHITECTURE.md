# 클라이언트 아키텍처와 작업 경계

이 프로젝트는 PWA로 실행되는 하나의 PixiJS Canvas 게임이다. 현재는 단일 앱이지만 게임 시스템, UI, 리소스가 서로의 구현을 직접 수정하지 않도록 경계를 먼저 둔다.

문서의 역할은 겹치지 않게 유지한다. `PDR.md`는 제품 완료 조건, `PLAN.md`는 구현 순서, ADR은 확정된 결정, 이 문서는 현재 코드가 지켜야 할 구조, `CODE_GUIDE.md`는 현재 공개 계약을 설명한다. 구현 완료 현황을 별도 문서로 복제하지 않고 코드와 자동 검사로 확인한다. 같은 주제의 ADR이 충돌하면 번호가 더 큰 관련 ADR을 적용한다.

## 의존 방향

```text
main.ts
  └─ app/                 조립 지점
      ├─ core/            게임 유스케이스 구현
      │   └─ domain/      직렬화 가능한 상태와 순수 규칙
      ├─ services/        localStorage 등 플랫폼 어댑터
      └─ game/            PixiJS 화면
          ├─ core/        GameClient 계약만 사용
          └─ domain/      읽기 전용 타입·좌표 규칙 사용

public/assets/            빌드에 포함되는 이미지와 카탈로그
src/assets/               카탈로그를 읽는 기술 계약
src/content/              메시지 ID 타입과 Canvas 런타임 문구
src/desktop/              게임 상태와 격자를 사용하지 않는 데스크톱 전용 PixiJS 화면
src/pwa/                  설치와 service worker 연결
src-tauri/                후속 데스크톱 창 기능을 격리한 선택적 호스트
```

허용되는 방향은 바깥쪽 구현에서 안쪽 규칙을 향한다. `domain`은 렌더링·플랫폼 계층을 모르며 사용자 문장 대신 `content`의 `MessageId` 타입만 참조할 수 있다. `core`는 PixiJS와 브라우저 API를 모른다. `game`은 `LocalGameClient`나 `localStorage`를 직접 사용하지 않는다.

## 역할별 소유 영역

| 역할 | 주 소유 경로 | 책임 | 건드리지 않는 것 |
| --- | --- | --- | --- |
| 게임 시스템 | `src/domain`, `src/core`, 관련 단위 테스트 | 상태, 배치·충돌, 보상, 정답 판정, 명령 결과 | PixiJS 객체, 색상, 이미지 경로 |
| UI/HUD/화면 | `src/game`, `src/content/ko.json`, `src/style.css`, 브라우저 스모크 | 장면, Canvas UI, 문구, 레이아웃, 애니메이션, 입력 표현 | 보상 수치 결정, 상태 직접 저장, 정답·최종 충돌 판정 |
| 리소스 | `public/assets`, `public/assets/catalog.json` | 스프라이트, 아이콘, 앵커, 프레임, 번들 등록 | 가격, 점유 셀, 충돌, 보상 |
| 공동 연결부 | `src/app`, `src/main.ts`, `src/services`, `src/pwa`, 빌드 설정 | 구현체 조립, 저장소, PWA 수명주기 | 한 명이 장기간 독점하지 않고 작은 통합 PR로 변경 |

`src/game/presentation`의 색상과 라벨은 현재 절차형 프로토타입을 위한 UI 표시 데이터다. 실제 이미지 경로는 이곳에 넣지 않고 리소스 카탈로그의 안정적인 ID를 사용한다.

`desktop-widget.html → desktop-main.ts → DesktopWidgetApp → src/desktop`은 게임 진입점과 별도 번들로
구성한다. 데스크톱 화면은 `GameClient`, `GameStateStore`, `HomeScene`과 숲 격자를 사용하지 않으며,
공유 리소스 카탈로그와 고양이 애니메이션 타입만 재사용한다. Tauri 명령 호출은 `src/app/desktopWidgetHost.ts`에
격리한다.

## GameClient 경계

`src/core/GameClient.ts`가 UI와 게임 시스템 사이의 공개 API다.

- UI는 `getSnapshot()`과 `subscribe()`로 화면 상태를 받는다.
- UI 입력은 `placeFurniture`, `removeFurniture`, `answerQuiz` 같은 명령으로 전달한다.
- 명령의 성공 여부, 정답, 최초 완료, 보상 수치는 게임 시스템이 반환한다.
- 사용자 노출 문구는 문자열 대신 `MessageId`로 반환하고 UI가 JSON 카탈로그에서 해석한다.
- UI는 배치 미리보기에 `domain`의 순수 충돌 규칙을 재사용할 수 있지만 성공 여부는 `placeFurniture()` 결과를 따른다.
- 계약에는 PixiJS 타입, DOM 타입, 저장소 구현 타입을 추가하지 않는다.
- 새 서버 API가 생기면 같은 계약을 구현하는 원격 클라이언트로 교체한다. 화면은 서버 위치를 알 필요가 없다.

## 기능 추가 순서

예를 들어 상점 구매를 추가할 때는 다음 순서로 작업한다.

1. 게임 시스템 담당자가 `domain`에 가격·소유권 규칙을 만들고 단위 테스트를 작성한다.
2. `GameClient`에 `buyFurniture` 명령과 결과 타입을 추가한다.
3. 로컬 또는 서버 클라이언트가 계약을 구현한다.
4. UI 담당자가 계약만 호출하는 상점 장면을 만든다.
5. 리소스 담당자가 카탈로그에 상점 아이콘과 가구 이미지를 등록한다.
6. 앱 조립 지점에서 화면을 연결하고 스모크 테스트로 한 흐름을 확인한다.

이 순서를 지키면 UI가 임시로 재화를 차감하거나 리소스 파일이 충돌 크기를 결정하는 상황을 막을 수 있다.

## 상태와 저장

`GameState`는 JSON으로 직렬화할 수 있는 데이터만 가진다. `GameStateStore`는 현재의 로컬 저장 어댑터이며 규칙을 포함하지 않는다. 저장 형식이 바뀌면 이전 필드를 읽는 마이그레이션을 어댑터에 추가한다. 서버가 도입되면 재화, 완료 이력, 인벤토리는 서버가 권위 있는 상태가 된다.

## 자동 검사

```bash
npm run quality:check
npm run check
npm run structure:check
npm run assets:check
npm run test
npm run build
```

`structure:check`는 금지된 계층 import를, `assets:check`는 카탈로그 형식과 파일 누락을 검사한다.

## 선택적 데스크톱 호스트

`src-tauri/`는 동일한 Vite 빌드를 WebView에 표시하는 플랫폼 어댑터다. Windows의 항상 위·투명·무테
창과 트레이 같은 운영체제 정책을 소유하며 게임 규칙이나 PixiJS 장면을 복제하지 않는다. 현재 범위와
실행 방법은 `docs/DESKTOP_HOST.md`에 기록한다.
