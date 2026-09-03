# 환경 이미지 구도 고정 워크플로우

이 문서는 생성형 이미지로 숲 공터의 배치 오브젝트를 만들 때 배경과 다른 카메라 각도가 섞이는 일을
막기 위한 제작 계약이다. 완성 이미지를 투명하게 만드는 것보다 **배경 위에서 구도를 먼저 승인하는 것**을
우선한다.

## 고정 카메라 계약

모든 숲 환경 이미지는 다음 값을 바꾸지 않는다.

| 항목 | 기준 |
| --- | --- |
| 기준 화면 | `1600 × 900` |
| 시점 | 낮은 횡스크롤 2.5D 벨트뷰 |
| 지평선·화면 중심 | `y = 560 / x = 800` |
| 배치 가능 깊이 | 화면 `y = 560…860` |
| 먼/가까운 가로 폭 | `1240 / 1560` |
| 먼/가까운 표시 배율 | `0.78 / 1.00` |
| 광원 | 화면 위쪽 중앙의 부드러운 낮 햇빛 |
| 런타임 그림자 | 코드에서 합성하므로 원본에 굽지 않음 |

생성 도구의 첫 번째 입력에는 실제 배경과 좌표를 합친
[`docs/art/forest-belt-composition-reference.png`](art/forest-belt-composition-reference.png)를 사용한다.
좌표만 겹쳐 볼 때는 투명한 `forest-belt-camera-guide.png`, 벡터 편집이 필요할 때는 같은 폴더의
`forest-belt-camera-guide.svg`를 사용한다. 실제 배경은
`public/assets/environment/forest-clearing-day-01.webp`가 유일한 구도 기준이다. 배경이나 SVG를 바꾼 뒤
`npm run art:camera-reference`로 두 PNG를 다시 만든다.

## 생성 입력 순서

생성 도구에는 다음 세 이미지를 역할과 함께 전달한다. 단순히 이미지를 첨부하는 것만으로는 어느 이미지를
우선해야 하는지 모델이 알 수 없으므로 순서를 프롬프트에 다시 적는다.

1. **구도 기준:** 배경과 가이드가 합쳐진 composition reference. 시점, 지평선과 배치 깊이를 결정한다.
2. **깨끗한 배경:** 현재 숲 배경. 광원, 색과 그림체를 결정한다.
3. **디자인 기준:** 만들 오브젝트의 원본. 색, 재질과 실루엣만 결정한다.

디자인 기준 이미지의 원근과 그림자는 복사하지 않는다. 배경과 충돌하면 항상 카메라 기준을 우선한다.

## 두 단계 생성

### 1. 배경 합성 시안

첫 생성에서는 투명 배경을 요구하지 않는다. 오브젝트 하나를 숲 배경의 중앙 깊이 `y ≈ 710`에 놓은
합성 시안을 만든다. 배경이 함께 있어야 모델과 검수자가 지평선, 보이는 윗면, 바닥 접점을 비교할 수 있다.

다음 항목 중 하나라도 어긋나면 누끼 작업으로 넘어가지 않고 이 단계에서 다시 생성한다.

- 오브젝트를 위에서 내려다보는 느낌이 난다.
- 바닥 러그나 방석의 세로 깊이가 가로 폭의 `35%`를 넘는다.
- 낮은 테이블 윗면의 보이는 깊이가 가로 폭의 `20…32%`를 벗어난다.
- 기둥형 오브젝트의 윗면이 크게 보이거나 바닥이 원에 가깝다.
- 오브젝트의 접지선이 주변 잔디의 접지선보다 위나 아래로 떠 있다.
- 배경과 다른 방향의 광원이나 자체 투영 그림자가 있다.

### 2. 투명 원본 분리

합성 시안이 승인된 뒤 그 시안을 이미지 편집 입력으로 사용해 오브젝트만 분리한다. 이 단계에서는 새로
그리지 않고 실루엣과 원근을 유지하도록 지시한다.

- 실제 알파 채널이 있는 PNG 또는 WebP로 export한다.
- 체크무늬, 흰 매트, 초록색 테두리와 발광을 픽셀로 남기지 않는다.
- 바닥 접점 아래에 여백을 최소화한다.
- 런타임에서 만드는 그림자와 겹치므로 생성 그림자는 제거한다.
- 카탈로그 anchor는 오브젝트가 땅에 닿는 중앙점에 둔다.

## 공통 프롬프트 템플릿

```text
Reference priority:
1) Image 1 is the authoritative 1600x900 composition, horizon, and camera guide.
2) Image 2 is the clean background and defines daylight and watercolor style.
3) Image 3 defines only the object's design, colors, and materials.

Place one {object} at screen position (800, 710) in the forest clearing.
Use a low eye-level 2.5D side-view belt-stage camera with the horizon at y=560.
Match the background's soft daylight from above-center.
Preserve verticals and keep the visible top-plane ratio appropriate for {object_class}.
Do not use isometric, top-down, three-quarter overhead, fisheye, or product-photo perspective.
Do not add text, extra objects, glow, outline halo, checkerboard, or a baked cast shadow.

This pass is a composition proof on the supplied forest background, not a transparent export.
```

투명 분리 단계에는 다음 문장을 추가한다.

```text
Keep the approved silhouette and perspective pixel-for-pixel. Remove only the background and
cast shadow. Return a real transparent alpha image; do not redraw the object.
```

## 게임 합성 승인

최종 export를 카탈로그에 등록한 뒤 `npm run smoke`로 다음 세 위치를 확인한다.

1. 먼 깊이 `y ≈ 590`
2. 중앙 깊이 `y ≈ 710`
3. 가까운 깊이 `y ≈ 830`

세 위치에서 접점은 이동하되 오브젝트 자체의 카메라 각도는 변하지 않아야 한다. 깊이에 따라 바뀌는 것은
크기와 그리기 순서뿐이다. 한 위치라도 배경 위에 얹은 스티커처럼 보이면 리소스를 승인하지 않는다.

카메라 계약을 변경해야 할 때는 배경만 새로 만들지 않는다. `src/game/config.ts`의 `CLEARING_GRID`, 카메라
가이드 SVG, 이 문서와 모든 환경 오브젝트를 같은 변경에서 갱신한다.
