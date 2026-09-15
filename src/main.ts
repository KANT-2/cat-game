import "pixi.js/unsafe-eval";
import { GameApp } from "./app/GameApp";
import "./style.css";

const mount = document.querySelector<HTMLDivElement>("#app");
if (!mount) {
  throw new Error("#app mount element was not found");
}

document.documentElement.dataset.displayMode = "game";
document.documentElement.dataset.gameReady = "loading";

try {
  await GameApp.create(mount);
  document.documentElement.dataset.gameReady = "ready";
} catch (error) {
  document.documentElement.dataset.gameReady = "error";
  console.warn("Game startup is waiting for a recoverable reload", error);
}
