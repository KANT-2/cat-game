import { chromium } from "playwright";

const url = process.env.GAME_URL ?? "http://127.0.0.1:4173/";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await context.newPage();
const errors = [];

page.on("console", (message) => {
  if (message.type() === "error") {
    errors.push(`console: ${message.text()}`);
  }
});
page.on("pageerror", (error) => errors.push(`page: ${error.message}`));

await page.goto(url, { waitUntil: "networkidle" });
await page.locator("canvas").waitFor({ state: "visible" });

const manifest = await page.evaluate(async () => {
  const link = document.querySelector('link[rel="manifest"]');
  if (!(link instanceof HTMLLinkElement)) {
    throw new Error("manifest link missing");
  }
  const response = await fetch(link.href);
  return response.json();
});

if (manifest.name !== "{ 냥 }" || manifest.display !== "standalone") {
  throw new Error(`unexpected manifest: ${JSON.stringify(manifest)}`);
}

await page.evaluate(() => navigator.serviceWorker.ready);
await page.reload({ waitUntil: "networkidle" });
const controlled = await page.evaluate(() => navigator.serviceWorker.controller !== null);
if (!controlled) {
  throw new Error("service worker does not control the app");
}

const cdp = await context.newCDPSession(page);
const appManifest = await cdp.send("Page.getAppManifest");
if (appManifest.errors?.length) {
  throw new Error(`manifest errors: ${JSON.stringify(appManifest.errors)}`);
}

await context.setOffline(true);
await page.reload({ waitUntil: "domcontentloaded" });
await page.locator("canvas").waitFor({ state: "visible" });
await page.waitForTimeout(600);
await page.screenshot({ path: "/tmp/cat-game-pwa-offline.png" });

await browser.close();
if (errors.length) {
  throw new Error(errors.join("\n"));
}

console.log("PWA smoke test passed");
console.log("offline screenshot: /tmp/cat-game-pwa-offline.png");
