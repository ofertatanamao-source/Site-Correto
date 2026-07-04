import { Router } from "express";
import { db, templatesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateTemplateBody, DeleteTemplateParams } from "@workspace/api-zod";

const router = Router();

// GET /templates
router.get("/templates", async (req, res) => {
  const items = await db
    .select()
    .from(templatesTable)
    .orderBy(desc(templatesTable.createdAt));

  return res.json(
    items.map((t) => ({
      id: t.id,
      name: t.name,
      imageUrl: t.imageUrl ?? null,
      isDefault: t.isDefault,
      createdAt: t.createdAt.toISOString(),
    }))
  );
});

// POST /templates
router.post("/templates", async (req, res) => {
  const parsed = CreateTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Dados inválidos." });
  }

  const [inserted] = await db
    .insert(templatesTable)
    .values({
      name: parsed.data.name,
      imageUrl: parsed.data.imageUrl ?? undefined,
      isDefault: false,
    })
    .returning();

  return res.status(201).json({
    id: inserted.id,
    name: inserted.name,
    imageUrl: inserted.imageUrl ?? null,
    isDefault: inserted.isDefault,
    createdAt: inserted.createdAt.toISOString(),
  });
});

// DELETE /templates/:id
router.delete("/templates/:id", async (req, res) => {
  const parsed = DeleteTemplateParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    return res.status(400).json({ error: "ID inválido." });
  }

  const deleted = await db
    .delete(templatesTable)
    .where(eq(templatesTable.id, parsed.data.id))
    .returning();

  if (deleted.length === 0) {
    return res.status(404).json({ error: "Template não encontrado." });
  }

  return res.status(204).send();
});

export default router;
