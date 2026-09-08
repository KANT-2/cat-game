import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const projectRoot = resolve(import.meta.dirname, "..");
const guideSvgPath = resolve(projectRoot, "docs/art/forest-belt-camera-guide.svg");
const guidePngPath = resolve(projectRoot, "docs/art/forest-belt-camera-guide.png");
const backgroundPath = resolve(projectRoot, "public/assets/environment/forest-clearing-day-01.webp");
const compositePath = resolve(projectRoot, "docs/art/forest-belt-composition-reference.png");

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto(pathToFileURL(guideSvgPath).href);
  await page.screenshot({ path: guidePngPath, omitBackground: true });

  const [background, guide] = await Promise.all([readFile(backgroundPath), readFile(guideSvgPath)]);
  const backgroundUrl = `data:image/webp;base64,${background.toString("base64")}`;
  const guideUrl = `data:image/svg+xml;base64,${guide.toString("base64")}`;
  const compositePage = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await compositePage.setContent(`
    <!doctype html>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; width: 1600px; height: 900px; overflow: hidden; }
      img { position: absolute; inset: 0; width: 1600px; height: 900px; }
    </style>
    <img src="${backgroundUrl}" alt="">
    <img src="${guideUrl}" alt="">
  `);
  await compositePage.locator("img").last().waitFor({ state: "visible" });
  await compositePage.screenshot({ path: compositePath });
} finally {
  await browser.close();
}

console.log(`Camera references exported:\n- ${guidePngPath}\n- ${compositePath}`);
