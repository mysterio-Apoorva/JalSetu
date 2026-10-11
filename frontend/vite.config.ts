import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(import.meta.dirname, ".."), "VITE_");
  return {
  plugins: [react()],
  envDir: "..",
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: env.VITE_API_BASE_URL || "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: true,
      },
    },
  },
  };
});
