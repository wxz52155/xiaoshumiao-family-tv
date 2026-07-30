import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  color: text("color").notNull().default("#4f7c68"),
  icon: text("icon").notNull().default("◌"),
  sortOrder: integer("sort_order").notNull().default(0),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const videos = sqliteTable("videos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  posterUrl: text("poster_url").notNull().default(""),
  sourceType: text("source_type").notNull(),
  sourceUrl: text("source_url").notNull(),
  duration: text("duration").notNull().default(""),
  uploader: text("uploader").notNull().default(""),
  status: text("status").notNull().default("published"),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const syncTasks = sqliteTable("sync_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id").notNull(),
  sourceUrl: text("source_url").notNull(),
  sourceType: text("source_type").notNull(),
  status: text("status").notNull().default("pending"),
  importedCount: integer("imported_count").notNull().default(0),
  message: text("message").notNull().default(""),
  lastSyncedAt: text("last_synced_at"),
  createdAt: text("created_at").notNull(),
});
