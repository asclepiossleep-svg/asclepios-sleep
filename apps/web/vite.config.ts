import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Doc 06 §1 — "installable PWA". Doc 06 §5 — offline cache, resume sync.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // PWA install/Home Screen flow (6 Sep 2026) — favicon/apple-touch-icon
      // aren't referenced by the manifest below, only by index.html, so they
      // need to be listed explicitly to end up in the offline precache.
      includeAssets: ["icons/favicon-16.png", "icons/favicon-32.png", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Asclepios Sleep",
        short_name: "Asclepios",
        description: "Product-led sleep management: routine, sleep sound, wake, and review.",
        theme_color: "#2b3a55",
        background_color: "#0f1420",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // App-shell caching only in this scaffold; media stays on CDN and is
        // never cached by the app server's service worker (Doc 06 §8).
        globPatterns: ["**/*.{js,css,html}"],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
