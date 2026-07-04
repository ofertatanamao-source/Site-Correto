import { createCanvas, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { History } from "@workspace/db";

const IMAGE_DIR = "/tmp/ta-na-mao-images";

// Ensure the output directory exists (called once at module load)
mkdir(IMAGE_DIR, { recursive: true }).catch(() => {});

// Brand palette
const BEIGE = "#F5F0E8";
const OFF_WHITE = "#FAFAF7";
const BROWN = "#6B4226";
const LIGHT_BROWN = "#C8956C";
const WHITE = "#FFFFFF";
const DISCOUNT_RED = "#E53E3E";
const SHADOW = "rgba(107, 66, 38, 0.12)";

const PLATFORM_COLORS: Record<string, string> = {
  amazon: "#FF9900",
  shopee: "#EE4D2D",
  mercadolivre: "#FFE600",
};

const PLATFORM_LABELS: Record<string, string> = {
  amazon: "Amazon",
  shopee: "Shopee",
  mercadolivre: "Mercado Livre",
};

export interface GeneratedImages {
  storyImageUrl: string | null;
  feedImageUrl: string | null;
}

export async function generateProductImages(
  product: History
): Promise<GeneratedImages> {
  const [story, feed] = await Promise.allSettled([
    renderStory(product),
    renderFeed(product),
  ]);

  return {
    storyImageUrl: story.status === "fulfilled" ? story.value : null,
    feedImageUrl: feed.status === "fulfilled" ? feed.value : null,
  };
}

// ─── Instagram Story 1080×1920 ─────────────────────────────────────────────

async function renderStory(product: History): Promise<string> {
  const W = 1080;
  const H = 1920;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, BEIGE);
  grad.addColorStop(0.6, "#EDE4D3");
  grad.addColorStop(1, "#D4B896");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Decorative top arc
  ctx.beginPath();
  ctx.ellipse(W / 2, -80, 700, 320, 0, 0, Math.PI * 2);
  ctx.fillStyle = BROWN;
  ctx.fill();

  // App name
  ctx.font = "bold 52px sans-serif";
  ctx.fillStyle = WHITE;
  ctx.textAlign = "center";
  ctx.fillText("Tá na Mão", W / 2, 110);

  // Platform badge
  drawPlatformBadge(ctx, product.platform, W / 2, 180, 36);

  // White card
  const cardX = 80;
  const cardY = 260;
  const cardW = W - 160;
  const cardH = 1200;
  roundRect(ctx, cardX, cardY, cardW, cardH, 40, WHITE, SHADOW);

  // Product image
  const imgY = cardY + 40;
  const imgSize = 620;
  const imgX = (W - imgSize) / 2;
  await drawProductImage(ctx, product.imageUrl, imgX, imgY, imgSize, imgSize, 24);

  // Discount badge (top-right of image)
  if (product.discountPercentage) {
    drawDiscountBadge(ctx, `${product.discountPercentage}%\nOFF`, imgX + imgSize - 30, imgY + 30, 90);
  }

  // Title area
  const textX = W / 2;
  let textY = imgY + imgSize + 60;

  ctx.font = `bold 52px sans-serif`;
  ctx.fillStyle = BROWN;
  ctx.textAlign = "center";
  textY = wrapText(ctx, product.shortTitle, textX, textY, cardW - 80, 60) + 30;

  // Separator
  ctx.fillStyle = LIGHT_BROWN;
  ctx.fillRect(cardX + 80, textY, cardW - 160, 2);
  textY += 50;

  // Original price
  if (product.originalPrice) {
    ctx.font = "44px sans-serif";
    ctx.fillStyle = "#999";
    ctx.textAlign = "center";
    const measuredOrig = ctx.measureText(product.originalPrice);
    ctx.fillText(product.originalPrice, textX, textY);
    // Strikethrough
    ctx.strokeStyle = "#999";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(textX - measuredOrig.width / 2, textY - 14);
    ctx.lineTo(textX + measuredOrig.width / 2, textY - 14);
    ctx.stroke();
    textY += 70;
  }

  // Current price
  ctx.font = `bold 96px sans-serif`;
  ctx.fillStyle = BROWN;
  ctx.textAlign = "center";
  ctx.fillText(product.currentPrice, textX, textY);
  textY += 30;

  // Footer
  const footerY = cardY + cardH + 40;
  ctx.font = "38px sans-serif";
  ctx.fillStyle = BROWN;
  ctx.textAlign = "center";
  ctx.globalAlpha = 0.7;
  ctx.fillText("Link na bio • Oferta por tempo limitado", W / 2, footerY);
  ctx.globalAlpha = 1;

  return saveCanvas(canvas, "story");
}

// ─── Instagram Feed 1080×1350 ──────────────────────────────────────────────

async function renderFeed(product: History): Promise<string> {
  const W = 1080;
  const H = 1350;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Warm background
  ctx.fillStyle = BEIGE;
  ctx.fillRect(0, 0, W, H);

  // Left accent strip
  ctx.fillStyle = BROWN;
  ctx.fillRect(0, 0, 18, H);

  // Header
  ctx.font = "bold 48px sans-serif";
  ctx.fillStyle = BROWN;
  ctx.textAlign = "left";
  ctx.fillText("Tá na Mão", 60, 75);

  drawPlatformBadge(ctx, product.platform, 60 + ctx.measureText("Tá na Mão").width + 60, 60, 28);

  // Separator
  ctx.fillStyle = LIGHT_BROWN;
  ctx.fillRect(60, 100, W - 120, 3);

  // Product image (left column)
  const imgX = 60;
  const imgY = 130;
  const imgSize = 480;
  await drawProductImage(ctx, product.imageUrl, imgX, imgY, imgSize, imgSize, 20);

  // Discount badge
  if (product.discountPercentage) {
    drawDiscountBadge(ctx, `${product.discountPercentage}%\nOFF`, imgX + imgSize - 20, imgY + 20, 80);
  }

  // Text column (right)
  const textX = imgX + imgSize + 50;
  const textMaxW = W - textX - 60;
  let ty = imgY + 60;

  ctx.font = "bold 46px sans-serif";
  ctx.fillStyle = BROWN;
  ctx.textAlign = "left";
  ty = wrapTextLeft(ctx, product.shortTitle, textX, ty, textMaxW, 54) + 40;

  if (product.originalPrice) {
    ctx.font = "38px sans-serif";
    ctx.fillStyle = "#999";
    const measuredOrig = ctx.measureText(product.originalPrice);
    ctx.fillText(product.originalPrice, textX, ty);
    ctx.strokeStyle = "#999";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(textX, ty - 13);
    ctx.lineTo(textX + measuredOrig.width, ty - 13);
    ctx.stroke();
    ty += 55;
  }

  ctx.font = "bold 80px sans-serif";
  ctx.fillStyle = BROWN;
  ctx.fillText(product.currentPrice, textX, ty);
  ty += 40;

  // "Ver oferta" pill
  const pillW = Math.min(textMaxW, 320);
  roundRect(ctx, textX, ty, pillW, 70, 35, BROWN, "transparent");
  ctx.font = "bold 36px sans-serif";
  ctx.fillStyle = WHITE;
  ctx.textAlign = "center";
  ctx.fillText("Ver oferta →", textX + pillW / 2, ty + 45);

  // Below divider
  ctx.fillStyle = LIGHT_BROWN;
  ctx.fillRect(60, imgY + imgSize + 40, W - 120, 2);

  // Full title
  const fullTitleY = imgY + imgSize + 80;
  ctx.font = "38px sans-serif";
  ctx.fillStyle = "#555";
  ctx.textAlign = "left";
  wrapTextLeft(ctx, product.title, 60, fullTitleY, W - 120, 46);

  return saveCanvas(canvas, "feed");
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function drawProductImage(
  ctx: SKRSContext2D,
  url: string,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 0
): Promise<void> {
  if (!url) {
    drawImagePlaceholder(ctx, x, y, w, h, radius);
    return;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "TaNaMao/1.0" },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error("image fetch failed");
    const buf = Buffer.from(await res.arrayBuffer());
    const img = await loadImage(buf);

    if (radius > 0) {
      ctx.save();
      roundedClip(ctx, x, y, w, h, radius);
    }
    ctx.fillStyle = OFF_WHITE;
    ctx.fillRect(x, y, w, h);
    // Fit image preserving aspect ratio
    const scale = Math.min(w / img.width, h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    if (radius > 0) ctx.restore();
  } catch {
    drawImagePlaceholder(ctx, x, y, w, h, radius);
  }
}

function drawImagePlaceholder(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  if (radius > 0) {
    ctx.save();
    roundedClip(ctx, x, y, w, h, radius);
  }
  ctx.fillStyle = "#E8DFD0";
  ctx.fillRect(x, y, w, h);
  ctx.font = `bold ${Math.floor(w / 8)}px sans-serif`;
  ctx.fillStyle = LIGHT_BROWN;
  ctx.textAlign = "center";
  ctx.fillText("Imagem", x + w / 2, y + h / 2 - 10);
  ctx.fillText("indisponível", x + w / 2, y + h / 2 + Math.floor(w / 8) + 5);
  if (radius > 0) ctx.restore();
}

function drawPlatformBadge(
  ctx: SKRSContext2D,
  platform: string,
  cx: number,
  cy: number,
  r: number
) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = PLATFORM_COLORS[platform] || BROWN;
  ctx.fill();

  ctx.font = `bold ${Math.floor(r * 0.9)}px sans-serif`;
  ctx.fillStyle = platform === "mercadolivre" ? "#333" : WHITE;
  ctx.textAlign = "center";
  ctx.fillText(PLATFORM_LABELS[platform]?.[0] || "?", cx, cy + r * 0.35);
}

function drawDiscountBadge(
  ctx: SKRSContext2D,
  text: string,
  cx: number,
  cy: number,
  r: number
) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = DISCOUNT_RED;
  ctx.fill();

  const lines = text.split("\n");
  const lineH = Math.floor(r * 0.55);
  ctx.font = `bold ${lineH}px sans-serif`;
  ctx.fillStyle = WHITE;
  ctx.textAlign = "center";
  const startY = cy - (lines.length - 1) * lineH * 0.5;
  lines.forEach((line, i) => ctx.fillText(line, cx, startY + i * lineH + lineH * 0.35));
}

function roundRect(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  shadow: string
) {
  if (shadow !== "transparent") {
    ctx.save();
    ctx.shadowColor = shadow;
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 8;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (shadow !== "transparent") ctx.restore();
}

function roundedClip(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.clip();
}

/** Wraps text centered, returns the y after the last line */
function wrapText(
  ctx: SKRSContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number
): number {
  const words = text.split(" ");
  let line = "";
  let curY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, curY);
      line = word;
      curY += lineH;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, curY);
    curY += lineH;
  }
  return curY;
}

/** Wraps text left-aligned, returns the y after the last line */
function wrapTextLeft(
  ctx: SKRSContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number
): number {
  const words = text.split(" ");
  let line = "";
  let curY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, curY);
      line = word;
      curY += lineH;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, curY);
    curY += lineH;
  }
  return curY;
}

async function saveCanvas(
  canvas: ReturnType<typeof createCanvas>,
  type: "story" | "feed"
): Promise<string> {
  const filename = `${type}-${randomUUID()}.png`;
  const filepath = join(IMAGE_DIR, filename);
  const buf = canvas.toBuffer("image/png");
  await writeFile(filepath, buf);
  return `/api/generated-images/${filename}`;
}
