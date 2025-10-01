import express from "express";
import path from "path";
import { fileURLToPath } from "url";

// Needed when using ES modules (so __dirname works)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ✅ Serve static client files from /dist/client
app.use(express.static(path.join(__dirname, "client")));

// ✅ Example API route
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ✅ Catch-all route: serves index.html for SPA routing
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "client", "index.html"));
});

// ✅ Use Render's dynamic port or fallback to 5000 locally
const PORT = parseInt(process.env.PORT || "5000", 10);

// ✅ Bind to 0.0.0.0 (so Render can expose it)
app.listen(PORT, "0.0.0.0", () => {
  console.log(` Server running on http://0.0.0.0:${PORT}`);
});
