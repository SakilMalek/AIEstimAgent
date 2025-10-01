import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  // Your app lives under client/, so make that the Vite root.
  root: path.resolve(__dirname, "client"),

  plugins: [react()],
  base: process.env.VITE_BASE_PATH || "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
    dedupe: ["react", "react-dom"],
  },

  server: {
    port: 5173,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5001",
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on("error", (err, req, _res) => {
            console.log("Proxy error:", err, req.url);
          });
          proxy.on("proxyReq", (_proxyReq, req, _res) => {
            console.log("Proxying request:", req.method, req.url);
          });
        },
      },
      "/uploads": {
        target: "http://127.0.0.1:5001",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  build: {
    // Output outside of client/ so the API can serve it from ../dist/client
    outDir: path.resolve(__dirname, "dist", "client"),
    emptyOutDir: true,
  },
});
