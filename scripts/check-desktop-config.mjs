import { readFile } from "node:fs/promises";

const config = JSON.parse(await readFile(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf8"));
const widget = config.app?.windows?.find((window) => window.label === "widget");
const errors = [];

if (config.build?.devUrl !== "http://127.0.0.1:5173") {
  errors.push("desktop devUrl must match the fixed Vite port");
}
if (config.build?.frontendDist !== "../dist") {
  errors.push("desktop frontendDist must use the shared Vite build");
}
if (!widget) {
  errors.push("desktop widget window is missing");
} else {
  if (widget.alwaysOnTop !== true) {
    errors.push("desktop widget must stay always on top");
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Desktop host configuration passed");
