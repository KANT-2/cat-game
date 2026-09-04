# Docker 통합 확인

이 구성은 PWA, FastAPI, PostgreSQL과 Python 격리 채점 이미지를 한 번에 실행하는 로컬 통합 환경이다.
운영 배포 구성이 아니며 개발 사용자 세션과 고정된 로컬 데이터베이스 자격 증명을 사용한다.

## 준비

프런트엔드와 백엔드 저장소를 같은 상위 디렉터리에 둔다.

```text
workspace/
├── cat-game/
└── cat-game-backend/
```

백엔드가 다른 위치에 있다면 `CAT_GAME_BACKEND_PATH`에 해당 경로를 지정할 수 있다.

## 실행과 확인

프런트엔드 저장소에서 다음을 실행한다.

```bash
docker compose -f compose.integration.yml up --build -d
docker compose -f compose.integration.yml ps
npm run smoke:integration
```

브라우저에서는 `http://127.0.0.1:4173`을 연다. 자동 스모크는 개발 세션 발급, 추천 과제 조회,
객관식 제출, 격리 컨테이너의 Python 코드 채점, Canvas 학습 화면의 백엔드 요청을 확인하고
`/tmp/cat-game-integration.png`를 남긴다.

## 종료와 초기화

```bash
docker compose -f compose.integration.yml down
```

학습 기록과 시드 데이터를 포함해 완전히 초기화하려면 다음을 실행한다.

```bash
docker compose -f compose.integration.yml down -v
```

백엔드는 제출 코드를 별도 격리 컨테이너에서 채점하기 위해 로컬 Docker 소켓을 마운트한다. 이 권한은
호스트 Docker 데몬을 제어할 수 있으므로 신뢰할 수 있는 개발 장비에서만 이 통합 구성을 실행한다.
