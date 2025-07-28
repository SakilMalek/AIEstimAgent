import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertDrawingSchema, insertTakeoffSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, PNG, and JPG files are allowed.'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Projects routes
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      res.status(400).json({ message: "Invalid project data" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const updateData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(req.params.id, updateData);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
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
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Drawings routes
  app.get("/api/projects/:projectId/drawings", async (req, res) => {
    try {
      const drawings = await storage.getDrawingsByProject(req.params.projectId);
      res.json(drawings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch drawings" });
    }
  });

  app.get("/api/drawings/:id", async (req, res) => {
    try {
      const drawing = await storage.getDrawing(req.params.id);
      if (!drawing) {
        return res.status(404).json({ message: "Drawing not found" });
      }
      res.json(drawing);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch drawing" });
    }
  });

  app.post("/api/projects/:projectId/drawings/upload", upload.single('file'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      const drawingData = {
        projectId: req.params.projectId,
        name: req.body.name || req.file.originalname,
        filename: req.file.originalname,
        fileUrl,
        fileType: req.file.mimetype,
        status: "pending",
        scale: req.body.scale || "1/4\" = 1'",
        aiProcessed: false,
      };

      const drawing = await storage.createDrawing(drawingData);
      
      // Simulate AI processing
      setTimeout(async () => {
        await storage.updateDrawing(drawing.id, {
          status: "processing",
        });
        
        // Simulate processing delay and then complete
        setTimeout(async () => {
          await storage.updateDrawing(drawing.id, {
            status: "complete",
            aiProcessed: true,
          });
          
          // Generate mock takeoff data
          await generateMockTakeoffs(drawing.id);
        }, 5000); // 5 second processing simulation
      }, 1000);

      res.status(201).json(drawing);
    } catch (error) {
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Takeoffs routes
  app.get("/api/drawings/:drawingId/takeoffs", async (req, res) => {
    try {
      const takeoffs = await storage.getTakeoffsByDrawing(req.params.drawingId);
      res.json(takeoffs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch takeoffs" });
    }
  });

  app.post("/api/takeoffs", async (req, res) => {
    try {
      const takeoffData = insertTakeoffSchema.parse(req.body);
      const takeoff = await storage.createTakeoff(takeoffData);
      res.status(201).json(takeoff);
    } catch (error) {
      res.status(400).json({ message: "Invalid takeoff data" });
    }
  });

  app.put("/api/takeoffs/:id", async (req, res) => {
    try {
      const takeoffData = insertTakeoffSchema.partial().parse(req.body);
      const takeoff = await storage.updateTakeoff(req.params.id, takeoffData);
      if (!takeoff) {
        return res.status(404).json({ message: "Takeoff not found" });
      }
      res.json(takeoff);
    } catch (error) {
      res.status(400).json({ message: "Invalid takeoff data" });
    }
  });

  app.delete("/api/takeoffs/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTakeoff(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Takeoff not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete takeoff" });
    }
  });

  // Material costs routes
  app.get("/api/material-costs", async (req, res) => {
    try {
      const { category } = req.query;
      const costs = category 
        ? await storage.getMaterialCostsByCategory(category as string)
        : await storage.getMaterialCosts();
      res.json(costs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch material costs" });
    }
  });

  // AI Processing simulation
  app.post("/api/drawings/:id/process", async (req, res) => {
    try {
      const drawing = await storage.getDrawing(req.params.id);
      if (!drawing) {
        return res.status(404).json({ message: "Drawing not found" });
      }

      await storage.updateDrawing(req.params.id, {
        status: "processing",
      });

      // Simulate AI processing
      setTimeout(async () => {
        await storage.updateDrawing(req.params.id, {
          status: "complete",
          aiProcessed: true,
        });
        
        await generateMockTakeoffs(req.params.id);
      }, 3000);

      res.json({ message: "AI processing started" });
    } catch (error) {
      res.status(500).json({ message: "Failed to start AI processing" });
    }
  });

  // Run selective takeoff
  app.post("/api/drawings/:id/run-takeoff", async (req, res) => {
    try {
      const drawing = await storage.getDrawing(req.params.id);
      if (!drawing) {
        return res.status(404).json({ message: "Drawing not found" });
      }

      const { elementTypes } = req.body;
      if (!elementTypes || !Array.isArray(elementTypes)) {
        return res.status(400).json({ message: "elementTypes array is required" });
      }

      await storage.updateDrawing(req.params.id, {
        status: "processing",
      });

      // Simulate AI processing with selective takeoffs
      setTimeout(async () => {
        await storage.updateDrawing(req.params.id, {
          status: "complete",
          aiProcessed: true,
        });
        
        await generateSelectiveMockTakeoffs(req.params.id, elementTypes);
      }, 2000);

      res.json({ message: "Selective takeoff analysis started", elementTypes });
    } catch (error) {
      res.status(500).json({ message: "Failed to start takeoff analysis" });
    }
  });

  // Serve uploaded files
  app.use("/uploads", (req, res, next) => {
    const filePath = path.join(uploadDir, req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: "File not found" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to generate selective mock takeoff data
async function generateSelectiveMockTakeoffs(drawingId: string, elementTypes: string[]) {
  const storage = getStorage() as IStorage;
  const takeoffTemplates = {
    doors: [
      {
        elementType: "doors",
        elementName: "Interior Door - 36\" x 80\"",
        itemType: "Interior Door",
        quantity: 5,
        width: 36,
        height: 80,
        unit: "each",
        detectedByAi: true,
        costPerUnit: 330,
        totalCost: 1650,
        coordinates: { x: 100, y: 150 },
      },
      {
        elementType: "doors",
        elementName: "Interior Door - 32\" x 80\"",
        itemType: "Interior Door",
        quantity: 2,
        width: 32,
        height: 80,
        unit: "each",
        detectedByAi: true,
        costPerUnit: 310,
        totalCost: 620,
        coordinates: { x: 200, y: 250 },
      }
    ],
    windows: [
      {
        elementType: "windows",
        elementName: "Double Hung Window - 48\" x 60\"",
        itemType: "Double Hung Window",
        quantity: 8,
        width: 48,
        height: 60,
        unit: "each",
        detectedByAi: true,
        costPerUnit: 550,
        totalCost: 4400,
        coordinates: { x: 300, y: 100 },
      }
    ],
    flooring: [
      {
        elementType: "flooring",
        elementName: "Hardwood Flooring",
        itemType: "Hardwood",
        quantity: 1845,
        area: 1845,
        unit: "sq ft",
        detectedByAi: true,
        costPerUnit: 14.5,
        totalCost: 26752.5,
        coordinates: { x: 400, y: 300 },
      },
      {
        elementType: "flooring",
        elementName: "Ceramic Tile",
        itemType: "Tile",
        quantity: 632,
        area: 632,
        unit: "sq ft",
        detectedByAi: true,
        costPerUnit: 12.0,
        totalCost: 7584,
        coordinates: { x: 450, y: 350 },
      }
    ],
    walls: [
      {
        elementType: "walls",
        elementName: "Interior Walls",
        itemType: "Drywall",
        quantity: 2400,
        area: 2400,
        length: 240,
        unit: "sq ft",
        detectedByAi: true,
        costPerUnit: 3.5,
        totalCost: 8400,
        coordinates: { x: 100, y: 500 },
      }
    ],
    electrical: [
      {
        elementType: "electrical",
        elementName: "Electrical Outlets",
        itemType: "Outlet",
        quantity: 24,
        unit: "each",
        detectedByAi: true,
        costPerUnit: 85,
        totalCost: 2040,
        coordinates: { x: 150, y: 400 },
      },
      {
        elementType: "electrical",
        elementName: "Light Fixtures",
        itemType: "Light Fixture",
        quantity: 16,
        unit: "each",
        detectedByAi: true,
        costPerUnit: 150,
        totalCost: 2400,
        coordinates: { x: 250, y: 200 },
      }
    ],
    plumbing: [
      {
        elementType: "plumbing",
        elementName: "Plumbing Fixtures",
        itemType: "Fixture",
        quantity: 8,
        unit: "each",
        detectedByAi: true,
        costPerUnit: 250,
        totalCost: 2000,
        coordinates: { x: 500, y: 300 },
      }
    ],
    hvac: [
      {
        elementType: "hvac",
        elementName: "HVAC System",
        itemType: "System",
        quantity: 1,
        unit: "each",
        detectedByAi: true,
        costPerUnit: 8500,
        totalCost: 8500,
        coordinates: { x: 400, y: 50 },
      }
    ],
    structural: [
      {
        elementType: "structural",
        elementName: "Support Beams",
        itemType: "Beam",
        quantity: 12,
        length: 20,
        unit: "linear ft",
        detectedByAi: true,
        costPerUnit: 45,
        totalCost: 10800,
        coordinates: { x: 300, y: 600 },
      }
    ]
  };

  const takeoffsToCreate = [];
  for (const elementType of elementTypes) {
    const templates = takeoffTemplates[elementType as keyof typeof takeoffTemplates];
    if (templates) {
      takeoffsToCreate.push(...templates.map(template => ({
        ...template,
        drawingId
      })));
    }
  }

  for (const takeoff of takeoffsToCreate) {
    await storage.createTakeoff(takeoff);
  }
}

// Helper function to generate mock takeoff data
async function generateMockTakeoffs(drawingId: string) {
  const mockTakeoffs = [
    {
      drawingId,
      elementType: "doors",
      elementName: "Interior Door (36\")",
      itemType: "Interior Door",
      quantity: 5,
      unit: "each",
      detectedByAi: true,
      costPerUnit: 330,
      totalCost: 1650,
      coordinates: { x: 100, y: 150 },
    },
    {
      drawingId,
      elementType: "doors",
      elementName: "Interior Door (32\")",
      itemType: "Interior Door",
      quantity: 2,
      unit: "each",
      detectedByAi: true,
      costPerUnit: 310,
      totalCost: 620,
      coordinates: { x: 200, y: 250 },
    },
    {
      drawingId,
      elementType: "windows",
      elementName: "Double Hung Window (3'x4')",
      itemType: "Double Hung Window",
      quantity: 8,
      unit: "each",
      detectedByAi: true,
      costPerUnit: 550,
      totalCost: 4400,
      coordinates: { x: 300, y: 100 },
    },
    {
      drawingId,
      elementType: "flooring",
      elementName: "Hardwood",
      itemType: "Hardwood Flooring",
      area: 1845,
      unit: "sq ft",
      detectedByAi: true,
      costPerUnit: 14.5,
      totalCost: 26752.5,
      coordinates: { x: 400, y: 300 },
    },
    {
      drawingId,
      elementType: "flooring",
      elementName: "Tile",
      itemType: "Ceramic Tile",
      area: 632,
      unit: "sq ft",
      detectedByAi: true,
      costPerUnit: 12.0,
      totalCost: 7584,
      coordinates: { x: 450, y: 350 },
    },
    {
      drawingId,
      elementType: "electrical",
      elementName: "Outlets",
      itemType: "Electrical Outlet",
      quantity: 24,
      unit: "each",
      detectedByAi: true,
      costPerUnit: 85,
      totalCost: 2040,
      coordinates: { x: 150, y: 400 },
    },
    {
      drawingId,
      elementType: "electrical",
      elementName: "Light Fixtures",
      itemType: "Light Fixture",
      quantity: 16,
      unit: "each",
      detectedByAi: true,
      costPerUnit: 150,
      totalCost: 2400,
      coordinates: { x: 250, y: 200 },
    },
  ];

  for (const takeoff of mockTakeoffs) {
    await storage.createTakeoff(takeoff);
  }
}
