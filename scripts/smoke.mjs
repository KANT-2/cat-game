import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const screenshotPath = (name) => join(tmpdir(), name);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];

await page.addInitScript(() => {
  Math.random = () => 0.1;
});

page.on("console", (message) => {
  if (message.type() === "error") {
    errors.push(`console: ${message.text()}`);
  }
});
page.on("pageerror", (error) => errors.push(`page: ${error.message}`));

await page.goto(process.env.GAME_URL ?? "http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });
await page.locator("canvas").waitFor({ state: "visible" });
await page.waitForTimeout(800);
await page.screenshot({ path: screenshotPath("cat-game-loading.png") });
await page.waitForTimeout(1200);
await page.screenshot({ path: screenshotPath("cat-game-loading-tip.png") });
await page.waitForLoadState("networkidle");
await page.waitForTimeout(2600);

const canvas = page.locator("canvas");
const box = await canvas.boundingBox();
if (box?.width !== 1600 || box.height !== 900) {
  throw new Error(`unexpected canvas bounds: ${JSON.stringify(box)}`);
}

await page.screenshot({ path: screenshotPath("cat-game-home.png") });

await page.mouse.move(728, 590);
await page.mouse.down();
await page.mouse.move(930, 560, { steps: 8 });
await page.waitForTimeout(650);
await page.screenshot({ path: screenshotPath("cat-game-lift.png") });
await page.mouse.move(1150, 545, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(900);
await page.screenshot({ path: screenshotPath("cat-game-drop.png") });

await page.mouse.click(110, 75);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-settings-account.png") });
await page.mouse.click(800, 738);
await page.waitForTimeout(150);
await page.screenshot({ path: screenshotPath("cat-game-settings-confirm-reset.png") });
await page.mouse.click(695, 532);
await page.mouse.click(165, 406);
await page.waitForTimeout(150);
await page.screenshot({ path: screenshotPath("cat-game-settings-sound.png") });
await page.mouse.click(165, 478);
await page.waitForTimeout(150);
await page.screenshot({ path: screenshotPath("cat-game-settings-alerts.png") });
await page.mouse.click(165, 550);
await page.waitForTimeout(150);
await page.screenshot({ path: screenshotPath("cat-game-settings-learning.png") });
await page.mouse.click(165, 622);
await page.waitForTimeout(150);
await page.screenshot({ path: screenshotPath("cat-game-settings-display.png") });
await page.mouse.click(165, 694);
await page.waitForTimeout(150);
await page.screenshot({ path: screenshotPath("cat-game-settings-support.png") });
await page.mouse.click(63, 60);

await page.mouse.click(1530, 62);
await page.waitForTimeout(250);
await page.screenshot({ path: screenshotPath("cat-game-study-options.png") });
await page.mouse.click(1354, 62);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-study.png") });
await page.mouse.click(800, 686);

await page.mouse.click(1530, 62);
await page.waitForTimeout(200);
await page.mouse.click(1442, 62);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-daily-quest.png") });
await page.mouse.click(65, 54);

await page.mouse.click(1530, 150);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-shop-options.png") });
await page.mouse.click(1266, 150);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-shop.png") });
await page.mouse.click(595, 438);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-purchased.png") });
await page.mouse.click(905, 505);
await page.waitForTimeout(200);

await page.mouse.click(1530, 150);
await page.waitForTimeout(200);
await page.mouse.click(1354, 150);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-gacha.png") });
await page.mouse.click(640, 787);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-gacha-item-result.png") });
await page.mouse.click(800, 744);
await page.waitForTimeout(100);
await page.evaluate(() => {
  Math.random = () => 0.01;
});
await page.mouse.click(640, 787);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-gacha-cat-result.png") });
await page.mouse.click(780, 744);
await page.waitForTimeout(400);
await page.screenshot({ path: screenshotPath("cat-game-home-ink-cat.png") });

await page.mouse.click(1530, 150);
await page.waitForTimeout(200);
await page.mouse.click(1442, 150);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-owned-siamese-stored.png") });
await page.mouse.click(862, 346);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-owned-siamese-on-home.png") });
await page.mouse.click(472, 346);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-owned-stored-cat.png") });
await page.mouse.click(63, 60);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-home-one-cat.png") });

await page.mouse.click(1530, 150);
await page.waitForTimeout(200);
await page.mouse.click(1442, 150);
await page.waitForTimeout(200);
await page.mouse.click(472, 346);
await page.waitForTimeout(200);
await page.mouse.click(63, 60);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-home-three-cats.png") });

await page.mouse.click(1530, 238);
await page.waitForTimeout(200);
await page.mouse.click(1354, 238);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-add-friend.png") });
await page.mouse.click(165, 442);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-visit-garden-from-sidebar.png") });
await page.mouse.click(165, 354);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-add-friend-from-sidebar.png") });
await page.mouse.click(63, 60);

await page.mouse.click(1530, 238);
await page.waitForTimeout(200);
await page.mouse.click(1442, 238);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-visit-garden.png") });
await page.mouse.click(63, 60);

const savedState = await page.evaluate(() => localStorage.getItem("cozy-code-cat-room-v1"));
if (!savedState) {
  throw new Error("game state was not persisted");
}
const parsedState = JSON.parse(savedState);
if (parsedState.gems !== 99_940) {
  throw new Error(`unexpected gems after two draws: ${parsedState.gems}`);
}
if (parsedState.shopInventory?.["furniture.desk"] !== 1) {
  throw new Error("gacha furniture reward was not stored with its exact product id");
}
if (!parsedState.ownedCats?.includes("ink") || parsedState.activeCat !== "ink") {
  throw new Error("gacha cat reward was not unlocked and selected on the home screen");
}
if (
  !parsedState.ownedCats?.includes("siamese") ||
  !parsedState.homeCats?.includes("fluffy") ||
  !parsedState.homeCats?.includes("ink") ||
  !parsedState.homeCats?.includes("siamese")
) {
  throw new Error("owned cats were not restored to the home clearing");
}

const compactPage = await browser.newPage({ viewport: { width: 1024, height: 640 } });
compactPage.on("console", (message) => {
  if (message.type() === "error") {
    errors.push(`compact console: ${message.text()}`);
  }
});
compactPage.on("pageerror", (error) => errors.push(`compact page: ${error.message}`));
await compactPage.goto(process.env.GAME_URL ?? "http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await compactPage.locator("canvas").waitFor({ state: "visible" });
const compactBox = await compactPage.locator("canvas").boundingBox();
if (compactBox?.width !== 1024 || compactBox.height !== 640) {
  throw new Error(`unexpected compact canvas bounds: ${JSON.stringify(compactBox)}`);
}
await compactPage.screenshot({ path: screenshotPath("cat-game-home-compact.png") });

await browser.close();

if (errors.length > 0) {
  throw new Error(errors.join("\n"));
}

console.log("Canvas smoke test passed");
console.log(`screenshots: ${tmpdir()} (cat-game-*.png)`);
