# 데스크톱 오버레이 호스트

데스크톱 호스트는 기존 PWA/PixiJS 프런트엔드를 다시 구현하지 않고 Tauri 2 WebView로 감싼다.
운영체제 창 기능은 `src-tauri/`에만 두며 `src/game/`, `src/domain/`, `src/core/`에서는 Tauri API를
사용하지 않는다.

## 현재 Windows 프로토타입

Windows의 `widget` 창은 기존 Vite 화면을 `desktop-widget` 표시 모드로 연다. 이 모드에서는 숲·가구·HUD를
숨기고 투명 Canvas에 고양이와 그림자만 렌더링한다. 창은 무테이며 작업표시줄에 나타나지 않고 다른 일반
창보다 위에 유지된다.

트레이 메뉴에서 다음 작업을 할 수 있다.

- 냥이 보이기
- 냥이 숨기기
- 화면 가운데로 이동
- `{ 냥 }` 종료

창 닫기 요청은 프로그램 종료 대신 숨김으로 처리한다. 완전히 종료할 때는 트레이 메뉴를 사용한다.
개발과 빌드는 다음 명령을 사용한다.

```bash
npm run desktop:check
npm run desktop:dev
npm run desktop:build
npm run smoke:desktop
```

`desktop:dev`는 5173 포트에서 Vite를 함께 시작한다. 이미 별도 개발 서버가 실행 중이면 먼저 종료해야
한다. `desktop:config:check`는 공유 프런트엔드 경로와 Windows 전용 투명·무테·항상 위 설정이 유지되는지
검사한다. `smoke:desktop`은 개발 서버가 실행 중일 때 투명 배경과 위젯 진입 경로를 브라우저에서 검사한다.

Windows 전용 창 값은 `src-tauri/tauri.windows.conf.json`에 둔다. 기본 설정을 덮어쓰지 않으므로 Linux는
이번 기능의 실행 대상이 아니며 투명 위젯이나 트레이 동작을 적용하지 않는다.

## 의도적으로 남긴 범위

- 투명 픽셀에서 아래 바탕화면으로 입력을 전달하는 영역별 클릭 통과
- 위치·크기·모니터 저장과 복원
- 전체 화면 앱·화면 잠금 감지 및 렌더링 중지
- Windows 바탕화면 레이어와 전체 화면 앱의 우선순위 조정

Windows 바탕화면 결합을 게임 화면 코드로 우회하지 않고 후속 플랫폼 어댑터로 추가한다.
