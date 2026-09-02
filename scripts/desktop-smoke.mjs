import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1120, height: 630 } });
const errors = [];

page.on("console", (message) => {
  if (message.type() === "error") {
    errors.push(`console: ${message.text()}`);
  }
});
page.on("pageerror", (error) => errors.push(`page: ${error.message}`));

const baseUrl = process.env.GAME_URL ?? "http://127.0.0.1:5173/";
const url = new URL(baseUrl);
url.searchParams.set("display", "desktop-widget");
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

await page.screenshot({ path: "/tmp/nyang-desktop-widget.png", omitBackground: true });
await browser.close();

if (errors.length > 0) {
  throw new Error(errors.join("\n"));
}

console.log("Desktop widget smoke test passed");
console.log("screenshot: /tmp/nyang-desktop-widget.png");
