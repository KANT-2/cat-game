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

PWA와 `/api`, `/health`, `/ready`는 같은 공개 호스트를 사용한다. 따라서 운영의 `__Host-nyang_session`
쿠키와 CSRF 쿠키를 다른 서브도메인으로 넓힐 필요가 없다. nginx는 API 본문 크기와 proxy timeout을 제한하고,
정적 해시 자산만 장기 캐시한다. 앱 셸과 service worker는 `no-store`로 갱신하며, CSP를 포함한 보안 헤더는
캐시 정책과 관계없이 모든 응답에 유지한다.

## 백업과 복구

백업 파일은 새 절대 경로만 허용하고 생성 후 `pg_restore --list`로 형식을 검증한다.

```bash
CAT_GAME_ENV_FILE=/srv/nyang/production.env \
  scripts/backup-production.sh /srv/nyang/backups/cat-game-20260906.dump
```

복구는 현재 DB 객체를 교체하는 파괴적 작업이므로 백업을 별도 보관한 뒤 확인 문자열을 명시해야 한다.

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
