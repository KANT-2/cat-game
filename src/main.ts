import "pixi.js/unsafe-eval";
import { GameApp } from "./app/GameApp";
import { message } from "./content/messages";
import { registerPwa } from "./pwa/registerPwa";
import "./style.css";

const mount = document.querySelector<HTMLDivElement>("#app");
if (!mount) {
  throw new Error("#app mount element was not found");
}

document.documentElement.dataset.displayMode = "game";
document.documentElement.dataset.gameReady = "loading";
try {
  const game = await GameApp.create(mount);
  document.documentElement.dataset.gameReady = "ready";
  registerPwa({
    onInstallAvailable: (install) => game.setInstallHandler(install),
    onMessage: (messageId) => game.notify(message(messageId)),
  });
} catch (error) {
  document.documentElement.dataset.gameReady = "error";
  console.warn("Game startup is waiting for a recoverable reload", error);
}
