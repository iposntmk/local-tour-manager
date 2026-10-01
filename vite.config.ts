import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const rawBasePath = env.VITE_APP_BASE_PATH?.trim();
  // Always absolute ("/name/"): a relative value makes the PWA manifest resolve
  // scope/start_url against its own URL, doubling the folder ("/name/name/").
  const trimmedBasePath = rawBasePath?.replace(/(^\/+|\/+$)/g, "");
  const normalizedBasePath = trimmedBasePath ? `/${trimmedBasePath}/` : "/";

  return {
    base: normalizedBasePath,
    server: {
      host: "0.0.0.0",
      port: 8080,
      strictPort: true,
      open: false,
    },
    plugins: [
      react(),
      mode === "development" &&
        visualizer({
          open: true,
          gzipSize: true,
          filename: "dist/stats.html",
      }),
      mode !== "development" &&
        VitePWA({
          registerType: "autoUpdate",
          includeAssets: ["favicon.ico", "icons/*"],
          manifest: {
            name: "Tour Manager - Local-First Tour Management",
            short_name: "Tour Manager",
            description: "Local-first tour management system for organizing tours, guides, companies, and itineraries",
            lang: "vi",
            theme_color: "#1d4ed8",
            background_color: "#ffffff",
            display: "standalone",
            scope: normalizedBasePath,
            start_url: normalizedBasePath,
            // Regenerate with `npm run generate:icons`.
            icons: [
              {
                src: `${normalizedBasePath}icons/icon-192.png`,
                sizes: "192x192",
                type: "image/png",
                purpose: "any",
              },
              {
                src: `${normalizedBasePath}icons/icon-512.png`,
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
              },
              {
                src: `${normalizedBasePath}icons/icon-maskable-512.png`,
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
              },
            ],
          },
          workbox: {
            globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: "CacheFirst",
                options: {
                  cacheName: "google-fonts-cache",
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                  },
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                },
              },
              {
                urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                handler: "CacheFirst",
                options: {
                  cacheName: "gstatic-fonts-cache",
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                  },
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                },
              },
            ],
          },
        }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      include: ["react", "react-dom"],
    },
  };
});
