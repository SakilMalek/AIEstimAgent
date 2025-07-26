import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const drawings = pgTable("drawings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  name: text("name").notNull(),
  filename: text("filename").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, complete, error
  scale: text("scale").default("1/4\" = 1'"),
  aiProcessed: boolean("ai_processed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const takeoffs = pgTable("takeoffs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  drawingId: varchar("drawing_id").references(() => drawings.id).notNull(),
  elementType: text("element_type").notNull(), // doors, windows, flooring, walls, electrical, plumbing
  elementName: text("element_name").notNull(),
  quantity: integer("quantity").default(0),
  area: real("area"), // for area measurements
  length: real("length"), // for linear measurements
  width: real("width"),
  height: real("height"),
  unit: text("unit").notNull(), // sq ft, ft, count, etc.
  coordinates: jsonb("coordinates"), // x, y coordinates for annotations
  detectedByAi: boolean("detected_by_ai").default(false),
  costPerUnit: real("cost_per_unit"),
  totalCost: real("total_cost"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const materialCosts = pgTable("material_costs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(), // doors, windows, flooring, etc.
  itemName: text("item_name").notNull(),
  unit: text("unit").notNull(),
  materialCost: real("material_cost").notNull(),
  laborCost: real("labor_cost").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Define relations
export const projectsRelations = relations(projects, ({ many }) => ({
  drawings: many(drawings),
}));

export const drawingsRelations = relations(drawings, ({ one, many }) => ({
  project: one(projects, {
    fields: [drawings.projectId],
    references: [projects.id],
  }),
  takeoffs: many(takeoffs),
}));

export const takeoffsRelations = relations(takeoffs, ({ one }) => ({
  drawing: one(drawings, {
    fields: [takeoffs.drawingId],
    references: [drawings.id],
  }),
}));

// Insert schemas
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDrawingSchema = createInsertSchema(drawings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTakeoffSchema = createInsertSchema(takeoffs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMaterialCostSchema = createInsertSchema(materialCosts).omit({
  id: true,
  updatedAt: true,
});

// Types
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export type InsertDrawing = z.infer<typeof insertDrawingSchema>;
export type Drawing = typeof drawings.$inferSelect;

export type InsertTakeoff = z.infer<typeof insertTakeoffSchema>;
export type Takeoff = typeof takeoffs.$inferSelect;

export type InsertMaterialCost = z.infer<typeof insertMaterialCostSchema>;
export type MaterialCost = typeof materialCosts.$inferSelect;
