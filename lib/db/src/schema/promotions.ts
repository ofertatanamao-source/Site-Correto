import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { historyTable } from "./history";

export const promotionsTable = pgTable("promotions", {
  id: serial("id").primaryKey(),
  historyItemId: integer("history_item_id").notNull().references(() => historyTable.id, { onDelete: "cascade" }),
  whatsappText: text("whatsapp_text").notNull(),
  instagramCaption: text("instagram_caption").notNull(),
  telegramMessage: text("telegram_message").notNull(),
  promotionalScript: text("promotional_script").notNull(),
  storyImageUrl: text("story_image_url"),
  feedImageUrl: text("feed_image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPromotionSchema = createInsertSchema(promotionsTable).omit({ id: true, createdAt: true });
export type InsertPromotion = z.infer<typeof insertPromotionSchema>;
export type Promotion = typeof promotionsTable.$inferSelect;
