import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const gameUrl = process.env.GAME_URL ?? "http://127.0.0.1:5173/";
const apiUrl = (process.env.CAT_GAME_API_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
const backgroundIds = [
  "wallpaper.cream",
  "wallpaper.cloud",
  "wallpaper.forest",
  "wallpaper.flower",
  "wallpaper.night",
  "wallpaper.cat",
  "wallpaper.modernAlley",
  "wallpaper.villageAlley",
  "wallpaper.sunnyStudio",
  "wallpaper.livingRoom",
  "wallpaper.cityOffice",
  "wallpaper.botanicalDesk",
  "wallpaper.musicDesk",
  "wallpaper.sandyCove",
  "wallpaper.seasidePromenade",
  "wallpaper.workingHarbor",
];
const targetId = "wallpaper.workingHarbor";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
const loadedBackgroundPaths = new Set();

page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error" && !message.text().includes("401")) {
    errors.push(`console: ${message.text()}`);
  }
});
page.on("response", (response) => {
  const url = new URL(response.url());
  if (response.ok() && url.pathname.startsWith("/assets/backgrounds/")) {
    loadedBackgroundPaths.add(url.pathname);
  }
});

try {
  const developmentSessionResponse = page.waitForResponse(
    (response) => response.url() === `${apiUrl}/api/v1/session/development` && response.status() === 200,
  );
  await page.goto(gameUrl, { waitUntil: "domcontentloaded" });
  const user = await (await developmentSessionResponse).json();
  await page.waitForFunction(() => document.documentElement.dataset.gameReady === "ready", undefined, {
    timeout: 120_000,
  });
  const userPublicId = readString(user, "public_id");
  const initialSnapshot = await requestSnapshot(page, apiUrl, userPublicId);
  const backgrounds = initialSnapshot.items.filter((item) => item.category === "WALLPAPER");
  if (backgrounds.length !== backgroundIds.length) {
    throw new Error(`expected ${backgroundIds.length} backgrounds, received ${backgrounds.length}`);
  }
  if (!backgrounds.some((item) => item.catalog_key === targetId && item.name === "활기찬 항구")) {
    throw new Error("working harbor background is missing from the authoritative catalog");
  }

  await page.mouse.click(1220, 733);
  await page.waitForTimeout(100);
  await page.mouse.click(1220, 733);
  await page.mouse.click(1530, 811);
  await page.waitForTimeout(150);
  await page.mouse.click(1518, 684);
  await page.waitForTimeout(200);
  await page.mouse.click(180, 282);
  await page.waitForTimeout(1_500);
  await page.screenshot({ path: join(tmpdir(), "cat-game-background-shop-page-1.png") });
  await page.mouse.click(1446, 789);
  await page.waitForTimeout(150);
  await page.screenshot({ path: join(tmpdir(), "cat-game-background-shop-page-2.png") });
  await page.mouse.click(1446, 789);
  await page.waitForTimeout(150);
  await page.screenshot({ path: join(tmpdir(), "cat-game-background-shop-page-3.png") });

  await page.mouse.click(605, 721);
  await page.waitForTimeout(100);
  const purchaseResponse = page.waitForResponse(
    (response) =>
      response.url() === `${apiUrl}/api/v1/game/shop/purchases` &&
      response.request().method() === "POST" &&
      response.status() === 200,
  );
  await page.mouse.click(950, 590);
  const purchase = await (await purchaseResponse).json();
  if (purchase.snapshot.active_wallpaper_key === targetId) {
    throw new Error("purchasing a background should not apply it before the owned-screen action");
  }

  await page.mouse.click(60, 55);
  await page.waitForTimeout(150);
  await page.mouse.click(1530, 811);
  await page.waitForTimeout(150);
  await page.mouse.click(1518, 740);
  await page.waitForTimeout(150);
  await page.mouse.click(745, 218);
  await page.waitForTimeout(500);

  const ownedBackgroundIds = backgroundIds.filter((itemId) => {
    const item = purchase.snapshot.items.find((candidate) => candidate.catalog_key === itemId);
    return item && item.owned_quantity > 0;
  });
  const targetIndex = ownedBackgroundIds.indexOf(targetId);
  if (targetIndex < 0) {
    throw new Error("purchased background is missing from owned inventory");
  }
  const targetPage = Math.floor(targetIndex / 6);
  for (let pageIndex = 0; pageIndex < targetPage; pageIndex += 1) {
    await page.mouse.click(922, 781);
    await page.waitForTimeout(100);
  }
  const localIndex = targetIndex % 6;
  const cardX = 180 + (localIndex % 3) * 420;
  const cardY = 285 + Math.floor(localIndex / 3) * 220;
  const themeResponse = page.waitForResponse(
    (response) =>
      response.url() === `${apiUrl}/api/v1/game/themes` &&
      response.request().method() === "POST" &&
      response.status() === 200,
  );
  await page.mouse.click(cardX + 252, cardY + 138);
  const theme = await (await themeResponse).json();
  if (theme.snapshot.active_wallpaper_key !== targetId) {
    throw new Error(`background application returned ${theme.snapshot.active_wallpaper_key}`);
  }
  await page.mouse.click(63, 60);
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(tmpdir(), "cat-game-background-working-harbor-home.png") });

  if (!loadedBackgroundPaths.has("/assets/backgrounds/ocean/working-harbor-01.png")) {
    throw new Error("working harbor image was not loaded from the asset catalog path");
  }
} finally {
  await browser.close();
}

if (errors.length > 0) {
  throw new Error(errors.join("\n"));
}

console.log("Background server E2E passed: 16 products, pagination, purchase, owned apply, and home render");
console.log(`screenshots: ${tmpdir()} (cat-game-background-*.png)`);

async function requestSnapshot(page, backendUrl, userPublicId) {
  return page.evaluate(
    async ({ api, publicId }) => {
      const response = await fetch(`${api}/api/v1/game/snapshot`, {
        headers: { Accept: "application/json", "X-User-Public-ID": publicId },
      });
      if (!response.ok) {
        throw new Error(`snapshot returned ${response.status}`);
      }
      return response.json();
    },
    { api: backendUrl, publicId: userPublicId },
  );
}

function readString(record, key) {
  const value = record?.[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`response field ${key} is invalid`);
  }
  return value;
}
