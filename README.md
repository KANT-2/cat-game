# 코지 코드 캣

PixiJS Canvas로 만드는 설치형 PWA 프로그래밍 학습 고양이 게임이다.

## 실행

```bash
npm install
npm run dev
```

기본 개발 주소는 `http://localhost:5173`이다.

## 코드 구조

```text
src/
  app/                 PixiJS 앱 생명주기와 화면 크기 관리
  assets/              리소스 카탈로그 로딩 계약
  content/             사용자 노출 문구 JSON과 메시지 키 변환
  core/                UI가 호출하는 GameClient와 상태 전이 구현
  domain/              꾸미기·학습 상태와 순수 게임 규칙
  game/
    components/        재사용 가능한 Canvas UI
    entities/          고양이 같은 갱신 가능한 액터
    forest/            벨트뷰 숲 공터와 배치 오브젝트 렌더링
    scenes/            홈과 Study 등 화면 단위 조립
  pwa/                 설치 이벤트와 service worker 등록
  services/            저장소 등 외부 상태 접근
  main.ts              앱 조립만 담당하는 진입점
public/assets/          리소스 작업자의 export와 카탈로그
tests/                  게임 계약·좌표·배치·메시지 단위 테스트
scripts/                구조·리소스 검사와 브라우저 스모크 테스트
```

렌더 객체는 `game`, 직렬화 가능한 규칙과 데이터는 `domain`, 상태 전이는 `core`, 브라우저 API는 `services`와 `pwa`에 둔다. Canvas 런타임 문구는 `content/ko.json`에서 관리한다. UI는 재화·정답·최종 충돌 결과를 권위 있게 판정하지 않고 `GameClient` 계약을 호출한다.

제품 목표는 [PDR](docs/PDR.md), 구현 순서는 [PLAN](PLAN.md), 역할별 소유 경로와 기능 연결 순서는 [클라이언트 아키텍처](docs/ARCHITECTURE.md), 주요 계약과 데이터 흐름은 [코드 가이드](docs/CODE_GUIDE.md), 브랜치와 리뷰 규칙은 [팀 작업 방식](docs/TEAM_WORKFLOW.md), 이미지 등록 규격은 [리소스 작업 영역](public/assets/README.md)에 정리되어 있다. 확정된 설계가 충돌하면 번호가 더 큰 관련 ADR을 우선한다.

## 검사

```bash
npm run check
npm run quality:check
npm run structure:check
npm run assets:check
npm run test
npm run build
```

개발 서버가 실행 중일 때 다음 명령으로 Canvas 상호작용을 검사할 수 있다.

```bash
npm run smoke
```

스모크 검사는 메인화면, Study 퀴즈, 보상과 가구 배치 흐름을 헤드리스 Chromium에서 확인한다.

프로덕션 빌드의 manifest, service worker와 오프라인 재실행은 다음과 같이 검사한다.

```bash
npm run build
npm run preview
npm run smoke:pwa
```
