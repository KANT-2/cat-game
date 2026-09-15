import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

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
  plugins: [
    VitePWA({
      base: basePath,
      scope: basePath,
      registerType: "autoUpdate",
      includeAssets: ["icons/app-icon.svg"],
      manifest: {
        id: basePath,
        name: "{ 냥 }",
        short_name: "{ 냥 }",
        description: "Python을 연습하고 고양이 방을 꾸미는 학습 게임",
        lang: "ko",
        start_url: basePath,
        scope: basePath,
        display: "standalone",
        orientation: "landscape",
        background_color: "#3b251c",
        theme_color: "#6b4932",
        categories: ["education", "games"],
        icons: [
          {
            src: `${basePath}icons/app-icon.svg`,
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: `${basePath}index.html`,
        globPatterns: ["**/*.{js,css,html,json,png,webp,svg,woff2}"],
        globIgnores: ["assets/backgrounds/**/*"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith(`${basePath}assets/backgrounds/`),
            handler: "CacheFirst",
            options: {
              cacheName: "location-backgrounds-v1",
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
});

function normalizeBasePath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") {
    return "/";
  }
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}/`;
}
