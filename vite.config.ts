import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
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
        globPatterns: ["**/*.{js,css,html,json,png,svg,woff2}"],
        globIgnores: ["assets/cats/ink-black/**"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
});
