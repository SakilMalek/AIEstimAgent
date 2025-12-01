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
const PYTHON_API = process.env.ML_API_URL || process.env.VITE_ML_URL || "http://127.0.0.1:8000";


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
  console.log('[ROUTES] Starting route registration...');
  
  // Essential middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  
  // CORS middleware
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
      'https://estimagent.vercel.app',
      'http://localhost:5173',
      'http://localhost:5001',
      'http://localhost:8000'
    ];
    
    console.log('[CORS] Request from origin:', origin, 'Method:', req.method, 'Path:', req.path);
    
    // Always set CORS headers first
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
    res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
    res.header('Access-Control-Max-Age', '3600');
    
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      console.log('[CORS] Allowed origin:', origin);
    } else if (origin) {
      // For non-matching origins, still allow but without credentials
      res.header('Access-Control-Allow-Origin', origin);
      console.log('[CORS] Non-matching origin, allowing anyway:', origin);
    } else {
      // No origin header (e.g., same-origin requests)
      res.header('Access-Control-Allow-Origin', '*');
    }
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });
  
  // Serve uploaded files statically
  app.use("/uploads", express.static(uploadDir));
  
  // --- ROOT ENDPOINT (must be before other routes) ---
  app.get("/", (_req, res) => {
    console.log('[API] Root endpoint hit!');
    res.json({ 
      service: "EstimAgent API",
      version: "1.0.0",
      status: "running",
      endpoints: [
        "/health",
        "/api/health",
        "/api/test",
        "/api/projects",
        "/api/upload",
        "/api/upload-pdf",
        "/api/analyze"
      ]
    });
  });

  // --- HEALTH CHECK ENDPOINTS ---
  app.get("/health", (_req, res) => {
    console.log('[API] Health endpoint hit!');
    res.json({ status: "ok", service: "estimagent-api" });
  });

  app.get("/api/health", (_req, res) => {
    console.log('[API] API health endpoint hit!');
    res.json({ status: "ok", service: "estimagent-api" });
  });
  
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
      console.log("[API] ML Response:", JSON.stringify(r.data, null, 2));
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

    // Always use absolute URL
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? (process.env.API_BASE_URL || 'https://estimagent-api-v2-558363734671.us-central1.run.app')
      : 'http://localhost:5001';
    const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
    
    return res.json({
      file_url: fileUrl,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  });

  // --- TEST ENDPOINT ---
  app.get("/api/test", (_req, res) => {
    console.log('[API] Test endpoint hit!');
    res.json({ message: "Backend is running!", timestamp: new Date().toISOString() });
  });

  // --- PDF UPLOAD ENDPOINT (Proxy to ML Service) ---
  app.post("/api/upload-pdf", memoryUpload.single("file"), async (req: MulterRequest, res) => {
    console.log('[API] /api/upload-pdf endpoint hit!');
    try {
      if (!req.file) {
        console.log('[PDF Upload] No file in request');
        return res.status(400).json({ message: "No file uploaded" });
      }

      console.log('[PDF Upload] Received PDF upload request');
      console.log('[PDF Upload] File:', req.file.originalname, req.file.size, 'bytes');

      // Get ML service URL from environment
      const mlApiUrl = process.env.ML_API_URL || process.env.VITE_ML_URL || 'http://localhost:8001';
      console.log('[PDF Upload] Forwarding to ML service:', mlApiUrl);

      // Create form data to send to ML service
      const formData = new FormData();
      formData.append('file', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });

      // Forward request to ML service
      const response = await axios.post(`${mlApiUrl}/upload-pdf`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      console.log('[PDF Upload] ML service response:', response.status);
      
      // Return ML service response to frontend
      res.json(response.data);
    } catch (error: any) {
      console.error('[PDF Upload] Error:', error.message);
      if (error.response) {
        console.error('[PDF Upload] ML service error:', error.response.data);
        return res.status(error.response.status).json(error.response.data);
      }
      res.status(500).json({ 
        success: false,
        error: 'Failed to process PDF',
        detail: error.message 
      });
    }
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
      console.log('[API] Creating project with data:', req.body);
      const data = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(data);
      res.status(201).json(project);
    } catch (error) {
      console.error('[API] Project creation error:', error);
      res.status(400).json({ message: "Invalid project data", error: error instanceof Error ? error.message : String(error) });
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
      const data = insertDrawingSchema.parse({ ...req.body, project_id: req.params.projectId });
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
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? (process.env.API_BASE_URL || 'https://aiestimagent-api.onrender.com')
        : 'http://localhost:5001'; // Use absolute URL in development mode
      const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
      
      const drawingData = {
        project_id: req.params.projectId,
        name,
        filename: req.file.originalname,
        file_url: fileUrl,
        file_type: req.file.mimetype,
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
      const data = { ...req.body, drawing_id: req.params.drawingId };
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
      
      if (!results || (!results.models && !results.predictions)) {
        return res.status(400).json({ message: "Invalid analysis results" });
      }

      // Handle both old format (results.models) and new format (results.predictions)
      const predictions = results.predictions || results.models || {};
      
      // Collect all takeoff data first (no DB calls yet)
      const takeoffsToCreate: any[] = [];
      
      // Process each prediction category
      for (const [categoryType, detections] of Object.entries(predictions)) {
        const detectionsArray = detections as any[];
        for (const detection of detectionsArray) {
          const takeoffData: any = {
            drawing_id: drawingId,
            element_type: categoryType,
            element_name: detection.class || 'Unknown',
            item_type: detection.class || 'Unknown',
            quantity: 1,
            coordinates: detection.bbox || detection.points || detection.mask || null,
            is_detected_by_ai: true,
            is_verified: false
          };

          // Set unit and measurements based on category type
          if (categoryType === 'rooms' || categoryType === 'flooring') {
            takeoffData.unit = 'sq ft';
            takeoffData.area = detection.display?.area_sqft || 0;
            takeoffData.length = detection.display?.perimeter_ft || 0; // Store perimeter in length field
            // Normalize the element type to 'rooms' for consistency
            takeoffData.element_type = 'rooms';
          } else if (categoryType === 'walls') {
            takeoffData.unit = 'ft';
            takeoffData.length = detection.display?.inner_perimeter || detection.display?.outer_perimeter || 0;
          } else if (categoryType === 'openings') {
            takeoffData.unit = 'count';
            takeoffData.width = detection.display?.width || 0;
            takeoffData.height = detection.display?.height || 0;
          } else {
            takeoffData.unit = 'count';
          }
          
          takeoffsToCreate.push(takeoffData);
        }
      }

      // Batch insert all takeoffs in a single DB call (much faster!)
      const createdTakeoffs = await storage.createTakeoffsBatch(takeoffsToCreate);

      // Update drawing status to complete
      await storage.updateDrawing(drawingId, { status: 'complete', is_ai_processed: true });

      res.status(201).json({ 
        message: "Analysis results processed", 
        takeoffs: createdTakeoffs 
      });
    } catch (err) {
      console.error("Analysis processing error:", err);
      res.status(500).json({ message: "Failed to process analysis results" });
    }
  });

  console.log('[ROUTES] All routes registered successfully!');
  console.log('[ROUTES] Total routes:', app._router.stack.filter((r: any) => r.route).length);
  
  const httpServer = createServer(app);
  return httpServer;
}