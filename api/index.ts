// api/index.ts - UPDATED

import 'dotenv/config';
import express from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

(async () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // This is the crucial step that loads all your API endpoints
  const server = await registerRoutes(app);

  // This sets up the Vite dev server AFTER the API routes are registered
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5001', 10);
  const host = process.env.HOST || '127.0.0.1';

  server.listen(port, host, () => {
    log(`Server listening on http://${host}:${port}`);
  });
})();