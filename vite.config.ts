import { defineConfig } from "vite";

const basePath = normalizeBasePath(process.env.CAT_GAME_BASE_PATH ?? "/");

export default defineConfig({
  base: basePath,
  clearScreen: false,
  build: {
    rollupOptions: {
      input: {
        game: new URL("./index.html", import.meta.url).pathname,
        desktopWidget: new URL("./desktop-widget.html", import.meta.url).pathname,
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});

function normalizeBasePath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") {
    return "/";
  }
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}/`;
}
