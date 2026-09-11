# 팀 전용 학습 문제 관리

Python과 SQL 문제의 생성·수정·삭제는 백엔드의 팀 전용 API를 사용한다. 게임 회원 계정은 관리 권한과
관계없으며, 모든 관리 요청은 `X-API-Key` 헤더가 있어야 한다. 키가 없거나 틀리면 서버가 `401`로 거절한다.

팀 키는 Git에 저장하지 않는다. 백엔드 실행 환경의 `.env`에는 다음처럼 값의 이름만 맞춰 설정한다.

```dotenv
TASKS_API_KEY=<팀 채널에서 받은 키>
```

PowerShell에서 관리 도구를 실행할 때도 같은 키와 API 주소를 현재 터미널에만 설정한다.

```powershell
$env:TASKS_API_KEY="<팀 채널에서 받은 키>"
$env:CAT_GAME_API_BASE_URL="http://127.0.0.1:8000"
```

문제 생성 JSON은 백엔드의 `TaskCreate` 형식을 사용한다. `domain`은 `PYTHON` 또는 `SQL`, `type`은
`CODE` 또는 `MULTIPLE_CHOICE`, `difficulty`는 `BRONZE`, `SILVER`, `GOLD` 중 하나다.

```powershell
npm run tasks:manage -- create .\task.json
npm run tasks:manage -- update <task-public-id> .\changes.json
npm run tasks:manage -- delete <task-public-id>
```

수정 JSON에는 바꿀 필드만 넣는다. 삭제는 기존 풀이 기록을 보존하기 위해 DB 행을 지우지 않고 문제를
비활성화한다. 비활성화된 문제는 일반 문제 목록과 추천에서 제외된다.

Swagger UI(`/docs`)를 사용할 때는 각 관리 API의 `X-API-Key` 입력란에 팀 키를 넣는다. 키 원문이 포함된
JSON, 화면 캡처, 터미널 기록은 커밋하거나 공개 채널에 올리지 않는다.
