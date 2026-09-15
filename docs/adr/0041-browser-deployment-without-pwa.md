# 일반 웹 앱과 HTTP 캐시로 배포한다

운영 프런트엔드는 설치 manifest와 service worker를 제거하고 일반 웹 앱으로 배포한다. 이미지와 해시 정적
자산은 nginx의 장기 `immutable` 응답을 브라우저 HTTP 캐시가 재사용한다. `index.html`과
`assets/catalog.json`은 장기 캐시하지 않는다.

이 결정은 ADR 0003과 ADR 0033의 PWA 설치·오프라인 셸 범위를 대체한다. 서버 세션과 학습 기능이 온라인을
전제로 하므로 오프라인 앱 셸은 더 이상 제품 완료 조건이 아니다. 브라우저 설치 프롬프트와 오프라인 재실행도
지원하지 않는다.

기존 설치본이 영구히 남지 않도록 이전 service worker URL에는 제한된 전환 스크립트를 둔다. 이 스크립트는
`game-images-v1`과 `/cat-game/` 범위의 Workbox precache만 삭제하고 자기 등록을 해제한다. 다른 경로에서
운영되는 프로젝트의 Cache Storage나 service worker 등록은 변경하지 않는다. 새 웹 앱은 이 스크립트를
등록하지 않는다.
