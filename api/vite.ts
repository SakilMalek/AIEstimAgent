// Create this new file at api/vite.ts

import { createServer as createViteServer, type ViteDevServer } from "vite";
import express, { type Express } from "express";
import path from "path";
import type { Server } from 'http';

export function log(msg: string) {
  const now = new Date();
  console.log(`\x1b[90m${now.toLocaleTimeString()}\x1b[0m \x1b[36m[vite]\x1b[0m \x1b[97m${msg}\x1b[0m`);
}

export async function setupVite(app: Express, server: Server) {
  const vite: ViteDevServer = await createViteServer({
    server: { middlewareMode: true, hmr: { server } },
    appType: "spa",
    root: path.join(process.cwd(), "client"),
  });
  app.use(vite.middlewares);
  log("Vite dev server running");
}

export function serveStatic(app: Express) {
  const clientPath = path.join(process.cwd(), "client/dist");
  app.use(express.static(clientPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientPath, "index.html"));
  });
  log(`Serving static files from ${clientPath}`);
}