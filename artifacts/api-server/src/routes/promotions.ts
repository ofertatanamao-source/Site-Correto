import { Router } from "express";
import { db, historyTable, promotionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GeneratePromotionBody } from "@workspace/api-zod";
import { generatePromotionTexts } from "../services/promotionGenerator.js";

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

  const [inserted] = await db
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
    .returning();

  return res.json({
    id: inserted.id,
    historyItemId: inserted.historyItemId,
    whatsappText: inserted.whatsappText,
    instagramCaption: inserted.instagramCaption,
    telegramMessage: inserted.telegramMessage,
    promotionalScript: inserted.promotionalScript,
    storyImageUrl: inserted.storyImageUrl ?? null,
    feedImageUrl: inserted.feedImageUrl ?? null,
    createdAt: inserted.createdAt.toISOString(),
  });
});

export default router;
