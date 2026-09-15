import "pixi.js/unsafe-eval";
import { GameApp } from "./app/GameApp";
import { type MessageId, message } from "./content/messages";
import { registerPwa } from "./pwa/registerPwa";
import "./style.css";

const mount = document.querySelector<HTMLDivElement>("#app");
if (!mount) {
  throw new Error("#app mount element was not found");
}

document.documentElement.dataset.displayMode = "game";
document.documentElement.dataset.gameReady = "loading";

let game: GameApp | null = null;
let installHandler: (() => void) | null = null;
const pendingMessages: MessageId[] = [];

registerPwa({
  onInstallAvailable: (install) => {
    installHandler = install;
    game?.setInstallHandler(install);
  },
  onMessage: (messageId) => {
    if (!game) {
      pendingMessages.push(messageId);
      return;
    }
    game.notify(message(messageId));
  },
});

try {
  game = await GameApp.create(mount);
  document.documentElement.dataset.gameReady = "ready";
  game.setInstallHandler(installHandler);
  for (const messageId of pendingMessages) {
    game.notify(message(messageId));
  }
  pendingMessages.length = 0;
} catch (error) {
  document.documentElement.dataset.gameReady = "error";
  console.warn("Game startup is waiting for a recoverable reload", error);
}
