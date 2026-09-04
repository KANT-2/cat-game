import { Application } from "pixi.js";
import { loadAssetCatalog } from "../assets/AssetCatalog";
import { DesktopWidgetScene } from "../desktop/DesktopWidgetScene";
import { DEFAULT_CAT_VARIANT } from "../domain/cats";
import { loadCatAnimations } from "./loadCatAnimations";

type DesktopWidgetAppOptions = {
  onFocusRequest: () => void;
  onInputLockChange: (locked: boolean) => void;
  onInteractionRegionsChange: (regions: { x: number; y: number; width: number; height: number }[]) => void;
};

export class DesktopWidgetApp {
  private constructor(
    private readonly renderer: Application,
    private readonly scene: DesktopWidgetScene,
  ) {}

  /**
   * 게임 화면과 독립된 투명 데스크톱 고양이 렌더러를 만든다.
   *
   * @param mount - 데스크톱 전용 HTML의 Canvas 마운트 요소.
   * @param options - 네이티브 포커스, 입력 잠금과 클릭 영역을 연결하는 콜백.
   * @returns 흰 고양이 한 마리만 로드한 데스크톱 위젯 앱.
   * @remarks 게임 저장 상태, 홈 장면, HUD와 다른 고양이 리소스는 만들거나 읽지 않는다.
   */
  static async create(mount: HTMLElement, options: DesktopWidgetAppOptions): Promise<DesktopWidgetApp> {
    const renderer = new Application();
    await renderer.init({
      resizeTo: window,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      backgroundAlpha: 0,
    });
    mount.appendChild(renderer.canvas);

    const catalog = await loadAssetCatalog();
    const animations = await loadCatAnimations(catalog, undefined, DEFAULT_CAT_VARIANT);
    const scene = new DesktopWidgetScene({ animations, ...options });
    renderer.stage.addChild(scene);

    const app = new DesktopWidgetApp(renderer, scene);
    app.layout();
    window.addEventListener("resize", () => app.layout());
    window.addEventListener("blur", () => scene.cancelPointerInteraction());
    renderer.ticker.add((ticker) => scene.update(ticker.deltaMS / 1000));
    return app;
  }

  /**
   * Windows 호스트가 보낸 WebView 기준 커서 좌표를 추적 목표로 전달한다.
   *
   * @param screenX - WebView 왼쪽 위 기준 CSS 픽셀 X 좌표.
   * @param screenY - WebView 왼쪽 위 기준 CSS 픽셀 Y 좌표.
   */
  followCursor(screenX: number, screenY: number): void {
    this.scene.followCursor(screenX, screenY);
  }

  private layout(): void {
    this.scene.layout(this.renderer.screen.width, this.renderer.screen.height);
  }
}
