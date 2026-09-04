import { Application, Assets } from "pixi.js";
import { assetPath, loadAssetCatalog } from "../assets/AssetCatalog";
import { findAssetEntry, loadTexture } from "../assets/SpriteSheetLoader";
import type { GameClient } from "../core/GameClient";
import { type CatVariant, catVariants } from "../domain/cats";
import type { CatAnimationLibrary, CatAnimationSet } from "../game/entities/CatAnimations";
import type { ForestArt } from "../game/forest/ForestArt";
import { HomeScene } from "../game/scenes/HomeScene";
import { LoadingScene } from "../game/scenes/LoadingScene";
import { createGameClient } from "./createGameClient";
import { loadCatAnimations } from "./loadCatAnimations";
import { loadForestArt } from "./loadForestArt";

const MINIMUM_LOADING_TIME_MS = 3400;

export class GameApp {
  private readonly renderer: Application;
  private readonly home: HomeScene;

  private constructor(renderer: Application, home: HomeScene) {
    this.renderer = renderer;
    this.home = home;
  }

  static async create(mount: HTMLElement): Promise<GameApp> {
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
    renderer.stage.addChild(loading);
    const layoutLoading = () => loading.layout(renderer.screen.width, renderer.screen.height);
    const updateLoading = (ticker: { deltaMS: number }) => loading.update(ticker.deltaMS / 1000);
    window.addEventListener("resize", layoutLoading);
    renderer.ticker.add(updateLoading);
    layoutLoading();

    let catAnimations: CatAnimationLibrary;
    let forestArt: ForestArt;
    let gameClient: GameClient;
    let assetCatalog: Awaited<ReturnType<typeof loadAssetCatalog>>;
    try {
      gameClient = await createGameClient();
      const activeCat = gameClient.getSnapshot().activeCat;
      assetCatalog = await loadAssetCatalog();
      loading.setProgress(0.06);
      const [loadingBackground, loadingLogo] = await Promise.all([
        loadTexture(findAssetEntry(assetCatalog, "background.loading.cat-study-night.01")),
        loadTexture(findAssetEntry(assetCatalog, "ui.logo.game.01")),
      ]);
      loading.setBackground(loadingBackground);
      loading.setLogo(loadingLogo);
      loading.setProgress(0.14);
      const loadedCats = new Map<CatVariant, CatAnimationSet>();
      const loadOrder = [activeCat, ...catVariants.filter((variant) => variant !== activeCat)];
      for (const [index, variant] of loadOrder.entries()) {
        const animations = await loadCatAnimations(
          assetCatalog,
          (progress, action, clip) => {
            loading.setProgress(0.14 + ((index + progress) / loadOrder.length) * 0.82);
            if (index === 0 && action === "idle") {
              loading.setCatAnimation(clip);
            }
          },
          variant,
        );
        loadedCats.set(variant, animations);
      }
      const requireAnimations = (variant: CatVariant): CatAnimationSet => {
        const animations = loadedCats.get(variant);
        if (!animations) {
          throw new Error(`Cat animations were not loaded: ${variant}`);
        }
        return animations;
      };
      catAnimations = {
        fluffy: requireAnimations("fluffy"),
        ink: requireAnimations("ink"),
        siamese: requireAnimations("siamese"),
        tabby: requireAnimations("tabby"),
      };
      forestArt = await loadForestArt(assetCatalog);
      loading.setProgress(0.98);
    } catch (error) {
      loading.showError();
      throw error;
    }

    const iconSources = {
      profile: assetPath(assetCatalog, "ui.home.profile.02"),
      study: assetPath(assetCatalog, "ui.home.study.02"),
      dailyQuest: assetPath(assetCatalog, "ui.home.daily-quest.02"),
      gacha: assetPath(assetCatalog, "ui.home.gacha.02"),
      home: assetPath(assetCatalog, "ui.home.house.02"),
      settings: assetPath(assetCatalog, "ui.home.settings.02"),
      back: assetPath(assetCatalog, "ui.common.back-button.01"),
      coin: assetPath(assetCatalog, "ui.common.currency-coin.01"),
      shopShowcase: assetPath(assetCatalog, "ui.scene.shop-showcase.01"),
      gachaBackdrop: assetPath(assetCatalog, "ui.scene.gacha-room-backdrop.01"),
      gachaMachine: assetPath(assetCatalog, "ui.scene.gacha-machine-cutout.01"),
    };
    await Assets.load(Object.values(iconSources));
    const home = new HomeScene(gameClient, iconSources, catAnimations, forestArt);
    renderer.stage.addChildAt(home, 0);
    const game = new GameApp(renderer, home);
    game.layout();

    const loadingElapsed = performance.now() - loadingStartedAt;
    await delay(Math.max(0, MINIMUM_LOADING_TIME_MS - loadingElapsed));
    loading.setProgress(1);
    await delay(220);
    await loading.fadeOut();
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
