import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];

page.on("console", (message) => {
  if (message.type() === "error") {
    errors.push(`console: ${message.text()}`);
  }
});
page.on("pageerror", (error) => errors.push(`page: ${error.message}`));

await page.goto(process.env.GAME_URL ?? "http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.locator("canvas").waitFor({ state: "visible" });
await page.waitForTimeout(1200);

const canvas = page.locator("canvas");
const box = await canvas.boundingBox();
if (box?.width !== 1600 || box.height !== 900) {
  throw new Error(`unexpected canvas bounds: ${JSON.stringify(box)}`);
}

await page.screenshot({ path: "/tmp/cat-game-home.png" });

await page.mouse.click(1483, 145);
await page.waitForTimeout(250);
await page.screenshot({ path: "/tmp/cat-game-study.png" });
await page.mouse.click(800, 574);
await page.waitForTimeout(200);

await page.mouse.click(800, 686);
await page.mouse.click(105, 846);
await page.waitForTimeout(200);
await page.mouse.click(836, 584);
await page.waitForTimeout(200);
await page.screenshot({ path: "/tmp/cat-game-edit.png" });

const savedState = await page.evaluate(() => localStorage.getItem("cozy-code-cat-room-v1"));
if (!savedState) {
  throw new Error("game state was not persisted");
}

await browser.close();

if (errors.length > 0) {
  throw new Error(errors.join("\n"));
}

console.log("Canvas smoke test passed");
console.log("screenshots: /tmp/cat-game-home.png, /tmp/cat-game-study.png, /tmp/cat-game-edit.png");
