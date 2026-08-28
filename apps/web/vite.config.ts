import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Doc 06 §1 — "installable PWA". Doc 06 §5 — offline cache, resume sync.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [],
      manifest: {
        name: "Asclepios Sleep",
        short_name: "Asclepios",
        description: "Product-led sleep management: routine, sleep sound, wake, and review.",
        theme_color: "#2b3a55",
        background_color: "#0f1420",
        display: "standalone",
        start_url: "/",
        icons: [],
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
