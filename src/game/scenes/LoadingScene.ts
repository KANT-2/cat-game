import { AnimatedSprite, Container, Graphics, Sprite, Text, type Texture } from "pixi.js";
import type { LoadedSpriteSheet } from "../../assets/SpriteSheetLoader";
import { type MessageId, message } from "../../content/messages";
import { textStyle } from "../config";
import { createCatGroundShadow, resizeCatGroundShadow } from "../entities/CatGroundShadow";

const LOADING_TIP_IDS = [
  "loading.tip.paws",
  "loading.tip.tail",
  "loading.tip.ears",
  "loading.tip.whiskers",
  "loading.tip.wash",
  "loading.tip.stretch",
  "loading.tip.sleep",
  "loading.tip.walk",
  "loading.tip.scratch",
  "loading.tip.dust",
  "loading.tip.calm",
  "loading.tip.blink",
] as const satisfies readonly MessageId[];
const TIP_INTERVAL_SECONDS = 1.6;
const TIP_FADE_SECONDS = 0.22;

type Firefly = {
  view: Graphics;
  xRatio: number;
  yRatio: number;
  phase: number;
};

export class LoadingScene extends Container {
  private readonly fallback = new Graphics();
  private readonly shade = new Graphics();
  private readonly tip: Text;
  private readonly logoSlot = new Container();
  private readonly panel = new Container();
  private readonly panelBackground = new Graphics();
  private readonly progressTrack = new Graphics();
  private readonly progressFill = new Graphics();
  private readonly progressText = new Text({
    text: message("loading.progress", { progress: 0 }),
    style: textStyle(17, 0x4b3928, "800"),
  });
  private readonly catSlot = new Container();
  private readonly fireflies: Firefly[];
  private background: Sprite | null = null;
  private logo: Sprite | null = null;
  private cat: AnimatedSprite | null = null;
  private catShadow: AnimatedSprite | null = null;
  private targetProgress = 0;
  private displayedProgress = 0;
  private elapsed = 0;
  private tipElapsed = 0;
  private currentTipId: MessageId;
  private tipRotationEnabled = true;
  private screenWidth = 1600;
  private screenHeight = 900;
  private panelWidth = 620;

  constructor() {
    super({ label: "loading-scene" });
    this.currentTipId = chooseLoadingTip();
    this.tip = new Text({ text: message(this.currentTipId), style: textStyle(16, 0x4b3928, "700") });
    this.tip.anchor.set(0.5);
    this.progressText.anchor.set(0.5);
    this.panel.addChild(this.panelBackground, this.progressTrack, this.progressFill, this.progressText, this.tip);
    this.fireflies = Array.from({ length: 10 }, (_, index) => ({
      view: new Graphics().circle(0, 0, index % 3 === 0 ? 4 : 2.5).fill(0xffe88a),
      xRatio: 0.08 + ((index * 0.173) % 0.84),
      yRatio: 0.16 + ((index * 0.237) % 0.55),
      phase: index * 0.83,
    }));
    this.addChild(
      this.fallback,
      this.shade,
      ...this.fireflies.map((firefly) => firefly.view),
      this.logoSlot,
      this.catSlot,
      this.panel,
    );
    this.layout(this.screenWidth, this.screenHeight);
  }

  /**
   * 생성된 로딩 배경 텍스처를 로딩 장면에 표시한다.
   *
   * @param texture - 카탈로그 ID로 불러온 가로형 로딩 배경.
   * @remarks 화면 비율이 달라도 빈 공간이 생기지 않도록 중앙 기준 cover 방식으로 배치한다.
   */
  setBackground(texture: Texture): void {
    this.background?.destroy();
    this.background = new Sprite(texture);
    this.background.anchor.set(0.5);
    this.addChildAt(this.background, 1);
    this.layoutBackground();
  }

  /**
   * 생성된 게임 로고 텍스처를 로딩 장면의 상단 중앙에 표시한다.
   *
   * @param texture - 투명 배경을 가진 `{ 냥 }` 로고 텍스처.
   */
  setLogo(texture: Texture): void {
    this.logo?.destroy();
    this.logo = new Sprite(texture);
    this.logo.anchor.set(0.5);
    this.logoSlot.addChild(this.logo);
    this.layoutLogo();
  }

  /**
   * 로딩 중 표시할 실제 플레이어 고양이 대기 애니메이션을 설정한다.
   *
   * @param clip - 런타임 카탈로그에서 불러온 idle 스프라이트 시트.
   */
  setCatAnimation(clip: LoadedSpriteSheet): void {
    this.cat?.destroy();
    this.catShadow?.destroy();
    const displayScale = this.screenWidth < 900 ? 0.43 : 0.52;
    this.catShadow = createCatGroundShadow(clip, displayScale);
    this.cat = new AnimatedSprite({
      textures: clip.textures,
      animationSpeed: clip.framesPerSecond / 60,
      autoPlay: true,
      loop: true,
    });
    this.cat.anchor.set(clip.anchor.x, clip.anchor.y);
    this.cat.scale.set(displayScale);
    this.cat.onFrameChange = (frame) => this.catShadow?.gotoAndStop(frame);
    this.catSlot.addChild(this.catShadow, this.cat);
  }

  /**
   * 실제 리소스 로딩 진척도를 장면의 목표 진행률로 전달한다.
   *
   * @param progress - 0부터 1 사이의 완료 비율. 범위를 벗어난 값은 안전하게 제한한다.
   * @remarks 표시 값은 `update`에서 부드럽게 따라가므로 네트워크 완료 순서가 달라도 급격히 번쩍이지 않는다.
   */
  setProgress(progress: number): void {
    this.targetProgress = Math.max(this.targetProgress, Math.min(1, Math.max(0, progress)));
  }

  /**
   * 리소스 로딩 실패 문구를 표시하고 진행 바 애니메이션을 멈춘다.
   *
   * @remarks 내부 오류 문자열은 노출하지 않고 `ko.json`에 등록된 복구 안내만 표시한다.
   */
  showError(): void {
    this.targetProgress = this.displayedProgress;
    this.tipRotationEnabled = false;
    this.tip.text = message("loading.error");
    this.tip.style.fill = 0x8c3b2d;
    this.tip.alpha = 1;
  }

  /**
   * 현재 화면 크기에 맞춰 배경과 Canvas UI를 재배치한다.
   *
   * @param width - 렌더러의 화면 픽셀 너비.
   * @param height - 렌더러의 화면 픽셀 높이.
   */
  layout(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
    this.panelWidth = Math.min(620, width - 48);
    this.fallback.clear().rect(0, 0, width, height).fill(0x3b251c);
    this.shade.clear().rect(0, 0, width, height).fill({ color: 0x402518, alpha: 0.18 });
    this.layoutBackground();

    this.layoutLogo();
    this.catSlot.position.set(width / 2, height - (width < 900 ? 144 : 166));
    if (this.cat) {
      const displayScale = width < 900 ? 0.43 : 0.52;
      this.cat.scale.set(displayScale);
      if (this.catShadow) {
        resizeCatGroundShadow(this.catShadow, displayScale);
      }
    }
    this.panel.position.set(width / 2 - this.panelWidth / 2, height - (width < 900 ? 118 : 136));
    this.drawPanel();

    for (const firefly of this.fireflies) {
      firefly.view.position.set(width * firefly.xRatio, height * firefly.yRatio);
    }
  }

  /**
   * 진행 바 보간과 장식 애니메이션을 한 프레임 갱신한다.
   *
   * @param deltaSeconds - 이전 프레임 이후 경과한 초 단위 시간.
   */
  update(deltaSeconds: number): void {
    this.elapsed += deltaSeconds;
    const difference = this.targetProgress - this.displayedProgress;
    this.displayedProgress += Math.min(difference, deltaSeconds * 0.5);
    if (difference < 0.002) {
      this.displayedProgress = this.targetProgress;
    }
    this.drawProgress();
    this.updateTip(deltaSeconds);
    this.catSlot.y = this.screenHeight - (this.screenWidth < 900 ? 144 : 166) + Math.sin(this.elapsed * 2.6) * 3;
    for (const firefly of this.fireflies) {
      const glow = 0.5 + Math.sin(this.elapsed * 2.2 + firefly.phase) * 0.35;
      firefly.view.alpha = glow;
      firefly.view.scale.set(0.85 + glow * 0.25);
    }
  }

  /**
   * 로딩 장면을 지정 시간 동안 부드럽게 투명하게 만든다.
   *
   * @param durationMilliseconds - 전환 애니메이션 길이. 0이면 즉시 숨긴다.
   * @returns 장면이 완전히 투명해졌을 때 완료되는 Promise.
   */
  async fadeOut(durationMilliseconds = 420): Promise<void> {
    if (durationMilliseconds <= 0) {
      this.alpha = 0;
      return;
    }
    const startedAt = performance.now();
    await new Promise<void>((resolve) => {
      const animate = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / durationMilliseconds);
        this.alpha = 1 - progress * progress;
        if (progress >= 1) {
          resolve();
          return;
        }
        requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    });
  }

  private layoutBackground(): void {
    if (!this.background) {
      return;
    }
    const scale = Math.max(
      this.screenWidth / this.background.texture.width,
      this.screenHeight / this.background.texture.height,
    );
    this.background.scale.set(scale);
    this.background.position.set(this.screenWidth / 2, this.screenHeight / 2);
  }

  private layoutLogo(): void {
    if (!this.logo) {
      return;
    }
    const maximumWidth = this.screenWidth < 900 ? Math.min(340, this.screenWidth * 0.52) : 430;
    const scale = maximumWidth / this.logo.texture.width;
    this.logo.scale.set(scale);
    this.logoSlot.position.set(this.screenWidth / 2, Math.max(112, this.screenHeight * 0.15));
  }

  private drawPanel(): void {
    this.panelBackground
      .clear()
      .roundRect(0, 0, this.panelWidth, 92, 28)
      .fill({ color: 0xfff4d5, alpha: 0.92 })
      .stroke({ color: 0x755038, width: 4, alpha: 0.9 });
    this.progressTrack
      .clear()
      .roundRect(30, 24, this.panelWidth - 108, 20, 10)
      .fill({ color: 0x76583e, alpha: 0.32 });
    this.progressText.position.set(this.panelWidth - 53, 34);
    this.tip.position.set(this.panelWidth / 2, 68);
    this.drawProgress();
  }

  private drawProgress(): void {
    const maximumWidth = this.panelWidth - 108;
    const fillWidth = maximumWidth * this.displayedProgress;
    this.progressFill.clear();
    if (fillWidth > 0) {
      this.progressFill.roundRect(30, 24, fillWidth, 20, 10).fill(0xb77950);
    }
    this.progressText.text = message("loading.progress", { progress: Math.round(this.displayedProgress * 100) });
  }

  private updateTip(deltaSeconds: number): void {
    if (!this.tipRotationEnabled) {
      return;
    }
    this.tipElapsed += deltaSeconds;
    if (this.tipElapsed >= TIP_INTERVAL_SECONDS) {
      this.tipElapsed %= TIP_INTERVAL_SECONDS;
      this.currentTipId = chooseLoadingTip(this.currentTipId);
      this.tip.text = message(this.currentTipId);
    }
    const fadeIn = Math.min(1, this.tipElapsed / TIP_FADE_SECONDS);
    const fadeOut = Math.min(1, (TIP_INTERVAL_SECONDS - this.tipElapsed) / TIP_FADE_SECONDS);
    this.tip.alpha = Math.min(fadeIn, fadeOut);
  }
}

function chooseLoadingTip(excluded?: MessageId): MessageId {
  const candidates = LOADING_TIP_IDS.filter((id) => id !== excluded);
  const index = Math.floor(Math.random() * candidates.length);
  return candidates[index] ?? LOADING_TIP_IDS[0];
}
