import { eq } from "drizzle-orm";
import { db } from "./db";
import { 
  projects, 
  drawings, 
  takeoffs, 
  materialCosts,
  savedAnalyses
} from "@shared/schema";
import { type Project, type InsertProject, type Drawing, type InsertDrawing, type Takeoff, type InsertTakeoff, type MaterialCost, type InsertMaterialCost, type SavedAnalysis, type InsertSavedAnalysis } from "@shared/schema";
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
    return result.rowCount > 0;
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
    return result.rowCount > 0;
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
    return result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();
