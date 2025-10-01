import type { Express, Request } from "express";
import express from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import { storage } from "./storage";
import {
  insertProjectSchema,
  insertDrawingSchema,
} from "../shared/schema";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}
const PYTHON_API = process.env.VITE_ML_URL || "http://127.0.0.1:8000";


// Uploader for proxying to AI service (uses memory)
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Uploader for saving files to the server (uses disk)
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const diskUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => {
      const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Essential middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  
  // CORS middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
  
  // Serve uploaded files statically
  app.use("/uploads", express.static(uploadDir));
  
  // --- AI ANALYSIS PROXY ENDPOINT ---
  app.post("/api/analyze", memoryUpload.single("file"), async (req: MulterRequest, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }
    if (!req.body.types) {
      return res.status(400).json({ error: "No analysis types selected." });
    }
    if (!req.body.scale) {
      return res.status(400).json({ error: "No scale provided." });
    }

    try {
      const fd = new FormData();
      fd.append("file", req.file.buffer, req.file.originalname);
      fd.append("types", req.body.types);
      fd.append("scale", req.body.scale);

      const pythonApi = `${PYTHON_API}/analyze`;
      console.log("[API] Forwarding to Python service:", pythonApi);

      const r = await axios.post(pythonApi, fd, {
        headers: fd.getHeaders(),
        timeout: 120_000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      console.log("[API] Python service response received.");
      res.json(r.data);
    } catch (e: any) {
      console.error("[API] analyze error:", {
        message: e?.message,
        code: e?.code,
        status: e?.response?.status,
        data: e?.response?.data,
      });
      const status = e?.response?.status || 500;
      const payload = (typeof e?.response?.data === "object" && e?.response?.data) || { error: e?.message || "Analyze failed" };
      return res.status(status).json(payload);
    }
  });

  // --- GENERAL FILE UPLOAD ENDPOINT ---
  app.post("/api/upload", diskUpload.single("file"), async (req: MulterRequest, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const fileUrl = `/uploads/${req.file.filename}`;
    return res.json({
      fileUrl,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  });

  // --- PROJECTS ROUTES ---
  app.get("/api/projects", async (_req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const data = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(data);
      res.status(201).json(project);
    } catch {
      res.status(400).json({ message: "Invalid project data" });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const data = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(req.params.id, data);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (err) {
      console.error("Project update error:", err);
      res.status(400).json({ message: "Invalid project data" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const success = await storage.deleteProject(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.status(204).send();
    } catch (err) {
      console.error("Project deletion error:", err);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // --- DRAWINGS ROUTES ---
  app.get("/api/projects/:projectId/drawings", async (req, res) => {
    try {
      const drawings = await storage.getDrawingsByProject(req.params.projectId);
      res.json(drawings);
    } catch {
      res.status(500).json({ message: "Failed to fetch drawings" });
    }
  });

  app.post("/api/projects/:projectId/drawings", async (req, res) => {
    try {
      const data = insertDrawingSchema.parse({ ...req.body, projectId: req.params.projectId });
      const drawing = await storage.createDrawing(data);
      res.status(201).json(drawing);
    } catch (err) {
      console.error("Drawing creation error:", err);
      res.status(400).json({ message: "Invalid drawing data" });
    }
  });

  // --- DRAWING UPLOAD ENDPOINT ---
  app.post("/api/projects/:projectId/drawings/upload", diskUpload.single("file"), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { name, scale } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Drawing name is required" });
      }

      // Create the drawing record with file information
      const fileUrl = `/uploads/${req.file.filename}`;
      const drawingData = {
        projectId: req.params.projectId,
        name,
        filename: req.file.originalname,
        fileUrl,
        fileType: req.file.mimetype,
        scale: scale || "1/4\" = 1'",
        status: "pending"
      };

      const data = insertDrawingSchema.parse(drawingData);
      const drawing = await storage.createDrawing(data);

      // Trigger AI processing
      try {
        const formData = new FormData();
        const fileStream = fs.createReadStream(req.file.path);
        formData.append("file", fileStream, {
          filename: req.file.originalname,
          contentType: req.file.mimetype,
        });
        
        // Add required parameters that ML service expects
        formData.append("detect_floors", "true");
        formData.append("detect_columns", "true");
        formData.append("detect_walls", "true");
        
        // Add scale if provided
        if (scale) {
          formData.append("scale", scale);
        }

        const response = await axios.post(`${PYTHON_API}/analyze`, formData, {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: 120000, // 2 minutes timeout
        });

        // Update drawing status to processing
        // Note: You might want to add an update method to storage
        console.log("AI processing started for drawing:", drawing.id);
        console.log("AI response:", response.data);
      } catch (aiError) {
        console.error("Failed to start AI processing:", aiError);
        // Drawing is created but AI processing failed
      }

      res.status(201).json(drawing);
    } catch (err) {
      console.error("Drawing upload error:", err);
      res.status(500).json({ message: "Failed to upload drawing" });
    }
  });

  // --- TAKEOFFS ROUTES ---
  app.get("/api/drawings/:drawingId/takeoffs", async (req, res) => {
    try {
      const takeoffs = await storage.getTakeoffsByDrawing(req.params.drawingId);
      res.json(takeoffs);
    } catch {
      res.status(500).json({ message: "Failed to fetch takeoffs" });
    }
  });

  app.post("/api/drawings/:drawingId/takeoffs", async (req, res) => {
    try {
      const data = { ...req.body, drawingId: req.params.drawingId };
      const takeoff = await storage.createTakeoff(data);
      res.status(201).json(takeoff);
    } catch (err) {
      console.error("Takeoff creation error:", err);
      res.status(400).json({ message: "Invalid takeoff data" });
    }
  });

  app.put("/api/takeoffs/:id", async (req, res) => {
    try {
      const takeoff = await storage.updateTakeoff(req.params.id, req.body);
      if (!takeoff) {
        return res.status(404).json({ message: "Takeoff not found" });
      }
      res.json(takeoff);
    } catch (err) {
      console.error("Takeoff update error:", err);
      res.status(400).json({ message: "Invalid takeoff data" });
    }
  });

  // --- ANALYSIS RESULTS ENDPOINT ---
  app.post("/api/drawings/:drawingId/analysis", async (req, res) => {
    try {
      // This endpoint receives AI analysis results and converts them to takeoffs
      const { results, scale } = req.body;
      const drawingId = req.params.drawingId;
      
      if (!results || !results.models) {
        return res.status(400).json({ message: "Invalid analysis results" });
      }

      const createdTakeoffs: any[] = [];
      
      // Process each model's results
      for (const [modelType, detections] of Object.entries(results.models)) {
        const detectionsArray = detections as any[];
        for (const detection of detectionsArray) {
          const takeoffData = {
            drawingId,
            elementType: modelType,
            elementName: detection.class || 'Unknown',
            itemType: detection.class || 'Unknown',
            quantity: 1,
            originalQuantity: 1,
            coordinates: detection.bbox || detection.points || null,
            detectedByAi: true,
            unit: modelType === 'floors' ? 'sq ft' : 'count',
            verified: false
          };
          
          const takeoff = await storage.createTakeoff(takeoffData);
          createdTakeoffs.push(takeoff);
        }
      }

      // Update drawing status to complete
      await storage.updateDrawing(drawingId, { status: 'complete', aiProcessed: true });

      res.status(201).json({ 
        message: "Analysis results processed", 
        takeoffs: createdTakeoffs 
      });
    } catch (err) {
      console.error("Analysis processing error:", err);
      res.status(500).json({ message: "Failed to process analysis results" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}