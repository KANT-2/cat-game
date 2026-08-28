import { Application } from "pixi.js";
import { LocalGameClient } from "../core/LocalGameClient";
import { HomeScene } from "../game/scenes/HomeScene";
import { GameStateStore } from "../services/gameStateStore";

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

    const gameClient = new LocalGameClient(new GameStateStore());
    const home = new HomeScene(gameClient);
    renderer.stage.addChild(home);
    const game = new GameApp(renderer, home);
    game.layout();
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
