import { registerRoutes } from "./routes.js";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

// Needed when using ES modules (so __dirname works)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Create express app and register routes
  const app = express();
  const server = await registerRoutes(app);

  // ✅ Use Render's dynamic port or fallback to 5001 locally (to avoid conflict with frontend)
  const PORT = parseInt(process.env.PORT || "5001", 10);

  // ✅ Bind to 0.0.0.0 (so Render can expose it)
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 API Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
