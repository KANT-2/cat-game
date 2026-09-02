import { focusDesktopWidget, updateDesktopWidgetInteractionRegion } from "./app/desktopWidgetHost";
import { resolveAppDisplayMode } from "./app/displayMode";
import { GameApp } from "./app/GameApp";
import { message } from "./content/messages";
import { registerPwa } from "./pwa/registerPwa";
import "./style.css";

const mount = document.querySelector<HTMLDivElement>("#app");
if (!mount) {
  throw new Error("#app mount element was not found");
}

const displayMode = resolveAppDisplayMode(window.location.search);
document.documentElement.dataset.displayMode = displayMode;
const requestCatFocus = () => {
  if (displayMode !== "desktop-widget") {
    return;
  }
  void focusDesktopWidget().catch((error: unknown) => {
    console.error("Failed to focus the desktop widget", error);
  });
};
const updateCatInteractionRegion = (region: { x: number; y: number; width: number; height: number }) => {
  if (displayMode === "desktop-widget") {
    updateDesktopWidgetInteractionRegion(region);
  }
};
const game = await GameApp.create(mount, displayMode, requestCatFocus, updateCatInteractionRegion);

if (displayMode === "game") {
  registerPwa({
    onInstallAvailable: (install) => game.setInstallHandler(install),
    onMessage: (messageId) => game.notify(message(messageId)),
  });
}
