import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: "..",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "https://qxa58ayy64.execute-api.us-east-1.amazonaws.com",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
