import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { 
  projects, 
  drawings, 
  takeoffs, 
  materialCosts,
  savedAnalyses,
  tradeClasses,
  productSkus,
  projectPricing,
  estimateTemplates
} from "@shared/schema";
import { 
  type Project, type InsertProject, 
  type Drawing, type InsertDrawing, 
  type Takeoff, type InsertTakeoff, 
  type MaterialCost, type InsertMaterialCost, 
  type SavedAnalysis, type InsertSavedAnalysis,
  type TradeClass, type InsertTradeClass,
  type ProductSku, type InsertProductSku,
  type ProjectPricing, type InsertProjectPricing,
  type EstimateTemplate, type InsertEstimateTemplate
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Projects
  getProject(id: string): Promise<Project | undefined>;
  getProjects(): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  
  // Drawings
  getDrawing(id: string): Promise<Drawing | undefined>;
  getDrawingsByProject(projectId: string): Promise<Drawing[]>;
  createDrawing(drawing: InsertDrawing): Promise<Drawing>;
  updateDrawing(id: string, drawing: Partial<InsertDrawing>): Promise<Drawing | undefined>;
  
  // Takeoffs
  getTakeoff(id: string): Promise<Takeoff | undefined>;
  getTakeoffsByDrawing(drawingId: string): Promise<Takeoff[]>;
  createTakeoff(takeoff: InsertTakeoff): Promise<Takeoff>;
  updateTakeoff(id: string, takeoff: Partial<InsertTakeoff>): Promise<Takeoff | undefined>;
  deleteTakeoff(id: string): Promise<boolean>;
  
  // Material Costs
  getMaterialCosts(): Promise<MaterialCost[]>;
  getMaterialCostsByCategory(category: string): Promise<MaterialCost[]>;
  createMaterialCost(cost: InsertMaterialCost): Promise<MaterialCost>;
  
  // Saved Analyses
  getSavedAnalysis(id: string): Promise<SavedAnalysis | undefined>;
  getSavedAnalysesByProject(projectId: string): Promise<SavedAnalysis[]>;
  createSavedAnalysis(analysis: InsertSavedAnalysis): Promise<SavedAnalysis>;
  updateSavedAnalysis(id: string, analysis: Partial<InsertSavedAnalysis>): Promise<SavedAnalysis | undefined>;
  deleteSavedAnalysis(id: string): Promise<boolean>;

  // Trade Classes
  getTradeClasses(): Promise<TradeClass[]>;
  getTradeClass(id: string): Promise<TradeClass | undefined>;
  createTradeClass(tradeClass: InsertTradeClass): Promise<TradeClass>;
  updateTradeClass(id: string, tradeClass: Partial<InsertTradeClass>): Promise<TradeClass | undefined>;
  deleteTradeClass(id: string): Promise<boolean>;

  // Product SKUs
  getProductSkus(): Promise<ProductSku[]>;
  getProductSkusByTradeClass(tradeClassId: string): Promise<ProductSku[]>;
  getProductSku(id: string): Promise<ProductSku | undefined>;
  searchProductSkus(query: string, tradeClassId?: string): Promise<ProductSku[]>;
  createProductSku(sku: InsertProductSku): Promise<ProductSku>;
  updateProductSku(id: string, sku: Partial<InsertProductSku>): Promise<ProductSku | undefined>;
  deleteProductSku(id: string): Promise<boolean>;

  // Project Pricing
  getProjectPricing(projectId: string): Promise<ProjectPricing[]>;
  getProjectPricingItem(id: string): Promise<ProjectPricing | undefined>;
  createProjectPricing(pricing: InsertProjectPricing): Promise<ProjectPricing>;
  updateProjectPricing(id: string, pricing: Partial<InsertProjectPricing>): Promise<ProjectPricing | undefined>;
  deleteProjectPricing(id: string): Promise<boolean>;

  // Estimate Templates
  getEstimateTemplates(): Promise<EstimateTemplate[]>;
  getEstimateTemplatesByTradeClass(tradeClassId: string): Promise<EstimateTemplate[]>;
  getEstimateTemplate(id: string): Promise<EstimateTemplate | undefined>;
  createEstimateTemplate(template: InsertEstimateTemplate): Promise<EstimateTemplate>;
  updateEstimateTemplate(id: string, template: Partial<InsertEstimateTemplate>): Promise<EstimateTemplate | undefined>;
  deleteEstimateTemplate(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  private initialized = false;

  constructor() {
    // Initialize with sample data asynchronously
    this.initializeSampleData().catch(console.error);
  }

  private async initializeSampleData() {
    try {
      // Check if sample data already exists
      const existingProjects = await db.select().from(projects).limit(1);
      if (existingProjects.length > 0) {
        this.initialized = true;
        return;
      }

    // Sample project
    const [sampleProject] = await db
      .insert(projects)
      .values({
        id: "proj-1",
        name: "Downtown Office Complex",
        description: "Mixed-use commercial building with office spaces and retail on ground floor",
        location: "123 Business Ave, Suite 400",
        client: "Downtown Development LLC",
        status: "active",
      })
      .returning();

    // Sample drawings
    const sampleDrawings = [
      {
        id: "draw-1",
        projectId: sampleProject.id,
        name: "Floor Plan - Level 1",
        filename: "floor-plan-l1.pdf",
        fileUrl: "/uploads/floor-plan-l1.pdf",
        fileType: "application/pdf",
        status: "complete",
        scale: "1/4\" = 1'",
        aiProcessed: true,
      },
      {
        id: "draw-2",
        projectId: sampleProject.id,
        name: "Electrical Plan - Level 1",
        filename: "electrical-l1.pdf",
        fileUrl: "/uploads/electrical-l1.pdf",
        fileType: "application/pdf",
        status: "complete",
        scale: "1/4\" = 1'",
        aiProcessed: true,
      },
      {
        id: "draw-3",
        projectId: sampleProject.id,
        name: "HVAC Layout - Level 1",
        filename: "hvac-l1.pdf",
        fileUrl: "/uploads/hvac-l1.pdf",
        fileType: "application/pdf",
        status: "processing",
        scale: "1/4\" = 1'",
        aiProcessed: false,
      },
    ];
    
    await db.insert(drawings).values(sampleDrawings);

    // Sample takeoffs for the first drawing
    await db.insert(takeoffs).values([
      {
        id: "takeoff-1",
        drawingId: "draw-1",
        elementType: "doors",
        elementName: "Interior Door - 36\" x 80\"",
        itemType: "Interior Door",
        quantity: 12,
        width: 36,
        height: 80,
        unit: "each",
        coordinates: { x: 100, y: 200 },
        detectedByAi: true,
        costPerUnit: 250,
        totalCost: 3000,
      },
      {
        id: "takeoff-2",
        drawingId: "draw-1",
        elementType: "windows",
        elementName: "Double Hung Window - 48\" x 60\"",
        itemType: "Double Hung Window",
        quantity: 8,
        width: 48,
        height: 60,
        unit: "each",
        coordinates: { x: 300, y: 150 },
        detectedByAi: true,
        costPerUnit: 450,
        totalCost: 3600,
      },
      {
        id: "takeoff-3",
        drawingId: "draw-1",
        elementType: "flooring",
        elementName: "Luxury Vinyl Plank",
        itemType: "Vinyl Flooring",
        quantity: 2400,
        area: 2400,
        unit: "sq ft",
        detectedByAi: true,
        costPerUnit: 4.5,
        totalCost: 10800,
      },
      {
        id: "takeoff-4",
        drawingId: "draw-1",
        elementType: "electrical",
        elementName: "Electrical Outlets",
        itemType: "Electrical Outlet",
        quantity: 24,
        unit: "each",
        detectedByAi: true,
        costPerUnit: 85,
        totalCost: 2040,
      }
    ]);

    // Sample material costs
    await db.insert(materialCosts).values([
      {
        id: "cost-1",
        category: "doors",
        itemName: "Interior Door (36\")",
        unit: "each",
        materialCost: 180,
        laborCost: 150,
        description: "Standard hollow core interior door with frame",
      },
      {
        id: "cost-2",
        category: "windows",
        itemName: "Double Hung Window (3'x4')",
        unit: "each",
        materialCost: 350,
        laborCost: 200,
        description: "Standard double hung window with installation",
      },
      {
        id: "cost-3",
        category: "flooring",
        itemName: "Hardwood Flooring",
        unit: "sq ft",
        materialCost: 8.5,
        laborCost: 6.0,
        description: "Oak hardwood flooring with installation",
      },
    ]);

    // Sample trade classes
    await db.insert(tradeClasses).values([
      { id: "trade-1", name: "General Construction", code: "GC", description: "General construction and framing" },
      { id: "trade-2", name: "Electrical", code: "ELEC", description: "Electrical systems and components" },
      { id: "trade-3", name: "Plumbing", code: "PLUMB", description: "Plumbing systems and fixtures" },
      { id: "trade-4", name: "HVAC", code: "HVAC", description: "Heating, ventilation, and air conditioning" },
      { id: "trade-5", name: "Flooring", code: "FLOOR", description: "All types of flooring materials and installation" },
      { id: "trade-6", name: "Windows & Doors", code: "WD", description: "Windows, doors, and related hardware" },
      { id: "trade-7", name: "Roofing", code: "ROOF", description: "Roofing materials and installation" },
      { id: "trade-8", name: "Insulation", code: "INSUL", description: "Insulation materials and installation" },
    ]);

    // Sample product SKUs
    await db.insert(productSkus).values([
      // General Construction
      { id: "sku-1", sku: "LUM-2X4-8", name: "2x4x8 Lumber", tradeClassId: "trade-1", category: "Lumber", unit: "piece", materialCost: 6.50, laborCost: 2.00, description: "Standard 2x4x8 construction lumber" },
      { id: "sku-2", sku: "LUM-2X6-8", name: "2x6x8 Lumber", tradeClassId: "trade-1", category: "Lumber", unit: "piece", materialCost: 9.75, laborCost: 2.50, description: "Standard 2x6x8 construction lumber" },
      { id: "sku-3", sku: "PLY-3/4-4X8", name: "3/4\" Plywood 4x8", tradeClassId: "trade-1", category: "Sheathing", unit: "sheet", materialCost: 58.00, laborCost: 15.00, description: "3/4 inch plywood sheet 4x8 feet" },
      
      // Electrical
      { id: "sku-4", sku: "ELEC-OUT-STD", name: "Standard Electrical Outlet", tradeClassId: "trade-2", category: "Outlets", unit: "each", materialCost: 12.50, laborCost: 45.00, description: "Standard 15A electrical outlet with installation" },
      { id: "sku-5", sku: "ELEC-SW-STD", name: "Standard Light Switch", tradeClassId: "trade-2", category: "Switches", unit: "each", materialCost: 8.75, laborCost: 35.00, description: "Standard single-pole light switch" },
      { id: "sku-6", sku: "WIRE-12-2", name: "12-2 Romex Wire", tradeClassId: "trade-2", category: "Wiring", unit: "ft", materialCost: 0.85, laborCost: 1.25, description: "12 AWG 2-conductor Romex wire" },
      
      // Plumbing
      { id: "sku-7", sku: "PIPE-PVC-4", name: "4\" PVC Pipe", tradeClassId: "trade-3", category: "Pipe", unit: "ft", materialCost: 3.25, laborCost: 8.50, description: "4 inch PVC drain pipe" },
      { id: "sku-8", sku: "FIX-TOILET-STD", name: "Standard Toilet", tradeClassId: "trade-3", category: "Fixtures", unit: "each", materialCost: 285.00, laborCost: 175.00, description: "Standard two-piece toilet with installation" },
      
      // HVAC
      { id: "sku-9", sku: "DUCT-6", name: "6\" Flexible Ductwork", tradeClassId: "trade-4", category: "Ductwork", unit: "ft", materialCost: 4.50, laborCost: 6.25, description: "6 inch flexible HVAC ductwork" },
      { id: "sku-10", sku: "VENT-CEIL", name: "Ceiling Vent Register", tradeClassId: "trade-4", category: "Vents", unit: "each", materialCost: 28.00, laborCost: 45.00, description: "Standard ceiling vent register" },
      
      // Flooring
      { id: "sku-11", sku: "FLOOR-OAK-34", name: "3/4\" Oak Hardwood", tradeClassId: "trade-5", category: "Hardwood", unit: "sq ft", materialCost: 8.50, laborCost: 6.00, description: "3/4 inch solid oak hardwood flooring" },
      { id: "sku-12", sku: "TILE-POR-12X24", name: "12x24 Porcelain Tile", tradeClassId: "trade-5", category: "Tile", unit: "sq ft", materialCost: 4.25, laborCost: 8.75, description: "12x24 inch porcelain floor tile" },
      
      // Windows & Doors
      { id: "sku-13", sku: "WIN-DH-3X4", name: "3x4 Double Hung Window", tradeClassId: "trade-6", category: "Windows", unit: "each", materialCost: 350.00, laborCost: 200.00, description: "3x4 feet double hung vinyl window" },
      { id: "sku-14", sku: "DOOR-INT-32", name: "32\" Interior Door", tradeClassId: "trade-6", category: "Doors", unit: "each", materialCost: 180.00, laborCost: 150.00, description: "32 inch hollow core interior door" },
      
      // Roofing
      { id: "sku-15", sku: "SHIN-ARCH-30", name: "30-Year Architectural Shingles", tradeClassId: "trade-7", category: "Shingles", unit: "sq", materialCost: 125.00, laborCost: 85.00, description: "30-year architectural asphalt shingles per square" },
      
      // Insulation
      { id: "sku-16", sku: "INSUL-FG-R15", name: "R-15 Fiberglass Insulation", tradeClassId: "trade-8", category: "Batts", unit: "sq ft", materialCost: 1.25, laborCost: 0.75, description: "R-15 fiberglass batt insulation" },
    ]);
    
    this.initialized = true;
    console.log("Sample data initialized successfully");
  } catch (error) {
    console.error("Failed to initialize sample data:", error);
    // Continue without sample data
  }
}

  // Projects
  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values({ ...insertProject, id: randomUUID() })
      .returning();
    return project;
  }

  async updateProject(id: string, updateData: Partial<InsertProject>): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: string): Promise<boolean> {
    // Delete related takeoffs first
    const projectDrawings = await db.select().from(drawings).where(eq(drawings.projectId, id));
    for (const drawing of projectDrawings) {
      await db.delete(takeoffs).where(eq(takeoffs.drawingId, drawing.id));
    }
    
    // Delete related drawings
    await db.delete(drawings).where(eq(drawings.projectId, id));
    
    // Delete the project
    const result = await db.delete(projects).where(eq(projects.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Drawings
  async getDrawing(id: string): Promise<Drawing | undefined> {
    const [drawing] = await db.select().from(drawings).where(eq(drawings.id, id));
    return drawing;
  }

  async getDrawingsByProject(projectId: string): Promise<Drawing[]> {
    return await db.select().from(drawings).where(eq(drawings.projectId, projectId));
  }

  async createDrawing(insertDrawing: InsertDrawing): Promise<Drawing> {
    const [drawing] = await db
      .insert(drawings)
      .values({ ...insertDrawing, id: randomUUID() })
      .returning();
    return drawing;
  }

  async updateDrawing(id: string, updateData: Partial<InsertDrawing>): Promise<Drawing | undefined> {
    const [drawing] = await db
      .update(drawings)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(drawings.id, id))
      .returning();
    return drawing;
  }

  // Takeoffs
  async getTakeoff(id: string): Promise<Takeoff | undefined> {
    const [takeoff] = await db.select().from(takeoffs).where(eq(takeoffs.id, id));
    return takeoff;
  }

  async getTakeoffsByDrawing(drawingId: string): Promise<Takeoff[]> {
    return await db.select().from(takeoffs).where(eq(takeoffs.drawingId, drawingId));
  }

  async createTakeoff(insertTakeoff: InsertTakeoff): Promise<Takeoff> {
    const [takeoff] = await db
      .insert(takeoffs)
      .values({ ...insertTakeoff, id: randomUUID() })
      .returning();
    return takeoff;
  }

  async updateTakeoff(id: string, updateData: Partial<InsertTakeoff>): Promise<Takeoff | undefined> {
    const [takeoff] = await db
      .update(takeoffs)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(takeoffs.id, id))
      .returning();
    return takeoff;
  }

  async deleteTakeoff(id: string): Promise<boolean> {
    const result = await db.delete(takeoffs).where(eq(takeoffs.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Material Costs
  async getMaterialCosts(): Promise<MaterialCost[]> {
    return await db.select().from(materialCosts);
  }

  async getMaterialCostsByCategory(category: string): Promise<MaterialCost[]> {
    return await db.select().from(materialCosts).where(eq(materialCosts.category, category));
  }

  async createMaterialCost(insertCost: InsertMaterialCost): Promise<MaterialCost> {
    const [cost] = await db
      .insert(materialCosts)
      .values({ ...insertCost, id: randomUUID() })
      .returning();
    return cost;
  }

  // Saved Analyses
  async getSavedAnalysis(id: string): Promise<SavedAnalysis | undefined> {
    const [analysis] = await db.select().from(savedAnalyses).where(eq(savedAnalyses.id, id));
    return analysis;
  }

  async getSavedAnalysesByProject(projectId: string): Promise<SavedAnalysis[]> {
    return await db.select().from(savedAnalyses).where(eq(savedAnalyses.projectId, projectId));
  }

  async createSavedAnalysis(insertAnalysis: InsertSavedAnalysis): Promise<SavedAnalysis> {
    const [analysis] = await db
      .insert(savedAnalyses)
      .values({ ...insertAnalysis, id: randomUUID() })
      .returning();
    return analysis;
  }

  async updateSavedAnalysis(id: string, updateData: Partial<InsertSavedAnalysis>): Promise<SavedAnalysis | undefined> {
    const [analysis] = await db
      .update(savedAnalyses)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(savedAnalyses.id, id))
      .returning();
    return analysis;
  }

  async deleteSavedAnalysis(id: string): Promise<boolean> {
    const result = await db.delete(savedAnalyses).where(eq(savedAnalyses.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Trade Classes
  async getTradeClasses(): Promise<TradeClass[]> {
    return await db.select().from(tradeClasses);
  }

  async getTradeClass(id: string): Promise<TradeClass | undefined> {
    const [tradeClass] = await db.select().from(tradeClasses).where(eq(tradeClasses.id, id));
    return tradeClass;
  }

  async createTradeClass(insertTradeClass: InsertTradeClass): Promise<TradeClass> {
    const [tradeClass] = await db
      .insert(tradeClasses)
      .values({ ...insertTradeClass, id: randomUUID() })
      .returning();
    return tradeClass;
  }

  async updateTradeClass(id: string, updateData: Partial<InsertTradeClass>): Promise<TradeClass | undefined> {
    const [tradeClass] = await db
      .update(tradeClasses)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(tradeClasses.id, id))
      .returning();
    return tradeClass;
  }

  async deleteTradeClass(id: string): Promise<boolean> {
    const result = await db.delete(tradeClasses).where(eq(tradeClasses.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Product SKUs
  async getProductSkus(): Promise<ProductSku[]> {
    return await db.select().from(productSkus);
  }

  async getProductSkusByTradeClass(tradeClassId: string): Promise<ProductSku[]> {
    return await db.select().from(productSkus).where(eq(productSkus.tradeClassId, tradeClassId));
  }

  async getProductSku(id: string): Promise<ProductSku | undefined> {
    const [sku] = await db.select().from(productSkus).where(eq(productSkus.id, id));
    return sku;
  }

  async searchProductSkus(query: string, tradeClassId?: string): Promise<ProductSku[]> {
    let conditions = sql`${productSkus.name} ILIKE ${'%' + query + '%'} OR ${productSkus.description} ILIKE ${'%' + query + '%'} OR ${productSkus.sku} ILIKE ${'%' + query + '%'}`;
    
    if (tradeClassId) {
      conditions = sql`${conditions} AND ${productSkus.tradeClassId} = ${tradeClassId}`;
    }
    
    return await db.select().from(productSkus).where(conditions);
  }

  async createProductSku(insertSku: InsertProductSku): Promise<ProductSku> {
    const [sku] = await db
      .insert(productSkus)
      .values({ ...insertSku, id: randomUUID() })
      .returning();
    return sku;
  }

  async updateProductSku(id: string, updateData: Partial<InsertProductSku>): Promise<ProductSku | undefined> {
    const [sku] = await db
      .update(productSkus)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(productSkus.id, id))
      .returning();
    return sku;
  }

  async deleteProductSku(id: string): Promise<boolean> {
    const result = await db.delete(productSkus).where(eq(productSkus.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Project Pricing
  async getProjectPricing(projectId: string): Promise<ProjectPricing[]> {
    return await db.select().from(projectPricing).where(eq(projectPricing.projectId, projectId));
  }

  async getProjectPricingItem(id: string): Promise<ProjectPricing | undefined> {
    const [pricing] = await db.select().from(projectPricing).where(eq(projectPricing.id, id));
    return pricing;
  }

  async createProjectPricing(insertPricing: InsertProjectPricing): Promise<ProjectPricing> {
    const [pricing] = await db
      .insert(projectPricing)
      .values({ ...insertPricing, id: randomUUID() })
      .returning();
    return pricing;
  }

  async updateProjectPricing(id: string, updateData: Partial<InsertProjectPricing>): Promise<ProjectPricing | undefined> {
    const [pricing] = await db
      .update(projectPricing)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(projectPricing.id, id))
      .returning();
    return pricing;
  }

  async deleteProjectPricing(id: string): Promise<boolean> {
    const result = await db.delete(projectPricing).where(eq(projectPricing.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Estimate Templates
  async getEstimateTemplates(): Promise<EstimateTemplate[]> {
    return await db.select().from(estimateTemplates);
  }

  async getEstimateTemplatesByTradeClass(tradeClassId: string): Promise<EstimateTemplate[]> {
    return await db.select().from(estimateTemplates).where(eq(estimateTemplates.tradeClassId, tradeClassId));
  }

  async getEstimateTemplate(id: string): Promise<EstimateTemplate | undefined> {
    const [template] = await db.select().from(estimateTemplates).where(eq(estimateTemplates.id, id));
    return template;
  }

  async createEstimateTemplate(insertTemplate: InsertEstimateTemplate): Promise<EstimateTemplate> {
    const [template] = await db
      .insert(estimateTemplates)
      .values({ ...insertTemplate, id: randomUUID() })
      .returning();
    return template;
  }

  async updateEstimateTemplate(id: string, updateData: Partial<InsertEstimateTemplate>): Promise<EstimateTemplate | undefined> {
    const [template] = await db
      .update(estimateTemplates)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(estimateTemplates.id, id))
      .returning();
    return template;
  }

  async deleteEstimateTemplate(id: string): Promise<boolean> {
    const result = await db.delete(estimateTemplates).where(eq(estimateTemplates.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new DatabaseStorage();
