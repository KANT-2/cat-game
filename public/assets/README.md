# 리소스 작업 영역

게임 장면 이미지는 이 디렉터리에 추가하고 `catalog.json`에 등록한다. UI 담당자가 TypeScript 파일에 이미지 경로를 직접 하드코딩하지 않도록 한다. PWA 앱 아이콘처럼 게임 장면에서 사용하지 않는 플랫폼 셸 리소스는 이 카탈로그의 대상이 아니다.

```text
assets/
  catalog.json
  room/
    floors/
    walls/
    furniture/
  cats/
  ui/
  effects/
```

## 등록 예시

```json
{
  "id": "furniture.sofa.green.01",
  "kind": "furniture",
  "src": "/assets/room/furniture/sofa-green-01.webp",
  "anchor": { "x": 0.5, "y": 0.88 },
  "tags": ["sofa", "green"]
}
```

규칙:

- ID는 `종류.대상.변형.번호` 형식의 소문자 영문으로 작성한다.
- 원본 작업 파일은 별도 디자인 저장소에서 관리하고 이곳에는 게임용 export만 둔다.
- 기본 게임용 이미지는 투명 WebP 또는 PNG를 사용한다.
- 글자는 이미지에 굽지 않는다.
- 가격, 점유 셀, 충돌, 보상 값은 리소스 카탈로그에 넣지 않는다.
- PR 전에 `npm run assets:check`를 실행한다.
