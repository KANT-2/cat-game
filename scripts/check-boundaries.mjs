import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const workspace = process.cwd();
const sourceRoot = path.join(workspace, "src");
const files = await walk(sourceRoot);
const errors = [];

for (const file of files.filter((item) => item.endsWith(".ts"))) {
  const relative = path.relative(sourceRoot, file).replaceAll(path.sep, "/");
  const source = await readFile(file, "utf8");
  if ((relative.startsWith("domain/") || relative.startsWith("core/")) && source.includes('from "pixi.js"')) {
    errors.push(`${relative}: system layers cannot import PixiJS`);
  }
  if (relative.startsWith("domain/") && /from ["'][^"']*\/(core|game|services|pwa|assets)\//.test(source)) {
    errors.push(`${relative}: domain cannot depend on application or presentation layers`);
  }
  if (relative.startsWith("core/") && /from ["'][^"']*\/(game|services|pwa)\//.test(source)) {
    errors.push(`${relative}: core cannot depend on presentation or platform adapters`);
  }
  if (relative.startsWith("game/") && /from ["'][^"']*\/(app|services|pwa)\//.test(source)) {
    errors.push(`${relative}: presentation cannot depend on app or platform adapters`);
  }
  if (relative.startsWith("game/") && /from ["'][^"']*\/core\/(?!GameClient)[^"']*["']/.test(source)) {
    errors.push(`${relative}: presentation must only use the public core/GameClient contract`);
  }
  if (relative.startsWith("assets/") && /from ["'][^"']*\/(app|core|game|services|pwa)\//.test(source)) {
    errors.push(`${relative}: asset contracts cannot depend on runtime implementations`);
  }
  if (relative.startsWith("services/") && /from ["'][^"']*\/(app|game|pwa|assets)\//.test(source)) {
    errors.push(`${relative}: platform adapters cannot depend on app or presentation layers`);
  }
  const isDesktopPresentation =
    relative === "desktop-main.ts" || relative === "app/DesktopWidgetApp.ts" || relative.startsWith("desktop/");
  if (isDesktopPresentation && /from ["'][^"']*\/(core|services|game\/scenes|game\/forest)\//.test(source)) {
    errors.push(`${relative}: desktop presentation cannot depend on the game state or home scene`);
  }
  if (isDesktopPresentation && source.includes("localStorage")) {
    errors.push(`${relative}: desktop presentation cannot access game storage`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Module boundaries passed: ${files.length} source files checked`);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(target)));
    } else {
      files.push(target);
    }
  }
  return files;
}
