import * as cheerio from "cheerio";
import type { ProductExtractor, ExtractedProduct } from "./types.js";
import { shortenTitle } from "./titleShortener.js";
import { hasMlCredentials, getMlAccessToken } from "./mlAuth.js";

/**
 * Mercado Livre Brasil product extractor.
 *
 * ─── Extraction strategy (in priority order) ───────────────────────────────
 *
 *  1. If ML_APP_ID + ML_APP_SECRET are set → OAuth Items API (always works)
 *     Register a FREE developer app at https://developers.mercadolivre.com.br/
 *
 *  2. Page scraping fallback (works from residential IPs, blocked on cloud)
 *
 * ─── To integrate the real API ─────────────────────────────────────────────
 *  Set these environment variables and restart the server:
 *    ML_APP_ID=<your app id>
 *    ML_APP_SECRET=<your app secret>
 *  Nothing else needs to change.
 */
export class MercadoLivreExtractor implements ProductExtractor {
  readonly platform = "mercadolivre" as const;

  canHandle(url: string): boolean {
    return (
      /mercadolivre\.com\.br/i.test(url) ||
      /mercadolibre\.com\.br/i.test(url) ||
      /meli\.com/i.test(url) ||
      /mercadolivre\.com/i.test(url)
    );
  }

  async extract(url: string, affiliateLink?: string | null): Promise<ExtractedProduct> {
    const itemId = extractItemId(url);
    const productId = extractProductId(url);

    // ── Path 1: OAuth API ──────────────────────────────────────────────────
    if (hasMlCredentials()) {
      try {
        return await this.extractWithApi(url, itemId, productId, affiliateLink);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Extração via API do Mercado Livre falhou: ${msg}`);
      }
    }

    // ── Path 2: Page scraping ──────────────────────────────────────────────
    try {
      return await this.extractFromPage(url, itemId, affiliateLink);
    } catch {
      throw new Error(
        "O Mercado Livre bloqueou a extração a partir deste servidor (IP de nuvem).\n\n" +
        "Para ativar a extração real:\n" +
        "1. Crie um app GRÁTIS em https://developers.mercadolivre.com.br/\n" +
        "2. Adicione ML_APP_ID e ML_APP_SECRET como variáveis de ambiente.\n\n" +
        "Com as credenciais configuradas, a extração funciona perfeitamente."
      );
    }
  }

  private async extractWithApi(
    url: string,
    itemId: string | null,
    productId: string | null,
    affiliateLink?: string | null
  ): Promise<ExtractedProduct> {
    const token = await getMlAccessToken();
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };

    // Product Group URL (/p/MLB...) → get items for the product, pick first
    if (productId && !itemId) {
      const prodRes = await apiFetch(
        `https://api.mercadolibre.com/products/${productId}`,
        authHeaders
      );
      if (prodRes.status !== 200) {
        throw new Error(`Products API retornou ${prodRes.status}`);
      }
      const prodData = (await prodRes.json()) as { name: string; pictures?: Array<{ url: string }> };

      // Search for the cheapest item
      const searchRes = await apiFetch(
        `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(prodData.name)}&limit=1`,
        authHeaders
      );
      if (searchRes.status !== 200) throw new Error("Busca falhou");
      const searchData = (await searchRes.json()) as { results: MlItem[] };
      const item = searchData.results[0];
      if (!item) throw new Error("Nenhum item encontrado");
      return buildProduct(item, affiliateLink, prodData.pictures?.[0]?.url);
    }

    // Direct item URL (MLB...)
    if (itemId) {
      const res = await apiFetch(
        `https://api.mercadolibre.com/items/${itemId}`,
        authHeaders
      );
      if (res.status !== 200) throw new Error(`Items API retornou ${res.status}`);
      const data = (await res.json()) as MlItem;
      return buildProduct(data, affiliateLink);
    }

    throw new Error("Não foi possível identificar o produto no link do Mercado Livre.");
  }

  private async extractFromPage(
    url: string,
    itemId: string | null,
    affiliateLink?: string | null
  ): Promise<ExtractedProduct> {
    const fetchUrl = itemId
      ? `https://www.mercadolivre.com.br/p/${itemId}`
      : url;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);

    const res = await fetch(fetchUrl, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`ML página retornou ${res.status}`);

    const html = await res.text();

    if (html.length < 5000) throw new Error("Página sem dados de produto");

    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr("content") ||
      $("h1.ui-pdp-title").text().trim() ||
      $("title").text().replace(/\s*[-|].*$/, "").trim();

    const imageUrl =
      $('meta[property="og:image"]').attr("content") ||
      $("img.ui-pdp-image").first().attr("src") || "";

    // JSON-LD structured data
    let currentPrice = "";
    let originalPrice: string | null = null;

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || "{}") as Record<string, unknown>;
        if (data["@type"] === "Product" && data.offers) {
          const offers = data.offers as Record<string, unknown>;
          const price = offers.price as number;
          currentPrice = formatBRL(price);
        }
      } catch {
        // ignore
      }
    });

    // Reject generic platform branding — means we got the JS shell, not a product page
    const GENERIC_TITLES = ["mercado libre", "mercado livre", "ml", ""];
    if (!title || GENERIC_TITLES.includes(title.toLowerCase().trim())) {
      throw new Error("Página sem dados de produto específico.");
    }

    return {
      platform: "mercadolivre",
      title,
      shortTitle: shortenTitle(title),
      currentPrice: currentPrice || "Preço indisponível",
      originalPrice,
      discountPercentage: null,
      imageUrl,
      productUrl: url,
      affiliateLink: affiliateLink ?? null,
    };
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Extract ML item ID (MLBxxxxxxxx) from any ML URL */
function extractItemId(url: string): string | null {
  const m = url.match(/MLB-?(\d{6,})/i);
  if (m && !url.includes("/p/MLB")) return `MLB${m[1]}`;
  return null;
}

/** Extract ML product (catalog) ID from /p/MLB... URLs */
function extractProductId(url: string): string | null {
  const m = url.match(/\/p\/(MLB\d+)/i);
  return m ? m[1] : null;
}

function buildProduct(
  item: MlItem,
  affiliateLink?: string | null,
  overrideImage?: string
): ExtractedProduct {
  const currentPrice = formatBRL(item.price);
  const originalPrice =
    item.original_price && item.original_price > item.price
      ? formatBRL(item.original_price)
      : null;

  const discountPercentage =
    item.original_price && item.original_price > item.price
      ? Math.round(((item.original_price - item.price) / item.original_price) * 100)
      : null;

  const imageUrl =
    overrideImage ||
    pickBestImage(item.pictures) ||
    item.thumbnail?.replace("-I.", "-O.") ||
    "";

  return {
    platform: "mercadolivre",
    title: item.title,
    shortTitle: shortenTitle(item.title),
    currentPrice,
    originalPrice,
    discountPercentage,
    imageUrl,
    productUrl: item.permalink ?? item.id ? `https://www.mercadolivre.com.br/MLB${item.id}` : "",
    affiliateLink: affiliateLink ?? null,
  };
}

function pickBestImage(pictures?: Array<{ url: string; secure_url?: string }>): string {
  if (!pictures?.length) return "";
  const src = pictures[0].secure_url || pictures[0].url;
  return src.replace(/-[A-Z]\.([a-z]+)$/, "-O.$1");
}

async function apiFetch(url: string, headers: Record<string, string>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  const res = await fetch(url, { headers, signal: controller.signal });
  clearTimeout(timer);
  return res;
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1",
};

interface MlItem {
  id?: string;
  title: string;
  price: number;
  original_price?: number | null;
  permalink?: string;
  thumbnail?: string;
  pictures?: Array<{ url: string; secure_url?: string }>;
}
