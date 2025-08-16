import type { Express, Request } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertProjectSchema, 
  insertDrawingSchema, 
  insertTakeoffSchema, 
  insertSavedAnalysisSchema,
  insertTradeClassSchema,
  insertProductSkuSchema,
  insertProjectPricingSchema,
  insertEstimateTemplateSchema
} from "@shared/schema";
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
  // Serve uploaded files
  app.use('/uploads', express.static(uploadDir));
  
  // General file upload endpoint
  app.post("/api/upload", upload.single('file'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ 
        fileUrl,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

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

  app.post("/api/projects/:projectId/drawings", async (req, res) => {
    try {
      const drawingData = insertDrawingSchema.parse({
        ...req.body,
        projectId: req.params.projectId
      });
      const drawing = await storage.createDrawing(drawingData);
      res.status(201).json(drawing);
    } catch (error) {
      console.error("Drawing creation error:", error);
      res.status(400).json({ message: "Invalid drawing data" });
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

  app.patch("/api/takeoffs/:id", async (req, res) => {
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

  // Project-specific routes
  app.get("/api/projects/:id/drawings", async (req, res) => {
    try {
      const drawings = await storage.getDrawingsByProject(req.params.id);
      res.json(drawings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project drawings" });
    }
  });

  app.get("/api/projects/:id/takeoffs", async (req, res) => {
    try {
      const drawings = await storage.getDrawingsByProject(req.params.id);
      let allTakeoffs: any[] = [];
      for (const drawing of drawings) {
        const takeoffs = await storage.getTakeoffsByDrawing(drawing.id);
        allTakeoffs = allTakeoffs.concat(takeoffs);
      }
      res.json(allTakeoffs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project takeoffs" });
    }
  });

  app.get("/api/projects/:id/saved-analyses", async (req, res) => {
    try {
      const analyses = await storage.getSavedAnalysesByProject(req.params.id);
      res.json(analyses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch saved analyses" });
    }
  });

  app.post("/api/projects/:id/save-analysis", async (req, res) => {
    try {
      const analysisData = insertSavedAnalysisSchema.parse({
        ...req.body,
        projectId: req.params.id
      });
      const analysis = await storage.createSavedAnalysis(analysisData);
      res.status(201).json(analysis);
    } catch (error) {
      res.status(400).json({ message: "Invalid analysis data" });
    }
  });

  // Saved analysis routes
  app.get("/api/saved-analyses/:id", async (req, res) => {
    try {
      const analysis = await storage.getSavedAnalysis(req.params.id);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analysis" });
    }
  });

  app.patch("/api/saved-analyses/:id", async (req, res) => {
    try {
      const updateData = insertSavedAnalysisSchema.partial().parse(req.body);
      const analysis = await storage.updateSavedAnalysis(req.params.id, updateData);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }
      res.json(analysis);
    } catch (error) {
      res.status(400).json({ message: "Invalid analysis data" });
    }
  });

  app.delete("/api/saved-analyses/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteSavedAnalysis(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Analysis not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete analysis" });
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

  // Enhanced LLM-powered takeoff analysis
  app.post("/api/drawings/:id/run-llm-takeoff", async (req, res) => {
    try {
      const drawing = await storage.getDrawing(req.params.id);
      if (!drawing) {
        return res.status(404).json({ message: "Drawing not found" });
      }

      const { elementTypes, llmModel, enhancedAnalysis } = req.body;
      if (!elementTypes || !Array.isArray(elementTypes)) {
        return res.status(400).json({ message: "elementTypes array is required" });
      }

      await storage.updateDrawing(req.params.id, {
        status: "processing",
        aiProcessed: false,
      });

      // Simulate enhanced LLM processing
      setTimeout(async () => {
        await storage.updateDrawing(req.params.id, {
          status: "complete",
          aiProcessed: true,
        });
        
        // Generate more detailed takeoffs with LLM processing
        await generateEnhancedLLMTakeoffs(req.params.id, elementTypes);
      }, 5000); // Longer processing time for LLM

      res.json({ 
        message: "LLM takeoff analysis started", 
        elementTypes,
        llmModel: llmModel || "floorplan-analyzer-v2",
        estimatedTime: "3-5 minutes",
        elementsProcessed: elementTypes.length * Math.floor(Math.random() * 5 + 3),
        averageConfidence: Math.random() * 0.2 + 0.85
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to start LLM analysis" });
    }
  });

  // Reprocess individual takeoff with enhanced accuracy
  app.post("/api/takeoffs/:id/reprocess", async (req, res) => {
    try {
      const { useAdvancedLLM, recalculateCosts } = req.body;
      
      // Simulate reprocessing with enhanced accuracy
      setTimeout(async () => {
        // In a real implementation, this would:
        // 1. Re-analyze the specific element with advanced LLM
        // 2. Update coordinates and dimensions
        // 3. Recalculate costs with current material prices
        // 4. Improve confidence scores
      }, 2000);

      res.json({ 
        message: "Takeoff reprocessing started",
        useAdvancedLLM,
        recalculateCosts,
        estimatedTime: "30-60 seconds"
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to reprocess takeoff" });
    }
  });

  // Trade Classes routes
  app.get("/api/trade-classes", async (req, res) => {
    try {
      const tradeClasses = await storage.getTradeClasses();
      res.json(tradeClasses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trade classes" });
    }
  });

  app.get("/api/trade-classes/:id", async (req, res) => {
    try {
      const tradeClass = await storage.getTradeClass(req.params.id);
      if (!tradeClass) {
        return res.status(404).json({ message: "Trade class not found" });
      }
      res.json(tradeClass);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trade class" });
    }
  });

  app.post("/api/trade-classes", async (req, res) => {
    try {
      const tradeClassData = insertTradeClassSchema.parse(req.body);
      const tradeClass = await storage.createTradeClass(tradeClassData);
      res.status(201).json(tradeClass);
    } catch (error) {
      res.status(400).json({ message: "Invalid trade class data" });
    }
  });

  app.patch("/api/trade-classes/:id", async (req, res) => {
    try {
      const updateData = insertTradeClassSchema.partial().parse(req.body);
      const tradeClass = await storage.updateTradeClass(req.params.id, updateData);
      if (!tradeClass) {
        return res.status(404).json({ message: "Trade class not found" });
      }
      res.json(tradeClass);
    } catch (error) {
      res.status(400).json({ message: "Invalid trade class data" });
    }
  });

  app.delete("/api/trade-classes/:id", async (req, res) => {
    try {
      const success = await storage.deleteTradeClass(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Trade class not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete trade class" });
    }
  });

  // Product SKUs routes
  app.get("/api/product-skus", async (req, res) => {
    try {
      const { trade_class_id, search } = req.query;
      
      if (search) {
        const skus = await storage.searchProductSkus(search as string, trade_class_id as string);
        res.json(skus);
      } else if (trade_class_id) {
        const skus = await storage.getProductSkusByTradeClass(trade_class_id as string);
        res.json(skus);
      } else {
        const skus = await storage.getProductSkus();
        res.json(skus);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product SKUs" });
    }
  });

  app.get("/api/product-skus/:id", async (req, res) => {
    try {
      const sku = await storage.getProductSku(req.params.id);
      if (!sku) {
        return res.status(404).json({ message: "Product SKU not found" });
      }
      res.json(sku);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product SKU" });
    }
  });

  app.post("/api/product-skus", async (req, res) => {
    try {
      const skuData = insertProductSkuSchema.parse(req.body);
      const sku = await storage.createProductSku(skuData);
      res.status(201).json(sku);
    } catch (error) {
      res.status(400).json({ message: "Invalid product SKU data" });
    }
  });

  app.patch("/api/product-skus/:id", async (req, res) => {
    try {
      const updateData = insertProductSkuSchema.partial().parse(req.body);
      const sku = await storage.updateProductSku(req.params.id, updateData);
      if (!sku) {
        return res.status(404).json({ message: "Product SKU not found" });
      }
      res.json(sku);
    } catch (error) {
      res.status(400).json({ message: "Invalid product SKU data" });
    }
  });

  app.delete("/api/product-skus/:id", async (req, res) => {
    try {
      const success = await storage.deleteProductSku(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Product SKU not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product SKU" });
    }
  });

  // Project Pricing routes
  app.get("/api/projects/:projectId/pricing", async (req, res) => {
    try {
      const pricing = await storage.getProjectPricing(req.params.projectId);
      res.json(pricing);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project pricing" });
    }
  });

  app.post("/api/projects/:projectId/pricing", async (req, res) => {
    try {
      const pricingData = insertProjectPricingSchema.parse({
        ...req.body,
        projectId: req.params.projectId
      });
      const pricing = await storage.createProjectPricing(pricingData);
      res.status(201).json(pricing);
    } catch (error) {
      res.status(400).json({ message: "Invalid project pricing data" });
    }
  });

  app.patch("/api/project-pricing/:id", async (req, res) => {
    try {
      const updateData = insertProjectPricingSchema.partial().parse(req.body);
      const pricing = await storage.updateProjectPricing(req.params.id, updateData);
      if (!pricing) {
        return res.status(404).json({ message: "Project pricing item not found" });
      }
      res.json(pricing);
    } catch (error) {
      res.status(400).json({ message: "Invalid project pricing data" });
    }
  });

  app.delete("/api/project-pricing/:id", async (req, res) => {
    try {
      const success = await storage.deleteProjectPricing(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Project pricing item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project pricing item" });
    }
  });

  // Estimate Templates routes
  app.get("/api/estimate-templates", async (req, res) => {
    try {
      const { trade_class_id } = req.query;
      
      if (trade_class_id) {
        const templates = await storage.getEstimateTemplatesByTradeClass(trade_class_id as string);
        res.json(templates);
      } else {
        const templates = await storage.getEstimateTemplates();
        res.json(templates);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch estimate templates" });
    }
  });

  app.get("/api/estimate-templates/:id", async (req, res) => {
    try {
      const template = await storage.getEstimateTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Estimate template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch estimate template" });
    }
  });

  app.post("/api/estimate-templates", async (req, res) => {
    try {
      const templateData = insertEstimateTemplateSchema.parse(req.body);
      const template = await storage.createEstimateTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      res.status(400).json({ message: "Invalid estimate template data" });
    }
  });

  app.patch("/api/estimate-templates/:id", async (req, res) => {
    try {
      const updateData = insertEstimateTemplateSchema.partial().parse(req.body);
      const template = await storage.updateEstimateTemplate(req.params.id, updateData);
      if (!template) {
        return res.status(404).json({ message: "Estimate template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(400).json({ message: "Invalid estimate template data" });
    }
  });

  app.delete("/api/estimate-templates/:id", async (req, res) => {
    try {
      const success = await storage.deleteEstimateTemplate(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Estimate template not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete estimate template" });
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
async function generateEnhancedLLMTakeoffs(drawingId: string, elementTypes: string[]) {
  // Enhanced LLM-based takeoff generation with higher accuracy and detail
  const enhancedTakeoffData: Record<string, any[]> = {
    doors: [
      {
        elementType: "doors",
        elementName: "Entry Door - 36\" x 80\" Mahogany",
        itemType: "Entry Door",
        quantity: 1,
        width: 36,
        height: 80,
        unit: "each",
        detectedByAi: true,
        costPerUnit: 850,
        totalCost: 850,
        coordinates: { x: 120, y: 150, confidence: 0.94 },
      },
      {
        elementType: "doors",
        elementName: "Interior Door - 32\" x 80\" Hollow Core",
        itemType: "Interior Door",
        quantity: 4,
        width: 32,
        height: 80,
        unit: "each",
        detectedByAi: true,
        costPerUnit: 285,
        totalCost: 1140,
        coordinates: { x: 200, y: 250, confidence: 0.91 },
      }
    ],
    windows: [
      {
        elementType: "windows",
        elementName: "Double Hung Window - 48\" x 60\" Vinyl",
        itemType: "Double Hung Window",
        quantity: 6,
        width: 48,
        height: 60,
        unit: "each",
        detectedByAi: true,
        costPerUnit: 485,
        totalCost: 2910,
        coordinates: { x: 300, y: 100, confidence: 0.89 },
      },
      {
        elementType: "windows",
        elementName: "Picture Window - 72\" x 48\" Fixed",
        itemType: "Picture Window",
        quantity: 2,
        width: 72,
        height: 48,
        unit: "each",
        detectedByAi: true,
        costPerUnit: 720,
        totalCost: 1440,
        coordinates: { x: 350, y: 120, confidence: 0.93 },
      }
    ],
    flooring: [
      {
        elementType: "flooring",
        elementName: "Oak Hardwood Flooring - 3/4\" Solid",
        itemType: "Hardwood",
        quantity: 2100,
        area: 2100,
        unit: "sq ft",
        detectedByAi: true,
        costPerUnit: 16.5,
        totalCost: 34650,
        coordinates: { x: 400, y: 300, confidence: 0.96 },
      },
      {
        elementType: "flooring",
        elementName: "Porcelain Tile - 12\"x24\" Rectified",
        itemType: "Tile",
        quantity: 850,
        area: 850,
        unit: "sq ft",
        detectedByAi: true,
        costPerUnit: 14.25,
        totalCost: 12112.5,
        coordinates: { x: 450, y: 350, confidence: 0.92 },
      }
    ],
    walls: [
      {
        elementType: "walls",
        elementName: "Interior Walls - 1/2\" Drywall",
        itemType: "Drywall",
        quantity: 2640,
        area: 2640,
        length: 264,
        unit: "sq ft",
        detectedByAi: true,
        costPerUnit: 4.25,
        totalCost: 11220,
        coordinates: { x: 100, y: 500, confidence: 0.88 },
      }
    ],
    electrical: [
      {
        elementType: "electrical",
        elementName: "GFCI Outlets - 20A Residential",
        itemType: "GFCI Outlet",
        quantity: 18,
        unit: "each",
        detectedByAi: true,
        costPerUnit: 95,
        totalCost: 1710,
        coordinates: { x: 150, y: 400, confidence: 0.87 },
      },
      {
        elementType: "electrical",
        elementName: "LED Recessed Lights - 6\" IC Rated",
        itemType: "Recessed Light",
        quantity: 22,
        unit: "each",
        detectedByAi: true,
        costPerUnit: 125,
        totalCost: 2750,
        coordinates: { x: 250, y: 200, confidence: 0.90 },
      }
    ],
    plumbing: [
      {
        elementType: "plumbing",
        elementName: "Kitchen Sink - Undermount Stainless",
        itemType: "Kitchen Sink",
        quantity: 1,
        unit: "each",
        detectedByAi: true,
        costPerUnit: 485,
        totalCost: 485,
        coordinates: { x: 180, y: 320, confidence: 0.95 },
      },
      {
        elementType: "plumbing",
        elementName: "Bathroom Vanity Sink - Ceramic",
        itemType: "Vanity Sink",
        quantity: 3,
        unit: "each",
        detectedByAi: true,
        costPerUnit: 285,
        totalCost: 855,
        coordinates: { x: 220, y: 380, confidence: 0.88 },
      }
    ],
    hvac: [
      {
        elementType: "hvac",
        elementName: "Central Air Return - 20\"x25\"",
        itemType: "Air Return",
        quantity: 3,
        unit: "each",
        detectedByAi: true,
        costPerUnit: 145,
        totalCost: 435,
        coordinates: { x: 160, y: 280, confidence: 0.86 },
      }
    ],
    structural: [
      {
        elementType: "structural",
        elementName: "Load Bearing Beam - LVL 11-7/8\"",
        itemType: "LVL Beam",
        quantity: 4,
        length: 16,
        unit: "linear ft",
        detectedByAi: true,
        costPerUnit: 28.5,
        totalCost: 1824,
        coordinates: { x: 300, y: 450, confidence: 0.91 },
      }
    ]
  };

  // Create takeoffs for requested element types
  for (const elementType of elementTypes) {
    if (enhancedTakeoffData[elementType]) {
      for (const takeoffData of enhancedTakeoffData[elementType]) {
        await storage.createTakeoff({
          drawingId,
          ...takeoffData,
        });
      }
    }
  }
}

async function generateSelectiveMockTakeoffs(drawingId: string, elementTypes: string[]) {
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
