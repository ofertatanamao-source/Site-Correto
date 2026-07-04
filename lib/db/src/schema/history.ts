import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const historyTable = pgTable("history", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull(), // amazon | shopee | mercadolivre
  title: text("title").notNull(),
  shortTitle: text("short_title").notNull(),
  currentPrice: text("current_price").notNull(),
  originalPrice: text("original_price"),
  discountPercentage: integer("discount_percentage"),
  imageUrl: text("image_url").notNull(),
  productUrl: text("product_url").notNull(),
  affiliateLink: text("affiliate_link"),
  isFavorite: boolean("is_favorite").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertHistorySchema = createInsertSchema(historyTable).omit({ id: true, createdAt: true });
export type InsertHistory = z.infer<typeof insertHistorySchema>;
export type History = typeof historyTable.$inferSelect;
