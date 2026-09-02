import { access, readFile } from "node:fs/promises";
import path from "node:path";

const workspace = process.cwd();
const catalogPath = path.join(workspace, "public/assets/catalog.json");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const allowedKinds = new Set(["background", "environment", "furniture", "cat", "ui", "effect"]);
const forbiddenKeys = new Set(["price", "footprint", "collision", "reward", "rarity"]);
const ids = new Set();
const errors = [];

if (catalog.version !== 1 || !catalog.bundles || typeof catalog.bundles !== "object") {
  errors.push("catalog must have version 1 and a bundles object");
}

for (const [bundle, entries] of Object.entries(catalog.bundles ?? {})) {
  if (!Array.isArray(entries)) {
    errors.push(`bundle ${bundle} must be an array`);
    continue;
  }
  for (const entry of entries) {
    if (!entry.id || ids.has(entry.id)) {
      errors.push(`duplicate or missing asset id: ${entry.id ?? "<missing>"}`);
    }
    ids.add(entry.id);
    if (!allowedKinds.has(entry.kind)) {
      errors.push(`${entry.id}: invalid kind ${entry.kind}`);
    }
    for (const key of Object.keys(entry)) {
      if (forbiddenKeys.has(key)) {
        errors.push(`${entry.id}: gameplay key '${key}' belongs in src/domain`);
      }
    }
    if (entry.anchor && (!inUnitRange(entry.anchor.x) || !inUnitRange(entry.anchor.y))) {
      errors.push(`${entry.id}: anchor values must be between 0 and 1`);
    }
    if (entry.spriteSheet) {
      checkSpriteSheet(entry.id, entry.spriteSheet, errors);
    }
    await checkAssetPath(entry.id, entry.src, errors);
    for (const frame of entry.frames ?? []) {
      await checkAssetPath(`${entry.id}/${frame.name}`, frame.src, errors);
    }
  }
}

function checkSpriteSheet(id, spriteSheet, errors) {
  const positiveIntegerKeys = ["frameWidth", "frameHeight", "columns", "frameCount", "framesPerSecond"];
  for (const key of positiveIntegerKeys) {
    if (!Number.isInteger(spriteSheet[key]) || spriteSheet[key] <= 0) {
      errors.push(`${id}: spriteSheet.${key} must be a positive integer`);
    }
  }
  if (!new Set(["loop", "once", "hold"]).has(spriteSheet.playback)) {
    errors.push(`${id}: spriteSheet.playback must be loop, once, or hold`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Asset catalog passed: ${ids.size} assets in ${Object.keys(catalog.bundles ?? {}).length} bundles`);

function inUnitRange(value) {
  return typeof value === "number" && value >= 0 && value <= 1;
}

async function checkAssetPath(id, src, errors) {
  if (typeof src !== "string" || !src.startsWith("/assets/")) {
    errors.push(`${id}: src must start with /assets/`);
    return;
  }
  try {
    await access(path.join(workspace, "public", src));
  } catch {
    errors.push(`${id}: file not found at public${src}`);
  }
}
