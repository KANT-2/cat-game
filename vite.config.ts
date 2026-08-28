import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/app-icon.svg"],
      manifest: {
        id: "/",
        name: "코지 코드 캣",
        short_name: "코드 캣",
        description: "Python을 연습하고 고양이 방을 꾸미는 학습 게임",
        lang: "ko",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "landscape",
        background_color: "#f6dfba",
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
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
});
