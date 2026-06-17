import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const rawBasePath = env.VITE_APP_BASE_PATH?.trim();
  const normalizedBasePath = rawBasePath
    ? `${rawBasePath.startsWith("/") ? "" : "/"}${rawBasePath.replace(/(^\/+|\/+$)/g, "")}/`
    : "/";

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
      // Self-destroying SW: gỡ service worker cũ + xóa cache trên client đã cài.
      // Bước dọn dẹp trước khi xóa hẳn vite-plugin-pwa (xem plan PWA removal).
      mode !== "development" &&
        VitePWA({
          selfDestroying: true,
        }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      include: ["react", "react-dom", "fuse.js", "exceljs"],
    },
  };
});
