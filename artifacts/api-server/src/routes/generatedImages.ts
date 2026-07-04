import { Router } from "express";
import { createReadStream, existsSync } from "node:fs";
import { join } from "node:path";

const IMAGE_DIR = "/tmp/ta-na-mao-images";

const router = Router();

/**
 * Serve generated Story/Feed PNG images.
 * GET /generated-images/:filename
 */
router.get("/generated-images/:filename", (req, res) => {
  const { filename } = req.params;

  // Sanitize: only allow safe filenames (no path traversal)
  if (!/^[\w\-]+\.png$/.test(filename)) {
    return res.status(400).json({ error: "Invalid filename." });
  }

  const filepath = join(IMAGE_DIR, filename);

  if (!existsSync(filepath)) {
    return res.status(404).json({ error: "Image not found." });
  }

  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=86400");
  createReadStream(filepath).pipe(res);
});

export default router;
