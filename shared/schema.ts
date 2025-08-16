import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  location: text("location"),
  address: text("address"), // Keep to avoid data loss during migration
  client: text("client"),
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
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const takeoffs = pgTable("takeoffs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  drawingId: varchar("drawing_id").references(() => drawings.id).notNull(),
  elementType: text("element_type").notNull(), // doors, windows, flooring, walls, electrical, plumbing
  elementName: text("element_name").notNull(),
  itemType: text("item_type").notNull(), // display name for UI
  quantity: integer("quantity").default(0),
  originalQuantity: integer("original_quantity"), // AI-detected quantity before manual edits
  area: real("area"), // for area measurements
  originalArea: real("original_area"), // Original AI-detected area
  length: real("length"), // for linear measurements
  originalLength: real("original_length"), // Original AI-detected length
  width: real("width"),
  height: real("height"),
  unit: text("unit").notNull(), // sq ft, ft, count, etc.
  coordinates: jsonb("coordinates"), // x, y coordinates for annotations
  detectedByAi: boolean("detected_by_ai").default(false),
  costPerUnit: real("cost_per_unit"),
  originalCostPerUnit: real("original_cost_per_unit"), // Original cost before manual adjustments
  totalCost: real("total_cost"),
  originalTotalCost: real("original_total_cost"), // Original total cost before adjustments
  manuallyEdited: boolean("manually_edited").default(false), // Track if user has modified this item
  customPricing: jsonb("custom_pricing"), // Store custom pricing overrides
  linkedSkuId: varchar("linked_sku_id").references(() => productSkus.id), // Link to product SKU for pricing
  notes: text("notes"), // user notes for the takeoff item
  verified: boolean("verified").default(false), // manually verified by user
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Add saved analyses table
export const savedAnalyses = pgTable("saved_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  drawingId: varchar("drawing_id").references(() => drawings.id),
  name: text("name").notNull(),
  description: text("description"),
  analysisData: jsonb("analysis_data").notNull(), // stores the complete analysis results
  totalItems: integer("total_items").default(0),
  totalCost: real("total_cost").default(0),
  elementTypes: jsonb("element_types"), // array of analyzed element types
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

// Trade classifications for organizing SKUs and pricing
export const tradeClasses = pgTable("trade_classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  parentId: varchar("parent_id"), // for hierarchical structure - references self
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product SKUs organized by trade class
export const productSkus = pgTable("product_skus", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  tradeClassId: varchar("trade_class_id").references(() => tradeClasses.id).notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  unit: text("unit").notNull(),
  unitSize: real("unit_size"), // e.g., 2x4x8 for lumber
  unitDescription: text("unit_description"), // "per linear foot", "per sheet", etc.
  materialCost: real("material_cost").notNull(),
  laborCost: real("labor_cost").notNull(),
  markupPercentage: real("markup_percentage").default(0.20), // 20% default markup
  tags: jsonb("tags"), // array of searchable tags
  specifications: jsonb("specifications"), // detailed product specs
  vendor: text("vendor"),
  vendorSku: text("vendor_sku"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project-specific custom pricing overrides
export const projectPricing = pgTable("project_pricing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  skuId: varchar("sku_id").references(() => productSkus.id),
  customSku: text("custom_sku"), // for one-off custom items
  itemName: text("item_name").notNull(),
  unit: text("unit").notNull(),
  materialCost: real("material_cost").notNull(),
  laborCost: real("labor_cost").notNull(),
  markupPercentage: real("markup_percentage").default(0.20),
  notes: text("notes"),
  isCustom: boolean("is_custom").default(false), // true for custom items not in SKU catalog
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Estimate templates by trade class
export const estimateTemplates = pgTable("estimate_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  tradeClassId: varchar("trade_class_id").references(() => tradeClasses.id).notNull(),
  templateData: jsonb("template_data").notNull(), // structured template with line items
  isPublic: boolean("is_public").default(false), // company-wide templates vs private
  createdBy: text("created_by"), // user identifier
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Define relations
export const projectsRelations = relations(projects, ({ many }) => ({
  drawings: many(drawings),
  savedAnalyses: many(savedAnalyses),
  projectPricing: many(projectPricing),
}));

export const tradeClassesRelations = relations(tradeClasses, ({ one, many }) => ({
  parent: one(tradeClasses, {
    fields: [tradeClasses.parentId],
    references: [tradeClasses.id],
    relationName: "tradeClassParent",
  }),
  children: many(tradeClasses, {
    relationName: "tradeClassParent",
  }),
  productSkus: many(productSkus),
  estimateTemplates: many(estimateTemplates),
}));

export const productSkusRelations = relations(productSkus, ({ one, many }) => ({
  tradeClass: one(tradeClasses, {
    fields: [productSkus.tradeClassId],
    references: [tradeClasses.id],
  }),
  projectPricing: many(projectPricing),
}));

export const projectPricingRelations = relations(projectPricing, ({ one }) => ({
  project: one(projects, {
    fields: [projectPricing.projectId],
    references: [projects.id],
  }),
  sku: one(productSkus, {
    fields: [projectPricing.skuId],
    references: [productSkus.id],
  }),
}));

export const estimateTemplatesRelations = relations(estimateTemplates, ({ one }) => ({
  tradeClass: one(tradeClasses, {
    fields: [estimateTemplates.tradeClassId],
    references: [tradeClasses.id],
  }),
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

export const savedAnalysesRelations = relations(savedAnalyses, ({ one }) => ({
  project: one(projects, {
    fields: [savedAnalyses.projectId],
    references: [projects.id],
  }),
  drawing: one(drawings, {
    fields: [savedAnalyses.drawingId],
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

export const insertSavedAnalysisSchema = createInsertSchema(savedAnalyses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTradeClassSchema = createInsertSchema(tradeClasses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSkuSchema = createInsertSchema(productSkus).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectPricingSchema = createInsertSchema(projectPricing).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEstimateTemplateSchema = createInsertSchema(estimateTemplates).omit({
  id: true,
  createdAt: true,
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

export type InsertSavedAnalysis = z.infer<typeof insertSavedAnalysisSchema>;
export type SavedAnalysis = typeof savedAnalyses.$inferSelect;

export type InsertTradeClass = z.infer<typeof insertTradeClassSchema>;
export type TradeClass = typeof tradeClasses.$inferSelect;

export type InsertProductSku = z.infer<typeof insertProductSkuSchema>;
export type ProductSku = typeof productSkus.$inferSelect;

export type InsertProjectPricing = z.infer<typeof insertProjectPricingSchema>;
export type ProjectPricing = typeof projectPricing.$inferSelect;

export type InsertEstimateTemplate = z.infer<typeof insertEstimateTemplateSchema>;
export type EstimateTemplate = typeof estimateTemplates.$inferSelect;
