import { GameApp } from "./app/GameApp";
import { message } from "./content/messages";
import { registerPwa } from "./pwa/registerPwa";
import "./style.css";

const mount = document.querySelector<HTMLDivElement>("#app");
if (!mount) {
  throw new Error("#app mount element was not found");
}

const game = await GameApp.create(mount);

registerPwa({
  onInstallAvailable: (install) => game.setInstallHandler(install),
  onMessage: (messageId) => game.notify(message(messageId)),
});
