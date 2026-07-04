import { Router } from "express";
import { db, historyTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { extractProduct } from "../services/extractor/index.js";
import { ExtractProductBody, DeleteHistoryItemParams, ToggleFavoriteParams } from "@workspace/api-zod";

const router = Router();

// POST /products/extract
router.post("/products/extract", async (req, res) => {
  const parsed = ExtractProductBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "URL inválida." });
  }

  const { url, affiliateLink } = parsed.data;

  try {
    const product = await extractProduct(url, affiliateLink);

    const [inserted] = await db
      .insert(historyTable)
      .values({
        platform: product.platform,
        title: product.title,
        shortTitle: product.shortTitle,
        currentPrice: product.currentPrice,
        originalPrice: product.originalPrice ?? undefined,
        discountPercentage: product.discountPercentage ?? undefined,
        imageUrl: product.imageUrl,
        productUrl: product.productUrl,
        affiliateLink: product.affiliateLink ?? undefined,
      })
      .returning();

    return res.json({
      id: inserted.id,
      platform: inserted.platform,
      title: inserted.title,
      shortTitle: inserted.shortTitle,
      currentPrice: inserted.currentPrice,
      originalPrice: inserted.originalPrice ?? null,
      discountPercentage: inserted.discountPercentage ?? null,
      imageUrl: inserted.imageUrl,
      productUrl: inserted.productUrl,
      affiliateLink: inserted.affiliateLink ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Product extraction failed");
    const message = err instanceof Error ? err.message : "Não foi possível extrair o produto.";
    return res.status(422).json({ error: message });
  }
});

// GET /products/history
router.get("/products/history", async (req, res) => {
  const items = await db
    .select()
    .from(historyTable)
    .orderBy(desc(historyTable.createdAt));

  return res.json(items.map(toHistoryItem));
});

// DELETE /products/history/:id
router.delete("/products/history/:id", async (req, res) => {
  const parsed = DeleteHistoryItemParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    return res.status(400).json({ error: "ID inválido." });
  }

  const deleted = await db
    .delete(historyTable)
    .where(eq(historyTable.id, parsed.data.id))
    .returning();

  if (deleted.length === 0) {
    return res.status(404).json({ error: "Item não encontrado." });
  }

  return res.status(204).send();
});

// GET /products/favorites
router.get("/products/favorites", async (req, res) => {
  const items = await db
    .select()
    .from(historyTable)
    .where(eq(historyTable.isFavorite, true))
    .orderBy(desc(historyTable.createdAt));

  return res.json(items.map(toHistoryItem));
});

// PATCH /products/history/:id/favorite
router.patch("/products/history/:id/favorite", async (req, res) => {
  const parsed = ToggleFavoriteParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    return res.status(400).json({ error: "ID inválido." });
  }

  const existing = await db
    .select()
    .from(historyTable)
    .where(eq(historyTable.id, parsed.data.id))
    .limit(1);

  if (existing.length === 0) {
    return res.status(404).json({ error: "Item não encontrado." });
  }

  const [updated] = await db
    .update(historyTable)
    .set({ isFavorite: !existing[0].isFavorite })
    .where(eq(historyTable.id, parsed.data.id))
    .returning();

  return res.json(toHistoryItem(updated));
});

function toHistoryItem(row: typeof historyTable.$inferSelect) {
  return {
    id: row.id,
    platform: row.platform,
    title: row.title,
    shortTitle: row.shortTitle,
    currentPrice: row.currentPrice,
    originalPrice: row.originalPrice ?? null,
    discountPercentage: row.discountPercentage ?? null,
    imageUrl: row.imageUrl,
    productUrl: row.productUrl,
    affiliateLink: row.affiliateLink ?? null,
    isFavorite: row.isFavorite,
    createdAt: row.createdAt.toISOString(),
  };
}

export default router;
