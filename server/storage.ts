import { type Project, type InsertProject, type Drawing, type InsertDrawing, type Takeoff, type InsertTakeoff, type MaterialCost, type InsertMaterialCost } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Projects
  getProject(id: string): Promise<Project | undefined>;
  getProjects(): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  
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
}

export class MemStorage implements IStorage {
  private projects: Map<string, Project>;
  private drawings: Map<string, Drawing>;
  private takeoffs: Map<string, Takeoff>;
  private materialCosts: Map<string, MaterialCost>;

  constructor() {
    this.projects = new Map();
    this.drawings = new Map();
    this.takeoffs = new Map();
    this.materialCosts = new Map();
    
    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample project
    const sampleProject: Project = {
      id: "proj-1",
      name: "Downtown Office Complex",
      address: "123 Business Ave, Suite 400",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.projects.set(sampleProject.id, sampleProject);

    // Sample drawings
    const sampleDrawings: Drawing[] = [
      {
        id: "draw-1",
        projectId: "proj-1",
        name: "Floor Plan - Level 1",
        filename: "floor-plan-l1.pdf",
        fileUrl: "/uploads/floor-plan-l1.pdf",
        fileType: "application/pdf",
        status: "complete",
        scale: "1/4\" = 1'",
        aiProcessed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "draw-2",
        projectId: "proj-1",
        name: "Electrical Plan - Level 1",
        filename: "electrical-l1.pdf",
        fileUrl: "/uploads/electrical-l1.pdf",
        fileType: "application/pdf",
        status: "complete",
        scale: "1/4\" = 1'",
        aiProcessed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "draw-3",
        projectId: "proj-1",
        name: "HVAC Layout - Level 1",
        filename: "hvac-l1.pdf",
        fileUrl: "/uploads/hvac-l1.pdf",
        fileType: "application/pdf",
        status: "processing",
        scale: "1/4\" = 1'",
        aiProcessed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    
    sampleDrawings.forEach(drawing => this.drawings.set(drawing.id, drawing));

    // Sample material costs
    const sampleCosts: MaterialCost[] = [
      {
        id: "cost-1",
        category: "doors",
        itemName: "Interior Door (36\")",
        unit: "each",
        materialCost: 180,
        laborCost: 150,
        description: "Standard hollow core interior door with frame",
        updatedAt: new Date(),
      },
      {
        id: "cost-2",
        category: "windows",
        itemName: "Double Hung Window (3'x4')",
        unit: "each",
        materialCost: 350,
        laborCost: 200,
        description: "Standard double hung window with installation",
        updatedAt: new Date(),
      },
      {
        id: "cost-3",
        category: "flooring",
        itemName: "Hardwood Flooring",
        unit: "sq ft",
        materialCost: 8.5,
        laborCost: 6.0,
        description: "Oak hardwood flooring with installation",
        updatedAt: new Date(),
      },
    ];
    
    sampleCosts.forEach(cost => this.materialCosts.set(cost.id, cost));
  }

  // Projects
  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const now = new Date();
    const project: Project = { 
      ...insertProject,
      address: insertProject.address || null,
      id, 
      createdAt: now,
      updatedAt: now,
    };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: string, updateData: Partial<InsertProject>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updatedProject = { 
      ...project, 
      ...updateData, 
      updatedAt: new Date() 
    };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  // Drawings
  async getDrawing(id: string): Promise<Drawing | undefined> {
    return this.drawings.get(id);
  }

  async getDrawingsByProject(projectId: string): Promise<Drawing[]> {
    return Array.from(this.drawings.values()).filter(
      drawing => drawing.projectId === projectId
    );
  }

  async createDrawing(insertDrawing: InsertDrawing): Promise<Drawing> {
    const id = randomUUID();
    const now = new Date();
    const drawing: Drawing = { 
      ...insertDrawing,
      scale: insertDrawing.scale || null,
      aiProcessed: insertDrawing.aiProcessed || false,
      id, 
      createdAt: now,
      updatedAt: now,
    };
    this.drawings.set(id, drawing);
    return drawing;
  }

  async updateDrawing(id: string, updateData: Partial<InsertDrawing>): Promise<Drawing | undefined> {
    const drawing = this.drawings.get(id);
    if (!drawing) return undefined;
    
    const updatedDrawing = { 
      ...drawing, 
      ...updateData, 
      updatedAt: new Date() 
    };
    this.drawings.set(id, updatedDrawing);
    return updatedDrawing;
  }

  // Takeoffs
  async getTakeoff(id: string): Promise<Takeoff | undefined> {
    return this.takeoffs.get(id);
  }

  async getTakeoffsByDrawing(drawingId: string): Promise<Takeoff[]> {
    return Array.from(this.takeoffs.values()).filter(
      takeoff => takeoff.drawingId === drawingId
    );
  }

  async createTakeoff(insertTakeoff: InsertTakeoff): Promise<Takeoff> {
    const id = randomUUID();
    const now = new Date();
    const takeoff: Takeoff = { 
      ...insertTakeoff,
      area: insertTakeoff.area || null,
      length: insertTakeoff.length || null,
      width: insertTakeoff.width || null,
      height: insertTakeoff.height || null,
      coordinates: insertTakeoff.coordinates || null,
      detectedByAi: insertTakeoff.detectedByAi || false,
      costPerUnit: insertTakeoff.costPerUnit || null,
      totalCost: insertTakeoff.totalCost || null,
      quantity: insertTakeoff.quantity || null,
      id, 
      createdAt: now,
      updatedAt: now,
    };
    this.takeoffs.set(id, takeoff);
    return takeoff;
  }

  async updateTakeoff(id: string, updateData: Partial<InsertTakeoff>): Promise<Takeoff | undefined> {
    const takeoff = this.takeoffs.get(id);
    if (!takeoff) return undefined;
    
    const updatedTakeoff = { 
      ...takeoff, 
      ...updateData, 
      updatedAt: new Date() 
    };
    this.takeoffs.set(id, updatedTakeoff);
    return updatedTakeoff;
  }

  async deleteTakeoff(id: string): Promise<boolean> {
    return this.takeoffs.delete(id);
  }

  // Material Costs
  async getMaterialCosts(): Promise<MaterialCost[]> {
    return Array.from(this.materialCosts.values());
  }

  async getMaterialCostsByCategory(category: string): Promise<MaterialCost[]> {
    return Array.from(this.materialCosts.values()).filter(
      cost => cost.category === category
    );
  }

  async createMaterialCost(insertCost: InsertMaterialCost): Promise<MaterialCost> {
    const id = randomUUID();
    const cost: MaterialCost = { 
      ...insertCost,
      description: insertCost.description || null,
      id, 
      updatedAt: new Date(),
    };
    this.materialCosts.set(id, cost);
    return cost;
  }
}

export const storage = new MemStorage();
