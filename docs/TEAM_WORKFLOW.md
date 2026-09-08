# 팀 작업 방식

## 브랜치 단위

한 브랜치는 한 역할의 한 결과물만 포함한다.

- 게임 시스템: `system/<feature>`
- UI/HUD/화면: `ui/<screen-or-component>`
- 리소스: `asset/<bundle-or-object>`
- 통합 수정: `integration/<feature>`

UI 코드와 대량 리소스 export, 게임 규칙 변경을 한 브랜치에 섞지 않는다. 연결이 필요한 기능은 게임 계약 → UI → 리소스 → 작은 통합 변경 순서로 합친다.

## 작업 계약

### 게임 시스템 담당

- 보상과 판정 수치는 `domain`에 둔다.
- 화면이 필요한 동작은 먼저 `GameClient` 명령과 결과 타입으로 노출한다.
- 순수 규칙과 `LocalGameClient` 상태 전이를 단위 테스트한다.
- UI에 임시 상태 변경 코드를 요청하지 않는다.

### UI/HUD/화면 담당

- 모든 화면 요소를 PixiJS Canvas 안에 만든다.
- 시스템 상태를 직접 변경하지 않고 `GameClient` 명령을 호출한다.
- Canvas 런타임 문구는 TypeScript에 작성하지 않고 `src/content/ko.json`에 등록한다.
- 이미지 파일 경로를 코드에 하드코딩하지 않고 카탈로그 ID를 사용한다.
- 기준 화면과 작은 화면에서 레이아웃을 확인한다.

### 리소스 담당

- export 파일과 `public/assets/catalog.json`만 함께 변경한다.
- 앵커는 오브젝트의 바닥 접점을 기준으로 기록한다.
- 환경 오브젝트는 `docs/ENVIRONMENT_ART_WORKFLOW.md`의 배경 합성 시안을 승인한 뒤 투명 원본으로 분리한다.
- 텍스트를 이미지에 굽지 않는다.
- `npm run assets:check`로 ID 중복, 경로, 앵커를 확인한다.

## 통합 전 확인

모든 코드 변경:

```bash
npm run quality:check
npm run check
npm run structure:check
npm run test
```

자동으로 고칠 수 있는 포맷, import 순서, 중괄호 누락은 다음 명령으로 정리한다.

```bash
npm run quality:fix
```

모든 `if`, `for`, `while` 본문은 한 문장이더라도 중괄호를 사용한다. 중첩 삼항 연산자나 `any`로 타입 오류를 우회하지 않는다.

리소스 변경:

```bash
npm run assets:check
npm run build
```

화면 흐름 변경은 개발 서버를 띄운 뒤 `npm run smoke`로 메인화면, Study, 배치 흐름을 확인한다. PWA 설정이나 앱 셸이 바뀌면 프로덕션 미리보기에서 `npm run smoke:pwa`도 실행한다.

## 리뷰 기준

- 공개 함수의 부작용이나 반환 계약이 바뀌면 TSDoc과 `docs/CODE_GUIDE.md`를 함께 갱신했는가
- 변수·단순 상수·클래스 이름을 반복하는 불필요한 주석을 추가하지 않았는가
- 게임 수치나 판정이 UI에 들어가지 않았는가
- PixiJS 또는 브라우저 타입이 `domain`/`core`에 들어가지 않았는가
- 새 게임 장면 이미지 경로가 카탈로그 밖에서 하드코딩되지 않았는가
- 저장 데이터 변경에 이전 버전 마이그레이션이 있는가
- 새 명령의 성공·실패 경로가 테스트되었는가
- 다른 역할의 소유 파일을 불필요하게 포맷하거나 이동하지 않았는가
