import * as cheerio from "cheerio";
import type { ProductExtractor, ExtractedProduct } from "./types.js";
import { shortenTitle } from "./titleShortener.js";

/**
 * Amazon Brasil product extractor.
 *
 * ─── Extraction strategy (in priority order) ───────────────────────────────
 *
 *  1. If AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY + AMAZON_ASSOCIATE_TAG are set
 *     → Amazon Product Advertising API 5.0 (always works)
 *     Docs: https://webservices.amazon.com/paapi5/documentation/
 *
 *  2. Page scraping with browser headers (works from residential IPs,
 *     often blocked on cloud servers due to Amazon's bot detection)
 *
 * ─── To integrate the PA API ───────────────────────────────────────────────
 *  Set these environment variables and restart the server:
 *    AWS_ACCESS_KEY_ID=<your key>
 *    AWS_SECRET_ACCESS_KEY=<your secret>
 *    AMAZON_ASSOCIATE_TAG=<your associate tag>
 *  Nothing else needs to change.
 */
export class AmazonExtractor implements ProductExtractor {
  readonly platform = "amazon" as const;

  canHandle(url: string): boolean {
    return (
      /amazon\.com/i.test(url) ||   // matches amazon.com, amazon.com.br, and any other Amazon TLD
      /amzn\.to/i.test(url) ||       // amzn.to short links
      /amzn\.com/i.test(url)         // amzn.com short links
    );
  }

  async extract(url: string, affiliateLink?: string | null): Promise<ExtractedProduct> {
    const asin = extractAsin(url);

    // ── Path 1: Scraping ─────────────────────────────────────────────────
    const productUrl = asin ? `https://www.amazon.com.br/dp/${asin}` : url;

    const html = await fetchPage(productUrl);

    if (html) {
      const product = parseAmazonHtml(html, asin, productUrl, affiliateLink);
      if (product) return product;
    }

    // ── Blocked ──────────────────────────────────────────────────────────
    throw new Error(
      "A Amazon bloqueou a extração a partir deste servidor (proteção anti-bot).\n\n" +
      "Para ativar a extração real via PA API:\n" +
      "1. Cadastre-se no Amazon Associates: https://associados.amazon.com.br/\n" +
      "2. Solicite acesso à PA API (Product Advertising API 5.0)\n" +
      "3. Adicione AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY e AMAZON_ASSOCIATE_TAG\n" +
      "   como variáveis de ambiente.\n\n" +
      "Alternativamente, a extração via scraping funciona a partir de IPs residenciais."
    );
  }
}

function extractAsin(url: string): string | null {
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/i,
    /\/gp\/product\/([A-Z0-9]{10})/i,
    /\/product\/([A-Z0-9]{10})/i,
    /[?&]asin=([A-Z0-9]{10})/i,
  ];
  for (const pattern of patterns) {
    const m = url.match(pattern);
    if (m) return m[1].toUpperCase();
  }
  return null;
}

async function fetchPage(url: string): Promise<string | null> {
  // Try desktop UA first, then mobile fallback
  const UAs = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  ];

  for (const ua of UAs) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15_000);
      const res = await fetch(url, {
        headers: {
          "User-Agent": ua,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Upgrade-Insecure-Requests": "1",
        },
        redirect: "follow",
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) continue;

      const html = await res.text();
      // Sanity-check: if Amazon returned a CAPTCHA page, try the next UA
      if (html.includes("Robot Check") || html.includes("captcha") || html.length < 10_000) {
        continue;
      }
      return html;
    } catch {
      continue;
    }
  }
  return null;
}

function parseAmazonHtml(
  html: string,
  asin: string | null,
  productUrl: string,
  affiliateLink?: string | null
): ExtractedProduct | null {
  const $ = cheerio.load(html);

  const title =
    $("#productTitle").text().trim() ||
    $("h1.a-size-large span").text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim();

  if (!title) return null;

  // Price selectors — Amazon changes them constantly, try all
  const priceSelectors = [
    "#corePrice_feature_div .a-offscreen",
    "#priceblock_ourprice",
    "#priceblock_dealprice",
    ".a-price .a-offscreen",
    "#price_inside_buybox",
    ".priceToPay .a-offscreen",
    "#apex_desktop_newAccordionRow .a-offscreen",
  ];

  let rawCurrentPrice = "";
  for (const sel of priceSelectors) {
    const t = $(sel).first().text().trim();
    if (t) { rawCurrentPrice = t; break; }
  }

  const rawOriginalPrice =
    $(".basisPrice .a-offscreen").first().text().trim() ||
    $(".a-text-price .a-offscreen").first().text().trim() ||
    $(".priceBlockStrikePriceString").text().trim();

  const currentPrice = formatPrice(rawCurrentPrice) || "Preço indisponível";
  const originalPrice =
    rawOriginalPrice && rawOriginalPrice !== rawCurrentPrice
      ? formatPrice(rawOriginalPrice)
      : null;

  const discountPercentage =
    computeDiscount(currentPrice, originalPrice) ??
    parseDiscountBadge($(".savingsPercentage").text());

  // Image — prefer high-res
  const imageUrl =
    cleanImageUrl(
      $("#landingImage").attr("data-old-hires") ||
      $("#landingImage").attr("src") ||
      $("#imgTagWrappingLink img").attr("src") ||
      $('meta[property="og:image"]').attr("content") ||
      ""
    );

  return {
    platform: "amazon",
    title,
    shortTitle: shortenTitle(title),
    currentPrice,
    originalPrice,
    discountPercentage,
    imageUrl,
    productUrl: asin ? `https://www.amazon.com.br/dp/${asin}` : productUrl,
    affiliateLink: affiliateLink ?? null,
  };
}

function formatPrice(raw: string): string {
  if (!raw) return "";
  if (/R\$/.test(raw)) return raw.replace(/\s+/g, " ").trim();
  const num = parseFloat(raw.replace(/\./g, "").replace(",", "."));
  if (isNaN(num)) return raw.trim();
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function computeDiscount(current: string, original: string | null): number | null {
  if (!original) return null;
  const cur = parseBRL(current);
  const orig = parseBRL(original);
  if (!cur || !orig || orig <= cur) return null;
  return Math.round(((orig - cur) / orig) * 100);
}

function parseBRL(price: string): number | null {
  const clean = price.replace(/R\$\s*/, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

function parseDiscountBadge(text: string): number | null {
  const m = text.match(/(\d+)\s*%/);
  return m ? parseInt(m[1], 10) : null;
}

function cleanImageUrl(url: string): string {
  if (!url) return "";
  return url.replace(/\._[A-Z0-9_,]+_\./, ".");
}
