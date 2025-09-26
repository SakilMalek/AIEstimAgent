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
  estimateTemplates,
  regionalCostDatabase,
  suppliers,
  materialPricing,
  changeOrders,
  profitMarginSettings,
  costHistory,
  costEscalation
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
  type EstimateTemplate, type InsertEstimateTemplate,
  type RegionalCostDatabase, type InsertRegionalCostDatabase,
  type Supplier, type InsertSupplier,
  type MaterialPricing, type InsertMaterialPricing,
  type ChangeOrder, type InsertChangeOrder,
  type ProfitMarginSettings, type InsertProfitMarginSettings,
  type CostHistory, type InsertCostHistory,
  type CostEscalation, type InsertCostEscalation
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

  // Regional Cost Database
  getRegionalCostData(): Promise<RegionalCostDatabase[]>;
  getRegionalCostDataByLocation(region?: string, state?: string, zipCode?: string): Promise<RegionalCostDatabase[]>;
  createRegionalCostData(data: InsertRegionalCostDatabase): Promise<RegionalCostDatabase>;
  updateRegionalCostData(id: string, data: Partial<InsertRegionalCostDatabase>): Promise<RegionalCostDatabase | undefined>;

  // Supplier Management
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  getSuppliersBySpecialty(specialty: string): Promise<Supplier[]>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: string): Promise<boolean>;

  // Material Pricing
  getMaterialPricing(): Promise<MaterialPricing[]>;
  getMaterialPricingBySku(skuId: string): Promise<MaterialPricing[]>;
  getMaterialPricingBySupplier(supplierId: string): Promise<MaterialPricing[]>;
  getBestPriceForSku(skuId: string): Promise<MaterialPricing | undefined>;
  createMaterialPricing(pricing: InsertMaterialPricing): Promise<MaterialPricing>;
  updateMaterialPricing(id: string, pricing: Partial<InsertMaterialPricing>): Promise<MaterialPricing | undefined>;

  // Change Orders
  getChangeOrders(): Promise<ChangeOrder[]>;
  getChangeOrdersByProject(projectId: string): Promise<ChangeOrder[]>;
  getChangeOrder(id: string): Promise<ChangeOrder | undefined>;
  createChangeOrder(changeOrder: InsertChangeOrder): Promise<ChangeOrder>;
  updateChangeOrder(id: string, changeOrder: Partial<InsertChangeOrder>): Promise<ChangeOrder | undefined>;
  deleteChangeOrder(id: string): Promise<boolean>;

  // Profit Margin Settings
  getProfitMarginSettings(): Promise<ProfitMarginSettings[]>;
  getProfitMarginSettingsByScope(scope: string, scopeId?: string): Promise<ProfitMarginSettings[]>;
  createProfitMarginSettings(settings: InsertProfitMarginSettings): Promise<ProfitMarginSettings>;
  updateProfitMarginSettings(id: string, settings: Partial<InsertProfitMarginSettings>): Promise<ProfitMarginSettings | undefined>;

  // Cost History and Trending
  getCostHistory(): Promise<CostHistory[]>;
  getCostHistoryBySku(skuId: string): Promise<CostHistory[]>;
  getCostTrend(skuId: string, days: number): Promise<CostHistory[]>;
  createCostHistory(history: InsertCostHistory): Promise<CostHistory>;

  // Cost Escalation
  getCostEscalation(): Promise<CostEscalation[]>;
  getCostEscalationByProject(projectId: string): Promise<CostEscalation[]>;
  getActiveCostEscalation(projectId: string): Promise<CostEscalation[]>;
  createCostEscalation(escalation: InsertCostEscalation): Promise<CostEscalation>;
  updateCostEscalation(id: string, escalation: Partial<InsertCostEscalation>): Promise<CostEscalation | undefined>;
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
    // Store original values if not already stored and this is the first manual edit
    if (updateData.manuallyEdited && !updateData.originalQuantity) {
      const existingTakeoff = await this.getTakeoff(id);
      if (existingTakeoff && !existingTakeoff.manuallyEdited) {
        updateData.originalQuantity = existingTakeoff.quantity;
        updateData.originalArea = existingTakeoff.area;
        updateData.originalLength = existingTakeoff.length;
        updateData.originalCostPerUnit = existingTakeoff.costPerUnit;
        updateData.originalTotalCost = existingTakeoff.totalCost;
      }
    }

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

  // Regional Cost Database Methods
  async getRegionalCostData(): Promise<RegionalCostDatabase[]> {
    return await db.select().from(regionalCostDatabase);
  }

  async getRegionalCostDataByLocation(region?: string, state?: string, zipCode?: string): Promise<RegionalCostDatabase[]> {
    let query = db.select().from(regionalCostDatabase);
    
    if (region) {
      query = query.where(eq(regionalCostDatabase.region, region));
    }
    if (state) {
      query = query.where(eq(regionalCostDatabase.state, state));
    }
    if (zipCode) {
      query = query.where(eq(regionalCostDatabase.zipCode, zipCode));
    }

    return await query;
  }

  async createRegionalCostData(data: InsertRegionalCostDatabase): Promise<RegionalCostDatabase> {
    const [result] = await db.insert(regionalCostDatabase).values(data).returning();
    return result;
  }

  async updateRegionalCostData(id: string, data: Partial<InsertRegionalCostDatabase>): Promise<RegionalCostDatabase | undefined> {
    const [result] = await db.update(regionalCostDatabase)
      .set({ ...data, lastUpdated: new Date() })
      .where(eq(regionalCostDatabase.id, id))
      .returning();
    return result;
  }

  // Supplier Management Methods
  async getSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers).where(eq(suppliers.isActive, true));
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    const [result] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return result;
  }

  async getSuppliersBySpecialty(specialty: string): Promise<Supplier[]> {
    return await db.select().from(suppliers)
      .where(sql`${suppliers.specialties} @> ${JSON.stringify([specialty])}`);
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const [result] = await db.insert(suppliers).values(supplier).returning();
    return result;
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const [result] = await db.update(suppliers)
      .set({ ...supplier, updatedAt: new Date() })
      .where(eq(suppliers.id, id))
      .returning();
    return result;
  }

  async deleteSupplier(id: string): Promise<boolean> {
    const result = await db.update(suppliers)
      .set({ isActive: false })
      .where(eq(suppliers.id, id));
    return result.rowCount > 0;
  }

  // Material Pricing Methods
  async getMaterialPricing(): Promise<MaterialPricing[]> {
    return await db.select().from(materialPricing);
  }

  async getMaterialPricingBySku(skuId: string): Promise<MaterialPricing[]> {
    return await db.select().from(materialPricing)
      .where(eq(materialPricing.skuId, skuId))
      .orderBy(materialPricing.currentPrice);
  }

  async getMaterialPricingBySupplier(supplierId: string): Promise<MaterialPricing[]> {
    return await db.select().from(materialPricing)
      .where(eq(materialPricing.supplierId, supplierId));
  }

  async getBestPriceForSku(skuId: string): Promise<MaterialPricing | undefined> {
    const [result] = await db.select().from(materialPricing)
      .where(eq(materialPricing.skuId, skuId))
      .orderBy(materialPricing.currentPrice)
      .limit(1);
    return result;
  }

  async createMaterialPricing(pricing: InsertMaterialPricing): Promise<MaterialPricing> {
    const [result] = await db.insert(materialPricing).values(pricing).returning();
    return result;
  }

  async updateMaterialPricing(id: string, pricing: Partial<InsertMaterialPricing>): Promise<MaterialPricing | undefined> {
    const [result] = await db.update(materialPricing)
      .set({ ...pricing, lastUpdated: new Date() })
      .where(eq(materialPricing.id, id))
      .returning();
    return result;
  }

  // Change Order Methods
  async getChangeOrders(): Promise<ChangeOrder[]> {
    return await db.select().from(changeOrders);
  }

  async getChangeOrdersByProject(projectId: string): Promise<ChangeOrder[]> {
    return await db.select().from(changeOrders)
      .where(eq(changeOrders.projectId, projectId))
      .orderBy(changeOrders.createdAt);
  }

  async getChangeOrder(id: string): Promise<ChangeOrder | undefined> {
    const [result] = await db.select().from(changeOrders).where(eq(changeOrders.id, id));
    return result;
  }

  async createChangeOrder(changeOrder: InsertChangeOrder): Promise<ChangeOrder> {
    // Generate change order number if not provided
    if (!changeOrder.changeOrderNumber) {
      const projectChangeOrders = await this.getChangeOrdersByProject(changeOrder.projectId);
      changeOrder.changeOrderNumber = `CO-${String(projectChangeOrders.length + 1).padStart(3, '0')}`;
    }

    const [result] = await db.insert(changeOrders).values(changeOrder).returning();
    return result;
  }

  async updateChangeOrder(id: string, changeOrder: Partial<InsertChangeOrder>): Promise<ChangeOrder | undefined> {
    const [result] = await db.update(changeOrders)
      .set({ ...changeOrder, updatedAt: new Date() })
      .where(eq(changeOrders.id, id))
      .returning();
    return result;
  }

  async deleteChangeOrder(id: string): Promise<boolean> {
    const result = await db.delete(changeOrders).where(eq(changeOrders.id, id));
    return result.rowCount > 0;
  }

  // Profit Margin Settings Methods
  async getProfitMarginSettings(): Promise<ProfitMarginSettings[]> {
    return await db.select().from(profitMarginSettings)
      .where(eq(profitMarginSettings.isActive, true));
  }

  async getProfitMarginSettingsByScope(scope: string, scopeId?: string): Promise<ProfitMarginSettings[]> {
    let query = db.select().from(profitMarginSettings)
      .where(eq(profitMarginSettings.scope, scope));

    if (scopeId) {
      if (scope === 'project') {
        query = query.where(eq(profitMarginSettings.projectId, scopeId));
      } else if (scope === 'trade_class') {
        query = query.where(eq(profitMarginSettings.tradeClassId, scopeId));
      }
    }

    return await query.where(eq(profitMarginSettings.isActive, true));
  }

  async createProfitMarginSettings(settings: InsertProfitMarginSettings): Promise<ProfitMarginSettings> {
    const [result] = await db.insert(profitMarginSettings).values(settings).returning();
    return result;
  }

  async updateProfitMarginSettings(id: string, settings: Partial<InsertProfitMarginSettings>): Promise<ProfitMarginSettings | undefined> {
    const [result] = await db.update(profitMarginSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(profitMarginSettings.id, id))
      .returning();
    return result;
  }

  // Cost History Methods
  async getCostHistory(): Promise<CostHistory[]> {
    return await db.select().from(costHistory)
      .orderBy(costHistory.recordDate);
  }

  async getCostHistoryBySku(skuId: string): Promise<CostHistory[]> {
    return await db.select().from(costHistory)
      .where(eq(costHistory.skuId, skuId))
      .orderBy(costHistory.recordDate);
  }

  async getCostTrend(skuId: string, days: number): Promise<CostHistory[]> {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    return await db.select().from(costHistory)
      .where(eq(costHistory.skuId, skuId))
      .where(sql`${costHistory.recordDate} >= ${dateThreshold}`)
      .orderBy(costHistory.recordDate);
  }

  async createCostHistory(history: InsertCostHistory): Promise<CostHistory> {
    const [result] = await db.insert(costHistory).values(history).returning();
    return result;
  }

  // Cost Escalation Methods
  async getCostEscalation(): Promise<CostEscalation[]> {
    return await db.select().from(costEscalation);
  }

  async getCostEscalationByProject(projectId: string): Promise<CostEscalation[]> {
    return await db.select().from(costEscalation)
      .where(eq(costEscalation.projectId, projectId))
      .orderBy(costEscalation.effectiveDate);
  }

  async getActiveCostEscalation(projectId: string): Promise<CostEscalation[]> {
    const currentDate = new Date();
    return await db.select().from(costEscalation)
      .where(eq(costEscalation.projectId, projectId))
      .where(eq(costEscalation.isActive, true))
      .where(sql`${costEscalation.effectiveDate} <= ${currentDate}`)
      .where(sql`${costEscalation.endDate} IS NULL OR ${costEscalation.endDate} > ${currentDate}`);
  }

  async createCostEscalation(escalation: InsertCostEscalation): Promise<CostEscalation> {
    const [result] = await db.insert(costEscalation).values(escalation).returning();
    return result;
  }

  async updateCostEscalation(id: string, escalation: Partial<InsertCostEscalation>): Promise<CostEscalation | undefined> {
    const [result] = await db.update(costEscalation)
      .set({ ...escalation, updatedAt: new Date() })
      .where(eq(costEscalation.id, id))
      .returning();
    return result;
  }

  // Smart Cost Analysis Backend Methods
  async analyzeProjectCostEfficiency(projectId: string): Promise<{
    overallScore: number;
    totalCost: number;
    averageCostPerSqFt: number;
    costByCategory: Array<{ category: string; amount: number; percentage: number }>;
    efficiency: 'excellent' | 'good' | 'average' | 'poor';
    insights: string[];
  }> {
    // Get all drawings for this project first, then get takeoffs for all drawings
    const projectDrawings = await db.select().from(drawings).where(eq(drawings.projectId, projectId));
    let projectTakeoffs = [];
    
    if (projectDrawings.length > 0) {
      const drawingIds = projectDrawings.map(d => d.id);
      projectTakeoffs = await db.select().from(takeoffs).where(sql`${takeoffs.drawingId} IN (${drawingIds.map(id => `'${id}'`).join(',')})`);
    }
    
    if (projectTakeoffs.length === 0) {
      return {
        overallScore: 0,
        totalCost: 0,
        averageCostPerSqFt: 0,
        costByCategory: [],
        efficiency: 'poor',
        insights: ['No takeoff data available for analysis']
      };
    }
    
    // Calculate total project cost
    const totalCost = projectTakeoffs.reduce((sum, t) => sum + (t.totalCost || 0), 0);
    
    // Calculate area-based metrics
    const totalArea = projectTakeoffs.reduce((sum, t) => sum + (t.area || 0), 0);
    const averageCostPerSqFt = totalArea > 0 ? totalCost / totalArea : 0;
    
    // Categorize costs
    const categoryTotals = new Map<string, number>();
    projectTakeoffs.forEach(takeoff => {
      const category = takeoff.elementType || 'Other';
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + (takeoff.totalCost || 0));
    });
    
    const costByCategory = Array.from(categoryTotals.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: (amount / totalCost) * 100
      }))
      .sort((a, b) => b.amount - a.amount);
    
    // Calculate efficiency score (0-100)
    let overallScore = 75; // Base score
    
    // Adjust based on cost distribution
    const maxCategoryPercentage = costByCategory[0]?.percentage || 0;
    if (maxCategoryPercentage > 50) overallScore -= 15; // Penalize over-concentration
    if (maxCategoryPercentage < 25) overallScore += 10; // Reward balance
    
    // Adjust based on cost per square foot (industry benchmarks)
    if (averageCostPerSqFt > 150) overallScore -= 10; // High cost
    if (averageCostPerSqFt < 80) overallScore += 10; // Good value
    
    // Determine efficiency level
    let efficiency: 'excellent' | 'good' | 'average' | 'poor';
    if (overallScore >= 85) efficiency = 'excellent';
    else if (overallScore >= 75) efficiency = 'good';
    else if (overallScore >= 60) efficiency = 'average';
    else efficiency = 'poor';
    
    // Generate insights
    const insights = [];
    if (totalCost > 100000) insights.push('Large project - consider bulk purchasing for savings');
    if (maxCategoryPercentage > 40) insights.push(`${costByCategory[0].category} dominates costs (${maxCategoryPercentage.toFixed(1)}%)`);
    if (averageCostPerSqFt > 120) insights.push('Above-average cost per sq ft - review material specifications');
    if (costByCategory.length > 5) insights.push('Diverse cost categories - good for risk distribution');
    
    return {
      overallScore,
      totalCost,
      averageCostPerSqFt,
      costByCategory,
      efficiency,
      insights
    };
  }

  async findCostSavingOpportunities(projectId: string): Promise<{
    potentialSavings: number;
    opportunities: Array<{
      category: string;
      description: string;
      estimatedSavings: number;
      priority: 'high' | 'medium' | 'low';
    }>;
  }> {
    // Get all drawings for this project first, then get takeoffs for all drawings
    const projectDrawings = await db.select().from(drawings).where(eq(drawings.projectId, projectId));
    let projectTakeoffs = [];
    
    if (projectDrawings.length > 0) {
      const drawingIds = projectDrawings.map(d => d.id);
      projectTakeoffs = await db.select().from(takeoffs).where(sql`${takeoffs.drawingId} IN (${drawingIds.map(id => `'${id}'`).join(',')})`);
    }
    const analysis = await this.analyzeProjectCostEfficiency(projectId);
    
    const opportunities = [];
    let potentialSavings = 0;
    
    // High-cost category optimization
    const highestCostCategory = analysis.costByCategory[0];
    if (highestCostCategory && highestCostCategory.percentage > 35) {
      const savings = highestCostCategory.amount * 0.1; // 10% potential savings
      opportunities.push({
        category: highestCostCategory.category,
        description: `Optimize ${highestCostCategory.category} costs through value engineering`,
        estimatedSavings: savings,
        priority: 'high' as const
      });
      potentialSavings += savings;
    }
    
    // Quantity optimization
    const highQuantityItems = projectTakeoffs.filter(t => (t.quantity || 0) > 50);
    if (highQuantityItems.length > 0) {
      const savings = highQuantityItems.reduce((sum, item) => sum + (item.totalCost || 0), 0) * 0.05;
      opportunities.push({
        category: 'Bulk Purchase',
        description: 'Negotiate bulk pricing for high-quantity items',
        estimatedSavings: savings,
        priority: 'medium' as const
      });
      potentialSavings += savings;
    }
    
    // Material substitution
    const expensiveItems = projectTakeoffs.filter(t => (t.costPerUnit || 0) > 100);
    if (expensiveItems.length > 0) {
      const savings = expensiveItems.reduce((sum, item) => sum + (item.totalCost || 0), 0) * 0.15;
      opportunities.push({
        category: 'Material Substitution',
        description: 'Consider alternative materials for expensive items',
        estimatedSavings: savings,
        priority: 'medium' as const
      });
      potentialSavings += savings;
    }
    
    return {
      potentialSavings,
      opportunities: opportunities.sort((a, b) => b.estimatedSavings - a.estimatedSavings)
    };
  }

  async generateCostBenchmarkReport(projectId: string): Promise<{
    projectCost: number;
    industryAverage: number;
    percentageVsAverage: number;
    ranking: 'below-average' | 'average' | 'above-average' | 'premium';
    factors: Array<{ factor: string; impact: number; description: string }>;
  }> {
    const analysis = await this.analyzeProjectCostEfficiency(projectId);
    
    // Simulated industry benchmarks (in production, this would come from real data)
    const industryBenchmarks = {
      averageCostPerSqFt: 95,
      typicalCategoryDistribution: {
        'flooring': 25,
        'windows': 20,
        'doors': 15,
        'electrical': 15,
        'walls': 12,
        'other': 13
      }
    };
    
    const industryAverage = industryBenchmarks.averageCostPerSqFt;
    const percentageVsAverage = ((analysis.averageCostPerSqFt - industryAverage) / industryAverage) * 100;
    
    let ranking: 'below-average' | 'average' | 'above-average' | 'premium';
    if (percentageVsAverage < -10) ranking = 'below-average';
    else if (percentageVsAverage < 10) ranking = 'average';
    else if (percentageVsAverage < 25) ranking = 'above-average';
    else ranking = 'premium';
    
    // Analyze cost factors
    const factors = [];
    
    // Regional factor
    factors.push({
      factor: 'Regional Costs',
      impact: Math.random() * 20 - 10, // Simulated regional impact
      description: 'Regional cost variations compared to national average'
    });
    
    // Material quality factor
    const avgCostPerUnit = analysis.totalCost / (analysis.costByCategory.reduce((sum, cat) => sum + cat.amount, 0) || 1);
    factors.push({
      factor: 'Material Quality',
      impact: avgCostPerUnit > 50 ? 15 : 5,
      description: avgCostPerUnit > 50 ? 'Premium materials selected' : 'Standard materials used'
    });
    
    // Project complexity
    const categoryCount = analysis.costByCategory.length;
    factors.push({
      factor: 'Project Complexity',
      impact: categoryCount > 6 ? 10 : 0,
      description: categoryCount > 6 ? 'High complexity with many categories' : 'Standard complexity project'
    });
    
    return {
      projectCost: analysis.totalCost,
      industryAverage,
      percentageVsAverage,
      ranking,
      factors
    };
  }

  async generateProjectRiskAssessment(projectId: string): Promise<{
    overallRiskScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    risks: Array<{
      category: string;
      severity: 'low' | 'medium' | 'high';
      probability: number;
      impact: string;
      mitigation: string;
    }>;
    recommendations: string[];
  }> {
    const analysis = await this.analyzeProjectCostEfficiency(projectId);
    const benchmark = await this.generateCostBenchmarkReport(projectId);
    
    const risks = [];
    let riskScore = 0;
    
    // Cost overrun risk
    if (benchmark.percentageVsAverage > 20) {
      risks.push({
        category: 'Cost Overrun',
        severity: 'high' as const,
        probability: 0.75,
        impact: 'Project costs significantly exceed industry standards',
        mitigation: 'Implement value engineering and material substitution strategies'
      });
      riskScore += 25;
    }
    
    // Budget concentration risk
    const topCategory = analysis.costByCategory[0];
    if (topCategory && topCategory.percentage > 45) {
      risks.push({
        category: 'Cost Concentration',
        severity: 'medium' as const,
        probability: 0.6,
        impact: `Over-dependence on ${topCategory.category} creates supply chain vulnerability`,
        mitigation: 'Diversify suppliers and consider alternative materials'
      });
      riskScore += 15;
    }
    
    // Market volatility risk for expensive projects
    if (analysis.totalCost > 150000) {
      risks.push({
        category: 'Market Volatility',
        severity: 'medium' as const,
        probability: 0.4,
        impact: 'Large projects vulnerable to material price fluctuations',
        mitigation: 'Lock in pricing with suppliers and consider phased purchasing'
      });
      riskScore += 10;
    }
    
    // Quality vs cost risk
    if (benchmark.ranking === 'below-average') {
      risks.push({
        category: 'Quality Risk',
        severity: 'low' as const,
        probability: 0.3,
        impact: 'Low costs may indicate potential quality compromises',
        mitigation: 'Verify material specifications and contractor qualifications'
      });
      riskScore += 5;
    }
    
    // Determine overall risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (riskScore >= 40) riskLevel = 'critical';
    else if (riskScore >= 25) riskLevel = 'high';
    else if (riskScore >= 15) riskLevel = 'medium';
    else riskLevel = 'low';
    
    // Generate recommendations
    const recommendations = [];
    if (riskScore > 20) {
      recommendations.push('Consider implementing a risk management plan');
      recommendations.push('Establish contingency budget of 10-15%');
    }
    if (analysis.efficiency === 'poor') {
      recommendations.push('Conduct detailed cost review before proceeding');
    }
    if (risks.some(r => r.category === 'Cost Concentration')) {
      recommendations.push('Evaluate supplier diversity and backup options');
    }
    
    return {
      overallRiskScore: riskScore,
      riskLevel,
      risks,
      recommendations
    };
  }

  async predictProjectCostTrends(projectId: string, months: number = 6): Promise<{
    currentCost: number;
    projectedCost: number;
    trendDirection: 'increasing' | 'decreasing' | 'stable';
    confidenceLevel: number;
    factors: Array<{
      factor: string;
      impact: number;
      description: string;
    }>;
    monthlyProjections: Array<{
      month: number;
      projectedCost: number;
      confidence: number;
    }>;
  }> {
    const analysis = await this.analyzeProjectCostEfficiency(projectId);
    const currentCost = analysis.totalCost;
    
    // Simulate market trend factors (in production, this would use real market data)
    const baseInflationRate = 0.02; // 2% annual inflation
    const materialVolatility = Math.random() * 0.1 - 0.05; // -5% to +5% volatility
    const seasonalFactor = Math.sin(Date.now() / 1000000) * 0.03; // Seasonal variation
    
    const monthlyInflationRate = baseInflationRate / 12;
    const monthlyVolatility = materialVolatility / 12;
    const monthlySeasonal = seasonalFactor / 12;
    
    const factors = [
      {
        factor: 'Base Inflation',
        impact: baseInflationRate * 100,
        description: 'Standard construction cost inflation rate'
      },
      {
        factor: 'Material Volatility',
        impact: materialVolatility * 100,
        description: 'Market-specific material price fluctuations'
      },
      {
        factor: 'Seasonal Variation',
        impact: seasonalFactor * 100,
        description: 'Seasonal demand patterns affecting pricing'
      }
    ];
    
    // Generate monthly projections
    const monthlyProjections = [];
    let runningCost = currentCost;
    
    for (let month = 1; month <= months; month++) {
      const monthlyChange = monthlyInflationRate + monthlyVolatility + monthlySeasonal;
      runningCost *= (1 + monthlyChange);
      
      const confidence = Math.max(0.3, 0.9 - (month * 0.1)); // Confidence decreases over time
      
      monthlyProjections.push({
        month,
        projectedCost: Math.round(runningCost),
        confidence
      });
    }
    
    const finalProjectedCost = monthlyProjections[monthlyProjections.length - 1].projectedCost;
    const totalChange = (finalProjectedCost - currentCost) / currentCost;
    
    let trendDirection: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(totalChange) < 0.02) trendDirection = 'stable';
    else if (totalChange > 0) trendDirection = 'increasing';
    else trendDirection = 'decreasing';
    
    const confidenceLevel = monthlyProjections[Math.floor(months/2)]?.confidence || 0.7;
    
    return {
      currentCost,
      projectedCost: finalProjectedCost,
      trendDirection,
      confidenceLevel,
      factors,
      monthlyProjections
    };
  }
}

export const storage = new DatabaseStorage();
