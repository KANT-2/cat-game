import { readFile } from "node:fs/promises";

const config = JSON.parse(await readFile(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf8"));
const windowsConfig = JSON.parse(
  await readFile(new URL("../src-tauri/tauri.windows.conf.json", import.meta.url), "utf8"),
);
const widget = config.app?.windows?.find((window) => window.label === "widget");
const windowsWidget = windowsConfig.app?.windows?.find((window) => window.label === "widget");
const errors = [];

if (config.build?.devUrl !== "http://127.0.0.1:5173") {
  errors.push("desktop devUrl must match the fixed Vite port");
}
if (config.build?.frontendDist !== "../dist") {
  errors.push("desktop frontendDist must use the shared Vite build");
}
if (!widget) {
  errors.push("base desktop window is missing");
}
if (!windowsWidget) {
  errors.push("Windows desktop widget window is missing");
} else {
  if (windowsWidget.url !== "index.html?display=desktop-widget") {
    errors.push("Windows widget must open the transparent frontend presentation");
  }
  if (windowsWidget.alwaysOnTop !== true) {
    errors.push("Windows widget must stay always on top");
  }
  if (windowsWidget.decorations !== false) {
    errors.push("Windows widget must be frameless");
  }
  if (windowsWidget.transparent !== true) {
    errors.push("Windows widget must allow transparency");
  }
  if (windowsWidget.skipTaskbar !== true) {
    errors.push("Windows widget must stay out of the taskbar");
  }
}
if (!windowsConfig.bundle?.icon?.includes("icons/icon.ico")) {
  errors.push("Windows bundle must use the square tray-compatible icon");
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Desktop host configuration passed");
