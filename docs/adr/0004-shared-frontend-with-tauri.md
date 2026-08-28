# 후속 Tauri 데스크톱 앱은 PWA 프런트엔드를 공유한다

첫 배포 범위는 ADR 0033에 따라 설치형 PWA다. 데스크톱 위젯을 후속으로 제공할 때는 Tauri가 동일한 Canvas 프런트엔드와 `GameClient` 계약을 감싸며, 플랫폼별로 퀴즈·코드 작성·진행 화면을 별도로 구현하지 않는다.

## Considered Options

- PWA와 Tauri에 별도의 프런트엔드 구현
- PWA 프런트엔드를 후속 Tauri 호스트에서도 공유

## Consequences

Tauri 전용 창·트레이·데스크톱 레이어 기능은 플랫폼 어댑터로 격리해야 한다. PWA 게임 코어와 화면 계약을 재사용할 수 있지만, OS별 창 동작과 입력 영역은 별도 테스트가 필요하다. 이 결정은 Tauri를 PDR MVP 완료 조건에 포함하지 않는다.
