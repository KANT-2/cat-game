import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const screenshotPath = (name) => join(tmpdir(), name);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1120, height: 630 } });
const errors = [];
const requestedAssets = [];

await page.addInitScript(() => {
  Math.random = () => 0.1;
  window.__widgetStorageAccesses = [];
  for (const method of ["getItem", "setItem", "removeItem"]) {
    const original = Storage.prototype[method];
    Storage.prototype[method] = function (...args) {
      window.__widgetStorageAccesses.push(`${method}:${String(args[0])}`);
      return original.apply(this, args);
    };
  }
});

page.on("console", (message) => {
  if (message.type() === "error") {
    errors.push(`console: ${message.text()}`);
  }
});
page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
page.on("request", (request) => {
  const requestedUrl = new URL(request.url());
  if (requestedUrl.pathname.startsWith("/assets/")) {
    requestedAssets.push(requestedUrl.pathname);
  }
});

const baseUrl = process.env.GAME_URL ?? "http://127.0.0.1:5173/";
const url = new URL("desktop-widget.html", baseUrl);
await page.goto(url.toString(), { waitUntil: "networkidle" });
await page.locator("canvas").waitFor({ state: "visible" });
await page.waitForTimeout(800);

const presentation = await page.evaluate(async () => {
  const mount = document.querySelector("#app");
  const serviceWorkerRegistrations =
    "serviceWorker" in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0;
  return {
    displayMode: document.documentElement.dataset.displayMode,
    rootBackground: getComputedStyle(document.documentElement).backgroundColor,
    bodyBackground: getComputedStyle(document.body).backgroundColor,
    mountBackground: mount ? getComputedStyle(mount).backgroundColor : "missing",
    serviceWorkerRegistrations,
    storageAccesses: window.__widgetStorageAccesses,
  };
});

if (presentation.displayMode !== "desktop-widget") {
  throw new Error(`unexpected display mode: ${presentation.displayMode}`);
}
for (const [layer, background] of Object.entries({
  root: presentation.rootBackground,
  body: presentation.bodyBackground,
  mount: presentation.mountBackground,
})) {
  if (background !== "rgba(0, 0, 0, 0)") {
    throw new Error(`${layer} background is not transparent: ${background}`);
  }
}
if (presentation.serviceWorkerRegistrations !== 0) {
  throw new Error("desktop widget must not register the PWA service worker");
}
if (presentation.storageAccesses.length > 0) {
  throw new Error(`desktop widget must not access game storage: ${presentation.storageAccesses.join(", ")}`);
}
const forbiddenAssetPrefixes = [
  "/assets/cats/ink-black/",
  "/assets/cats/siamese-seal/",
  "/assets/cats/orange-tabby/",
  "/assets/environment/",
  "/assets/ui/home-menu/",
];
const forbiddenRequests = requestedAssets.filter((asset) =>
  forbiddenAssetPrefixes.some((prefix) => asset.startsWith(prefix)),
);
if (forbiddenRequests.length > 0) {
  throw new Error(`desktop widget loaded game-only assets: ${forbiddenRequests.join(", ")}`);
}
if (!requestedAssets.some((asset) => asset.startsWith("/assets/cats/fluffy-white/"))) {
  throw new Error("desktop widget did not load the dedicated fluffy cat assets");
}

await page.screenshot({ path: screenshotPath("nyang-desktop-widget.png"), omitBackground: true });
await page.mouse.move(510, 420);
await page.mouse.down();
await page.mouse.move(650, 380, { steps: 8 });
await page.waitForTimeout(650);
await page.screenshot({
  path: screenshotPath("nyang-desktop-widget-lift.png"),
  omitBackground: true,
});
await page.mouse.move(805, 345, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(900);
await page.screenshot({
  path: screenshotPath("nyang-desktop-widget-drop.png"),
  omitBackground: true,
});
await browser.close();

if (errors.length > 0) {
  throw new Error(errors.join("\n"));
}

console.log("Desktop widget smoke test passed");
console.log(
  `screenshots: ${screenshotPath("nyang-desktop-widget.png")}, ${screenshotPath("nyang-desktop-widget-lift.png")}, ${screenshotPath("nyang-desktop-widget-drop.png")}`,
);
