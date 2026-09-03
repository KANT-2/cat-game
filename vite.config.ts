import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
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
      registerType: "autoUpdate",
      includeAssets: ["icons/app-icon.svg"],
      manifest: {
        id: "/",
        name: "{ 냥 }",
        short_name: "{ 냥 }",
        description: "Python을 연습하고 고양이 방을 꾸미는 학습 게임",
        lang: "ko",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "landscape",
        background_color: "#3b251c",
        theme_color: "#6b4932",
        categories: ["education", "games"],
        icons: [
          {
            src: "/icons/app-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,json,png,webp,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
});
