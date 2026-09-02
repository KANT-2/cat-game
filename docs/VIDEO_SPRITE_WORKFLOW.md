# 동영상 스프라이트 제작 워크플로우

동영상으로 받은 캐릭터 애니메이션을 투명 PNG 스프라이트 시트로 변환할 때 사용한다. GIF 변환은 이 워크플로우에 포함하지 않는다.

## 결과물 기준

- 동작별 투명 PNG 스프라이트 시트를 만든다.
- 각 프레임은 `256 × 256`이며 왼쪽 위부터 행 우선으로 배치한다.
- 기본 추출 속도는 `10fps`다. 원본 움직임이 빠르면 접촉 시트로 확인한 뒤 높일 수 있다.
- 모든 동작이 같은 바닥 접점과 anchor를 사용한다.
- 배경 알파에는 투명, 반투명, 불투명 값이 함께 있어야 한다. `0`과 `255`만 있으면 사선 외곽이 계단처럼 보인다.
- 런타임 경로와 재생 정보는 `public/assets/catalog.json`에만 등록한다.

## 1. 원본 확인

원본 동영상은 작업 입력으로만 사용하고 게임 리소스 폴더에 복사하지 않는다. 해상도, fps, 재생 시간을 먼저 확인한다.

```bash
ffprobe -v error -show_entries stream=width,height,r_frame_rate,duration -of json input.mp4
```

다음 문제가 있으면 프레임 추출 전에 기록한다.

- 캐릭터가 화면 경계에 닿거나 귀, 꼬리, 발이 잘리는 구간
- 중간에 얼굴 비율, 선 굵기, 털 표현이 바뀌는 구간
- 같은 이름으로 묶기 어려운 서로 다른 대기 자세
- 배경색과 캐릭터색이 비슷한 구간

## 2. 검토용 프레임 추출

배경 제거 전의 원본 해상도를 유지해 `10fps` PNG 프레임을 만든다.

```bash
ffmpeg -i input.mp4 -vf fps=10 work/frame-%03d.png
```

전체 프레임을 작은 접촉 시트로 만들어 동작 경계를 찾는다. `tile`의 열과 행은 전체 프레임 수에 맞춘다.

```bash
ffmpeg -framerate 10 -i work/frame-%03d.png \
  -vf "scale=160:160,tile=10x12" -frames:v 1 work/contact-sheet.png
```

3fps처럼 너무 낮은 속도로 바로 최종 시트를 만들지 않는다. 걷기와 점프의 준비·정점·착지 프레임이 빠져 동작이 튀게 된다.

## 3. 동작 구간 결정

대기, 걷기, 점프, 그루밍, 잠들기처럼 재생 단위별로 프레임 범위를 정한다. 그림체가 달라진 구간은 같은 애니메이션에 섞지 않는다.

이번 흰 고양이 영상의 10fps 기준은 다음과 같다. 다른 영상에는 프레임 번호를 그대로 재사용하지 않는다.

| 동작 | 원본 프레임 | 최종 프레임 | 재생 방식 |
| --- | --- | ---: | --- |
| 대기 | 1–6을 왕복 | 10 | `loop` |
| 걷기 | 8–27 | 20 | `loop` |
| 점프 | 28–40 | 13 | `once` |
| 그루밍 | 53–90 | 38 | `once` |
| 잠들기 | 91–120 | 30 | `hold` |

대기는 첫 장면의 한 가지 그림체만 사용한다. 왕복 루프에서는 양 끝 프레임을 중복하지 않아 멈칫하는 시간을 만들지 않는다.

## 4. 잘린 부분 복원

원본에 없는 귀 끝처럼 실제로 잘린 부분만 이미지 편집으로 복원한다. 전체 프레임을 새로 생성한 결과로 교체하면 얼굴과 몸 비율이 흔들릴 수 있다.

권장 편집 지시문:

```text
Use case: precise-object-edit
Asset type: 2D game animation sprite repair sheet
Primary request: 잘린 귀 끝만 자연스럽게 복원한다.
Constraints: 얼굴, 몸, 포즈, 색, 선 굵기, 프레임 배열과 기존 픽셀은 유지한다.
Avoid: 비율 변경, 새 물체, 프레임 재배치, 글자, 워터마크.
```

편집 결과에서는 복원 영역만 마스크로 가져와 원본에 합성한다. 생성된 프레임 전체를 그대로 사용하지 않는다.

## 5. 배경 제거와 외곽선

배경 제거는 최종 크기로 줄이기 전에 원본 해상도에서 수행한다.

1. 프레임 모서리에서 배경색을 추정한다.
2. 배경과의 색 거리, 채도와 명도를 함께 사용해 전경 후보를 만든다.
3. 캐릭터에 해당하는 가장 큰 연결 요소를 남긴다.
4. 외곽선 안쪽의 닫힌 구멍을 채워 흰 털이 투명하게 뚫리지 않게 한다.
5. 외곽 바깥 RGB를 제거해 흰색 또는 회색 후광을 막는다.
6. Lanczos 같은 고품질 필터로 `256 × 256` 셀에 축소한다.
7. 외곽선 안쪽 약 1픽셀에만 반투명 알파를 적용한다. 바깥으로 색을 확장하지 않는다.

외곽선이 자글자글할 때 검은 선을 흐리게 만들거나 흰색 테두리를 추가하지 않는다. 불투명 알파만 사용한 것이 원인이므로 RGB는 유지하고 알파 커버리지만 부드럽게 만든다.

이 저장소의 영상 작업 공간에서는 위 절차를 `cat-sprite-project/clean_sprite_frames.py`로 반복 실행할 수 있다. 원본과 출력 경로를 다르게 지정해야 하며, 검은 고양이처럼 밝은 바닥 그림자를 제거해야 할 때만 `dark-cat` 프로필을 사용한다.

```bash
python3 -m pip install --target cat-sprite-project/.python-deps \
  -r cat-sprite-project/requirements.txt

PYTHONPATH=cat-sprite-project/.python-deps python3 \
  cat-sprite-project/clean_sprite_frames.py \
  cat-sprite-project/cat_01/jump/frames-rgba \
  cat-sprite-project/cat_01/jump/frames-clean-v1 \
  --profile dark-cat \
  --review cat-sprite-project/cat_01/jump/review-clean-v1.png
```

`frames-clean-v1`은 원본 해상도 보정본이고 `review-clean-v1.png`는 원본과 보정본을 세 가지 배경에서 나란히 비교한 접촉 시트다. 흰 고양이에는 검은 털을 기준으로 한 `dark-cat` 프로필을 쓰지 말고 먼저 기본 `general` 프로필로 일부 프레임만 시험한다.

검은 외곽선에 약한 녹색이 남으면 강한 녹색만 찾는 검사로는 놓칠 수 있다. 외곽선 안쪽 4픽셀의 녹색 우세가 2단계보다 큰지 별도로 검사하고, 남아 있으면 `--edge-despill-only`로 `frames-clean-v1`에서 `frames-clean-v2`를 만든다. 이 모드는 알파와 외곽선에서 떨어진 내부 RGB를 변경하지 않는다.

## 6. 시트 패킹과 등록

프레임은 `256 × 256` 셀에 행 우선으로 패킹한다. 마지막 행의 남는 칸은 완전히 투명하게 둔다.

파일과 ID는 동작별로 분리한다.

```text
public/assets/cats/<variant>/
  <variant>-idle-01.png
  <variant>-walk-01.png
  <variant>-jump-01.png
  <variant>-groom-01.png
  <variant>-sleep-01.png
```

카탈로그의 `spriteSheet`에는 `frameWidth`, `frameHeight`, `columns`, `frameCount`, `framesPerSecond`, `playback`을 기록한다.

`cat-sprite-project`의 고양이는 정리된 `frames-clean-v2`에서 다음 명령으로 시트와 검토 이미지를 다시 만들 수 있다. `--cat-root`를 생략하면 1번 고양이를 사용한다.

```bash
PYTHONPATH=cat-sprite-project/.python-deps python3 \
  cat-sprite-project/pack_sprite_sheets.py

PYTHONPATH=cat-sprite-project/.python-deps python3 \
  cat-sprite-project/pack_sprite_sheets.py \
  --cat-root cat-sprite-project/cat_02
```

동작별 선택 범위는 `pack_sprite_sheets.py`의 고양이별 선택 표에 있고 결과 메타데이터는 `<cat-root>/sprite-sheets-v2/manifest.json`에 기록된다. 입력 프레임 파일이 `frame_0000.png` 또는 `frame_0001.png` 중 어느 번호로 시작해도 정렬된 위치를 기준으로 같은 범위를 선택한다. 이 영상은 프레임이 부족해 보이지 않도록 원본에 가까운 25fps를 유지한다. 다른 영상을 처리할 때 25fps와 현재 프레임 범위를 그대로 복사하지 않는다.

앞뒤가 자연스럽게 이어지지 않는 대기 동작은 선택 구간을 왕복 순서로 패킹할 수 있다. 이 경우 첫 프레임과 마지막 프레임이 중복되지 않게 만들고 `manifest.json`의 `pingPong` 값으로 기록한다. 수면처럼 `hold`로 재생하는 동작은 깨어나는 프레임을 포함하지 않고 실제로 유지할 잠든 자세에서 끝내야 한다.

### 4종 고양이 전체 아카이브

`cat-sprite-project-full-20260901.zip`은 아래 4종을 같은 규격으로 내보낸 작업 원본이다.

| 원본 폴더 | 게임 변형 | 카탈로그 ID 접두사 |
| --- | --- | --- |
| `cat_01` | `ink-black` | `cat.ink` |
| `cat_02` | `fluffy-white` | `cat.fluffy` |
| `cat_03` | `siamese-seal` | `cat.siamese` |
| `cat_04` | `orange-tabby` | `cat.tabby` |

모든 변형은 기존 12개 동작과 신규 `scruff_lift`를 합쳐 13개 동작으로 등록한다. 아카이브를 다시 패킹할 때는 고양이별 동작 시작점과 대기 자세로 돌아오는 지점이 서로 다르므로 하나의 공통 프레임 범위를 강제로 적용하지 않는다. `cat-sprite-project/pack_full_sprite_sheets.py`의 고양이별 선택 표와 출력 `manifest.json`에 실제 범위, 프레임 수, 재생 방식을 기록한다.

2번 고양이의 개선 여부는 파일 이름이나 미리보기만으로 판단하지 않는다. 이번 아카이브의 기존 12개 `frames-rgba`는 저장소 작업 원본과 동작별 124프레임 전체가 바이트 단위로 같았다. 따라서 이미 검수된 기존 게임 시트를 교체하지 않고 신규 `scruff_lift` 시트만 추가했다. 이후 개선본을 받으면 기존 원본과 프레임 해시, 얼굴 비율, 외곽 알파를 함께 비교한 뒤 교체한다.

4번 고양이의 피격은 별 모양 효과가 섞인 `hit` 대신 고양이 본체만 일관되게 남는 `hit_v2`를 사용한다. 이처럼 같은 동작의 대안 폴더가 있으면 접촉 시트로 효과 혼입, 그림체 변화, 회복 자세를 비교하고 선택한 원본 이름을 manifest의 `sourceAction`에 남긴다.

## 7. 검수

투명 시트만 보지 말고 밝은 배경과 실제 게임에 가까운 어두운 배경에 각각 합성해 확인한다.

- 모든 프레임에서 몸통과 꼬리 내부가 투명하게 뚫리지 않는가
- 점프 정점에서도 귀와 발이 셀 경계에 닿지 않는가
- 외곽에 흰색·회색 후광이나 검은 번짐이 없는가
- 대기 루프의 첫 프레임과 마지막 프레임이 자연스럽게 이어지는가
- 동작별 그림체와 얼굴 비율이 유지되는가
- 바닥 접점이 프레임마다 위아래로 흔들리지 않는가

마지막으로 다음 검사를 실행한다.

```bash
npm run assets:check
npm run quality:check
npm run check
npm run build
```

## 제외 사항

GIF는 반투명 알파를 지원하지 않아 PNG 스프라이트와 같은 외곽선 품질을 보장할 수 없다. 공유용 GIF가 필요하면 이 제작 절차가 끝난 뒤 별도 파생 결과물로 만들며, 게임 런타임 원본이나 품질 판정 기준으로 사용하지 않는다.
