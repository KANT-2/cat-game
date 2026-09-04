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

await page.screenshot({ path: screenshotPath("cat-game-attendance.png") });
await page.mouse.click(1220, 733);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-attendance-claimed.png") });
await page.mouse.click(1220, 733);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-home.png") });

await page.mouse.move(600, 610);
await page.mouse.down();
await page.mouse.move(930, 560, { steps: 8 });
await page.waitForTimeout(650);
await page.screenshot({ path: screenshotPath("cat-game-lift.png") });
await page.mouse.move(1150, 545, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(900);
await page.screenshot({ path: screenshotPath("cat-game-drop.png") });

await page.mouse.click(90, 90);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-profile-account.png") });
await page.mouse.click(1400, 180);
await page.waitForTimeout(150);
await page.screenshot({ path: screenshotPath("cat-game-profile-attendance.png") });
await page.mouse.click(1220, 733);
await page.waitForTimeout(150);
await page.mouse.click(800, 738);
await page.waitForTimeout(150);
await page.screenshot({ path: screenshotPath("cat-game-profile-confirm-reset.png") });
await page.mouse.click(695, 587);
await page.mouse.click(63, 60);

await page.mouse.click(78, 811);
await page.waitForTimeout(150);
await page.screenshot({ path: screenshotPath("cat-game-settings-sound.png") });
await page.mouse.click(165, 369);
await page.waitForTimeout(150);
await page.screenshot({ path: screenshotPath("cat-game-settings-alerts.png") });
await page.mouse.click(165, 459);
await page.waitForTimeout(150);
await page.screenshot({ path: screenshotPath("cat-game-settings-learning.png") });
await page.mouse.click(63, 60);

await page.mouse.click(1194, 820);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-study.png") });
await page.mouse.click(390, 445);
await page.waitForTimeout(100);
await page.screenshot({ path: screenshotPath("cat-game-study-type-select.png") });
await page.mouse.click(390, 535);
await page.mouse.click(800, 445);
await page.waitForTimeout(100);
await page.screenshot({ path: screenshotPath("cat-game-study-concept-select.png") });
await page.mouse.click(800, 535);
await page.mouse.click(1200, 445);
await page.waitForTimeout(100);
await page.screenshot({ path: screenshotPath("cat-game-study-difficulty-select.png") });
await page.mouse.click(1200, 535);
await page.mouse.click(1395, 350);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-study-task.png") });
await page.mouse.click(680, 665);
await page.waitForTimeout(150);
await page.mouse.click(800, 520);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-study-feedback.png") });
await page.mouse.click(800, 510);
await page.waitForTimeout(150);
await page.mouse.click(65, 55);
await page.waitForTimeout(100);
await page.mouse.click(940, 813);
await page.waitForTimeout(100);
await page.mouse.click(1450, 720);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-study-code.png") });
await page.mouse.click(294, 601);
await page.waitForTimeout(100);
await page.screenshot({ path: screenshotPath("cat-game-study-hint-2.png") });
await page.mouse.click(154, 601);
await page.waitForTimeout(100);
await page.screenshot({ path: screenshotPath("cat-game-study-hint-1-again.png") });
await page.mouse.click(65, 55);
await page.waitForTimeout(100);
await page.mouse.click(65, 55);

await page.mouse.click(1302, 820);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-daily-quest.png") });
await page.mouse.click(65, 54);

await page.mouse.click(1530, 811);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-shop-options.png") });
await page.mouse.click(1518, 684);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-shop.png") });
await page.mouse.click(180, 282);
await page.waitForTimeout(150);
await page.screenshot({ path: screenshotPath("cat-game-shop-wallpaper.png") });
await page.mouse.click(595, 510);
await page.waitForTimeout(150);
await page.screenshot({ path: screenshotPath("cat-game-shop-confirm-wallpaper.png") });
await page.mouse.click(650, 590);
await page.waitForTimeout(100);
await page.mouse.click(595, 510);
await page.waitForTimeout(100);
await page.mouse.click(950, 590);
await page.waitForTimeout(150);
await page.mouse.click(180, 198);
await page.waitForTimeout(150);
await page.mouse.click(595, 510);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-shop-confirm.png") });
await page.mouse.click(950, 590);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-purchased.png") });
await page.mouse.click(905, 505);
await page.waitForTimeout(200);
await page.mouse.click(60, 55);
await page.waitForTimeout(200);

await page.mouse.click(1410, 820);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-gacha.png") });
await page.mouse.click(995, 50);
await page.waitForTimeout(150);
await page.screenshot({ path: screenshotPath("cat-game-gacha-policy.png") });
await page.mouse.click(800, 665);
await page.waitForTimeout(100);
await page.mouse.click(805, 50);
await page.waitForTimeout(150);
await page.screenshot({ path: screenshotPath("cat-game-gacha-collection.png") });
await page.mouse.click(800, 680);
await page.mouse.click(640, 787);
await page.waitForTimeout(150);
await page.screenshot({ path: screenshotPath("cat-game-gacha-confirm.png") });
await page.mouse.click(930, 582);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-gacha-item-result.png") });
await page.mouse.click(800, 744);
await page.waitForTimeout(100);
await page.evaluate(() => {
  Math.random = () => 0.01;
});
await page.mouse.click(640, 787);
await page.waitForTimeout(100);
await page.mouse.click(930, 582);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-gacha-cat-result.png") });
await page.mouse.click(780, 744);
await page.waitForTimeout(400);
await page.screenshot({ path: screenshotPath("cat-game-home-ink-cat.png") });

await page.mouse.click(1530, 811);
await page.waitForTimeout(200);
await page.mouse.click(1518, 740);
await page.waitForTimeout(200);
await page.mouse.click(745, 218);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-owned-wallpaper.png") });
await page.mouse.click(432, 423);
await page.waitForTimeout(150);
await page.mouse.click(285, 218);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-owned-siamese-stored.png") });
await page.mouse.click(892, 396);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-owned-siamese-on-home.png") });
await page.mouse.click(472, 396);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-owned-stored-cat.png") });
await page.mouse.click(63, 60);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-home-one-cat.png") });

await page.mouse.click(1530, 811);
await page.waitForTimeout(200);
await page.mouse.click(1518, 740);
await page.waitForTimeout(200);
await page.mouse.click(285, 218);
await page.waitForTimeout(200);
await page.mouse.click(472, 396);
await page.waitForTimeout(200);
await page.mouse.click(63, 60);
await page.waitForTimeout(200);
await page.screenshot({ path: screenshotPath("cat-game-home-three-cats.png") });

const savedState = await page.evaluate(() => localStorage.getItem("cozy-code-cat-room-v1"));
if (!savedState) {
  throw new Error("game state was not persisted");
}
const parsedState = JSON.parse(savedState);
if (parsedState.coins !== 1_093_165) {
  throw new Error(`unexpected coins after attendance, study reward, purchases, and two draws: ${parsedState.coins}`);
}
if (parsedState.attendanceStreak !== 1 || parsedState.attendanceLastClaimDate.length !== 10) {
  throw new Error("attendance was not persisted after the initial claim");
}
if ("gems" in parsedState) {
  throw new Error("legacy gem currency should not remain in the saved state");
}
if (parsedState.shopInventory?.["furniture.desk"] !== 1) {
  throw new Error("gacha furniture reward was not stored with its exact product id");
}
if (parsedState.activeWallpaper !== "wallpaper.cream") {
  throw new Error("purchased wallpaper was not applied from owned inventory");
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
await compactPage.waitForTimeout(4800);
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
