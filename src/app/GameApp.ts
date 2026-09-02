import { Application } from "pixi.js";
import { loadAssetCatalog } from "../assets/AssetCatalog";
import { findAssetEntry, loadTexture } from "../assets/SpriteSheetLoader";
import { LocalGameClient } from "../core/LocalGameClient";
import type { CatAnimationSet } from "../game/entities/CatAnimations";
import { HomeScene } from "../game/scenes/HomeScene";
import { LoadingScene } from "../game/scenes/LoadingScene";
import { GameStateStore } from "../services/gameStateStore";
import type { AppDisplayMode } from "./displayMode";
import { type CatVariant, loadCatAnimations } from "./loadCatAnimations";

const MINIMUM_LOADING_TIME_MS = 3400;
const ACTIVE_CAT_VARIANT: CatVariant = "fluffy";

export class GameApp {
  private readonly renderer: Application;
  private readonly home: HomeScene;

  private constructor(renderer: Application, home: HomeScene) {
    this.renderer = renderer;
    this.home = home;
  }

  static async create(
    mount: HTMLElement,
    displayMode: AppDisplayMode = "game",
    onCatFocusRequest: () => void = () => {},
    onCatInteractionRegionChange: (region: { x: number; y: number; width: number; height: number }) => void = () => {},
  ): Promise<GameApp> {
    const renderer = new Application();
    await renderer.init({
      resizeTo: window,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      backgroundAlpha: 0,
    });
    mount.appendChild(renderer.canvas);

    const loadingStartedAt = performance.now();
    const loading = new LoadingScene();
    const showLoadingScene = displayMode === "game";
    loading.visible = showLoadingScene;
    renderer.stage.addChild(loading);
    const layoutLoading = () => loading.layout(renderer.screen.width, renderer.screen.height);
    const updateLoading = (ticker: { deltaMS: number }) => loading.update(ticker.deltaMS / 1000);
    window.addEventListener("resize", layoutLoading);
    renderer.ticker.add(updateLoading);
    layoutLoading();

    let catAnimations: CatAnimationSet;
    try {
      const assetCatalog = await loadAssetCatalog();
      loading.setProgress(0.06);
      if (showLoadingScene) {
        const [loadingBackground, loadingLogo] = await Promise.all([
          loadTexture(findAssetEntry(assetCatalog, "background.loading.cat-study-night.01")),
          loadTexture(findAssetEntry(assetCatalog, "ui.logo.game.01")),
        ]);
        loading.setBackground(loadingBackground);
        loading.setLogo(loadingLogo);
      }
      loading.setProgress(0.14);
      catAnimations = await loadCatAnimations(
        assetCatalog,
        (progress, action, clip) => {
          loading.setProgress(0.14 + progress * 0.82);
          if (showLoadingScene && action === "idle") {
            loading.setCatAnimation(clip);
          }
        },
        ACTIVE_CAT_VARIANT,
      );
    } catch (error) {
      loading.showError();
      throw error;
    }

    const gameClient = new LocalGameClient(new GameStateStore());
    const home = new HomeScene(gameClient, catAnimations, {
      desktopWidget: displayMode === "desktop-widget",
      onCatFocusRequest,
      onCatInteractionRegionChange,
    });
    renderer.stage.addChildAt(home, 0);
    const game = new GameApp(renderer, home);
    game.layout();

    if (showLoadingScene) {
      const loadingElapsed = performance.now() - loadingStartedAt;
      await delay(Math.max(0, MINIMUM_LOADING_TIME_MS - loadingElapsed));
      loading.setProgress(1);
      await delay(220);
      await loading.fadeOut();
    }
    renderer.ticker.remove(updateLoading);
    window.removeEventListener("resize", layoutLoading);
    renderer.stage.removeChild(loading);
    loading.destroy({ children: true });

    window.addEventListener("resize", () => game.layout());
    renderer.ticker.add((ticker) => home.update(ticker.deltaMS / 1000));
    return game;
  }

  notify(message: string): void {
    this.home.notify(message);
  }

  setInstallHandler(handler: (() => void) | null): void {
    this.home.setInstallHandler(handler);
  }

  private layout(): void {
    this.home.layout(this.renderer.screen.width, this.renderer.screen.height);
  }
}

async function delay(milliseconds: number): Promise<void> {
  if (milliseconds <= 0) {
    return;
  }
  await new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}
