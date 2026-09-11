# 리소스 작업 영역

게임 장면 이미지는 이 디렉터리에 추가하고 `catalog.json`에 등록한다. UI 담당자가 TypeScript 파일에 이미지 경로를 직접 하드코딩하지 않도록 한다. PWA 앱 아이콘처럼 게임 장면에서 사용하지 않는 플랫폼 셸 리소스는 이 카탈로그의 대상이 아니다.

동영상에서 애니메이션을 제작할 때는 [동영상 스프라이트 제작 워크플로우](../../docs/VIDEO_SPRITE_WORKFLOW.md)를 따른다.

```text
assets/
  catalog.json
  forest/
    backgrounds/
    environment/
  furniture/
  decor/
  consumables/
  cats/
  ui/
  effects/
```

## 등록 예시

```json
{
  "id": "furniture.sofa.green.01",
  "kind": "furniture",
  "src": "/assets/furniture/sofa-green-01.webp",
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

## 가구와 간식

- 테마 가구는 배경과 같은 시선 높이·광원·바닥 접점을 사용하고 투명 WebP로 내보낸다.
- 간식은 `kind: "consumable"`로 등록하며 효과와 가격은 게임 시스템 카탈로그에서 관리한다.
- 생성 결과에 체크무늬가 픽셀로 그려졌거나 바깥 흰색·초록색 프린지가 남은 파일은 투명 리소스로 간주하지 않는다.
- 알파 가장자리는 검정과 흰 배경에서 모두 확인하고, 접시 아래에 별도 그림자를 굽지 않는다.

## 환경 리소스

- 생성형 이미지의 입력 순서, 프롬프트와 합성 승인 절차는 [환경 이미지 구도 고정 워크플로우](../../docs/ENVIRONMENT_ART_WORKFLOW.md)를 따른다.
- 홈 배경은 `1600 × 900` 기준의 낮은 횡스크롤 벨트뷰이며 이동 가능한 바닥의 원경 경계는 `y = 560`에 맞춘다.
- 독립 오브젝트는 같은 시선 높이와 지평선 기준을 사용한다. 바닥 러그를 위에서 내려다본 원형에 가깝게 만들지 않는다.
- 배경과 합쳐진 시안판이나 체크무늬를 픽셀로 그린 이미지는 런타임 자산으로 등록하지 않는다.
- 숲·골목·실내·책상·바다 배경은 상점의 `배경` 상품으로 등록하며, 같은 카메라와 바닥 여백을 유지한다.

## 스프라이트 시트

같은 크기의 애니메이션 프레임은 왼쪽 위부터 행 우선으로 배치하고 `spriteSheet`에 재생 정보를 등록한다.

```json
{
  "id": "cat.fluffy.idle.01",
  "kind": "cat",
  "src": "/assets/cats/fluffy-white/fluffy-white-idle-01.png",
  "anchor": { "x": 0.5, "y": 0.9 },
  "spriteSheet": {
    "frameWidth": 256,
    "frameHeight": 256,
    "columns": 5,
    "frameCount": 10,
    "framesPerSecond": 10,
    "playback": "loop"
  }
}
```

- `frameCount` 이후의 빈 칸은 재생하지 않는다.
- `playback`은 반복하는 `loop`, 한 번 재생하는 `once`, 마지막 프레임을 유지하는 `hold` 중 하나다.
- 프레임마다 바닥 접점이 흔들리지 않도록 같은 크기와 anchor를 사용한다.
- 배경색을 넣은 contact sheet와 GIF는 검수용으로만 사용하고 `catalog.json`에는 투명 PNG 또는 WebP 시트만 등록한다.
- 기존 `cat_04`인 `tabby`는 `orange-tabby-v2` 파일명을 사용하는 개선 시트를 쓰고, 신규 `silver`, `calico`, `tuxedo`, `fold` 파일명은 각각 해당 게임 변형으로 연결한다.
- 숫자형 export는 기존 런타임 규격인 256×256 프레임, 8열, 25fps 메타데이터를 사용하며, 12개 동작만 제공되는 변형의 드래그 동작은 해당 고양이의 `groom` 시트를 재사용한다.
- 공통 신규 동작 `scruff-lift`는 시트와 카탈로그 등록까지 완료된 리소스다. 게임 상태 기계에서 사용할 시점에 `CatAction`과 동작 전이 규칙을 별도 연결한다.
