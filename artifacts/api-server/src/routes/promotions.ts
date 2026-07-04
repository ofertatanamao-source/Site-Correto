import { Router } from "express";
import { db, historyTable, promotionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GeneratePromotionBody } from "@workspace/api-zod";
import { generatePromotionTexts } from "../services/promotionGenerator.js";
import { generateProductImages } from "../services/imageGenerator.js";

const router = Router();

// POST /promotions/generate
router.post("/promotions/generate", async (req, res) => {
  const parsed = GeneratePromotionBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Dados inválidos." });
  }

  const { historyItemId } = parsed.data;

  const historyItems = await db
    .select()
    .from(historyTable)
    .where(eq(historyTable.id, historyItemId))
    .limit(1);

  if (historyItems.length === 0) {
    return res.status(404).json({ error: "Produto não encontrado no histórico." });
  }

  const product = historyItems[0];
  const texts = generatePromotionTexts(product);

  // Generate images in parallel with the DB insert
  const [insertResult, images] = await Promise.all([
    db
      .insert(promotionsTable)
      .values({
        historyItemId,
        whatsappText: texts.whatsappText,
        instagramCaption: texts.instagramCaption,
        telegramMessage: texts.telegramMessage,
        promotionalScript: texts.promotionalScript,
        storyImageUrl: null,
        feedImageUrl: null,
      })
      .returning(),
    generateProductImages(product),
  ]);

  const inserted = insertResult[0];

  // Update the record with the generated image URLs
  const [updated] = await db
    .update(promotionsTable)
    .set({
      storyImageUrl: images.storyImageUrl,
      feedImageUrl: images.feedImageUrl,
    })
    .where(eq(promotionsTable.id, inserted.id))
    .returning();

  return res.json({
    id: updated.id,
    historyItemId: updated.historyItemId,
    whatsappText: updated.whatsappText,
    instagramCaption: updated.instagramCaption,
    telegramMessage: updated.telegramMessage,
    promotionalScript: updated.promotionalScript,
    storyImageUrl: updated.storyImageUrl ?? null,
    feedImageUrl: updated.feedImageUrl ?? null,
    createdAt: updated.createdAt.toISOString(),
  });
});

export default router;
