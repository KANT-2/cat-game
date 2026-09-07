# 프로덕션 Docker 운영

`compose.production.yml`은 개발용 `compose.integration.yml`과 분리된 단일 호스트 운영 기준이다. PostgreSQL과
FastAPI는 호스트 포트를 열지 않고, nginx만 `127.0.0.1:8080`에 노출한다. 외부 리버스 프록시 또는 로드
밸런서가 이 포트 앞에서 TLS를 종료하고 `CAT_GAME_PUBLIC_ORIGIN`의 HTTPS 호스트로 서비스해야 한다.
답안 채점은 API가 아니라 전용 `grading-worker`가 PostgreSQL 큐에서 가져간다. Docker TLS 인증서와 채점
엔드포인트는 이 워커에만 제공되며 API 컨테이너에는 Docker 연결 권한이 없다.

## 필수 준비

1. `production.env.example`을 저장소 밖의 `production.env`로 복사하고 모든 `replace-...` 값을 교체한다.
2. DB 비밀번호는 URL에 넣을 때 percent-encoding한 값을 `CAT_GAME_DATABASE_URL`에 사용한다.
3. `CAT_GAME_AUTH_RATE_LIMIT_SECRET`은 모든 API 인스턴스가 공유하는 32바이트 이상의 무작위 값으로 만든다.
4. Python 채점은 호스트 Docker 소켓을 API 컨테이너에 마운트하지 않는다. 별도 격리 호스트의 TLS Docker
   endpoint와 클라이언트 인증서 디렉터리를 `CAT_GAME_GRADING_DOCKER_*`에 지정한다.
5. SQL 채점은 운영 애플리케이션 DB와 분리된 빈 PostgreSQL을 준비하고, superuser가 아닌 전용 계정 URL을
   `CAT_GAME_SQL_GRADING_DATABASE_URL`에 지정한다. 이 계정은 자신의 임시 스키마를 생성·삭제할 수 있어야 한다.

운영 설정을 렌더링하고 시작한다.

```bash
docker compose --env-file production.env -f compose.production.yml config --quiet
docker compose --env-file production.env -f compose.production.yml up --build -d
docker compose --env-file production.env -f compose.production.yml ps
curl -fsS https://nyang.example.com/ready
```

`backend`, `grading-worker`, `frontend`, `db`가 모두 `healthy`여야 한다. 워커 healthcheck는 PostgreSQL 큐를
정상 조회한 뒤 기록되는 heartbeat를 검사하므로, 프로세스가 살아 있어도 DB 폴링 루프가 멈추면
`unhealthy`가 된다. 워커가 재시작되더라도 제한 시간을 넘긴 `RUNNING` 임대를 다시 가져오므로 제출을
수동으로 재생성하지 않는다. 기본 임대 시간은 60초이며 실제 샌드박스 제한보다 충분히 길게
`CAT_GAME_GRADING_LEASE_SECONDS`로 조정한다.
메모리·CPU·PID·출력 제한은 `production.env.example`의 `CAT_GAME_GRADING_*` 값을 기준으로 조정한다.
특히 출력 상한은 학생 프로세스와 Docker CLI 양쪽에 적용되므로 워커가 무한 출력을 메모리에 쌓지 않는다.
SQL 채점의 연결·statement timeout과 행·출력 상한은 `CAT_GAME_SQL_GRADING_*` 값으로 제한하며, 해당
데이터베이스에는 운영 데이터나 다른 서비스의 테이블을 두지 않는다.

PWA와 `/api`, `/health`, `/ready`는 같은 공개 호스트를 사용한다. 따라서 운영의 `__Host-nyang_session`
쿠키와 CSRF 쿠키를 다른 서브도메인으로 넓힐 필요가 없다. nginx는 API 본문 크기와 proxy timeout을 제한하고,
정적 해시 자산만 장기 캐시한다. 앱 셸과 service worker는 `no-store`로 갱신하며, CSP를 포함한 보안 헤더는
캐시 정책과 관계없이 모든 응답에 유지한다. 이미 설치된 PWA를 오프라인에서 다시 열면 캐시된 Canvas 셸이
연결 오류 화면을 유지하며, 온라인 복귀 후 새로고침하면 서버 세션과 상태를 다시 읽는다.

## 백업과 복구

백업 파일은 새 절대 경로만 허용한다. 같은 디렉터리의 `.partial` 파일에 먼저 기록하고
`pg_restore --list` 검증이 성공한 뒤에만 최종 이름으로 원자적으로 바꾼다. 실패한 임시 파일은 제거한다.

```bash
CAT_GAME_ENV_FILE=/srv/nyang/production.env \
  scripts/backup-production.sh /srv/nyang/backups/cat-game-20260906.dump
```

복구는 현재 DB 객체를 교체하는 파괴적 작업이므로 백업을 별도 보관한 뒤 확인 문자열을 명시해야 한다.
복구 중 새 API 명령이나 채점 완료가 DB를 변경하지 않도록 `backend`와 `grading-worker`를 함께 멈추고,
성공한 뒤 두 서비스를 다시 시작한다. 복구가 실패하면 부분 상태를 서비스하지 않도록 두 서비스는 정지된
상태로 유지되며 운영자가 로그와 백업을 확인한 뒤 다시 실행한다.

```bash
CAT_GAME_ENV_FILE=/srv/nyang/production.env \
CAT_GAME_RESTORE_CONFIRM=restore-cat-game \
  scripts/restore-production.sh /srv/nyang/backups/cat-game-20260906.dump
```

복구 후 `/ready`, 로그인, 게임 스냅샷과 학습 제출을 확인한다. 백업은 매일 수행하고 보존 주기와 외부 저장소
복제는 배포 환경의 운영 정책으로 정한다. 인증 제한 원장은 매일 다음 명령으로 정리한다.

```bash
docker compose --env-file production.env -f compose.production.yml \
  exec -T backend python scripts/prune_auth_rate_limits.py
```

## 장애 확인

- `/health`: FastAPI 프로세스가 요청을 처리하는지 확인한다.
- `/ready`: PostgreSQL 연결까지 성공했는지 확인한다. nginx와 오케스트레이터는 이 경로를 사용한다.
- `grading-worker` healthcheck: 최근 큐 DB 조회가 성공했는지 확인한다. `unhealthy`이면 워커 로그의
  `grading_worker_poll_failed`와 PostgreSQL 연결 상태를 함께 확인한다.
- `X-Request-ID`: 사용자 오류 응답과 구조화 로그를 연결한다. 로그에는 쿼리, 헤더, 비밀번호, 세션 토큰,
  제출 코드를 기록하지 않는다.
- API가 복구되면 클라이언트의 안전한 조회는 한 번 재시도한다. 상태 변경은 자동 재시도하지 않고 업무별
  멱등 키가 있는 명령만 사용자가 다시 실행한다.
