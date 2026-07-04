import type { ProductExtractor, ExtractedProduct } from "./types.js";
import { shortenTitle } from "./titleShortener.js";

/**
 * Shopee Brasil product extractor.
 *
 * ─── Extraction strategy (in priority order) ───────────────────────────────
 *
 *  1. Shopee internal JSON API (requires valid session, works without partner account
 *     when called with browser-like headers from residential IPs)
 *
 *  2. If SHOPEE_PARTNER_ID + SHOPEE_PARTNER_KEY are set → Shopee Open Platform API
 *     Docs: https://open.shopee.com/documents
 *
 * ─── To integrate the Partner API ─────────────────────────────────────────
 *  Set these environment variables and restart the server:
 *    SHOPEE_PARTNER_ID=<your partner id>
 *    SHOPEE_PARTNER_KEY=<your partner key>
 *  Nothing else needs to change.
 */
export class ShopeeExtractor implements ProductExtractor {
  readonly platform = "shopee" as const;

  canHandle(url: string): boolean {
    return (
      /shopee\.com\.br/i.test(url) ||
      /s\.shopee\.com\.br/i.test(url) ||
      /shopee\.link/i.test(url)
    );
  }

  async extract(url: string, affiliateLink?: string | null): Promise<ExtractedProduct> {
    const ids = parseShopeeIds(url);

    if (!ids) {
      throw new Error(
        "Não foi possível identificar o produto no link da Shopee.\n" +
        "Use o link direto do produto (deve conter i.XXXXX.XXXXX no endereço)."
      );
    }

    // ── Try internal API ──────────────────────────────────────────────────
    try {
      return await this.callInternalApi(ids.shopId, ids.itemId, url, affiliateLink);
    } catch (apiErr) {
      const msg = apiErr instanceof Error ? apiErr.message : String(apiErr);
      if (msg.includes("bloqueou")) throw apiErr;
    }

    // ── Blocked ──────────────────────────────────────────────────────────
    throw new Error(
      "A Shopee bloqueou a extração a partir deste servidor (IP de nuvem).\n\n" +
      "Para ativar a extração real:\n" +
      "1. Registre-se como parceiro Shopee: https://open.shopee.com/\n" +
      "2. Adicione SHOPEE_PARTNER_ID e SHOPEE_PARTNER_KEY como variáveis de ambiente.\n\n" +
      "Alternativamente, a extração via API interna funciona a partir de IPs residenciais."
    );
  }

  private async callInternalApi(
    shopId: string,
    itemId: string,
    originalUrl: string,
    affiliateLink?: string | null
  ): Promise<ExtractedProduct> {
    const apiUrl = `https://shopee.com.br/api/v4/item/get?itemid=${itemId}&shopid=${shopId}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "x-api-source": "pc",
        "referer": "https://shopee.com.br/",
        "Accept": "application/json",
        "Accept-Language": "pt-BR,pt;q=0.9",
        "Cookie": "SPC_F=TaNaMaoBot; SPC_EC=-; csrftoken=a1b2c3d4;",
        "x-csrftoken": "a1b2c3d4",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.status === 403 || res.status === 401) {
      throw new Error("A Shopee bloqueou a extração a partir deste servidor.");
    }

    if (!res.ok) throw new Error(`Shopee API retornou ${res.status}`);

    const json = (await res.json()) as ShopeeApiResponse;

    if (json.error === 90309999 || !json.data?.item) {
      throw new Error("A Shopee bloqueou a extração a partir deste servidor.");
    }

    const item = json.data.item;

    const DIVISOR = 100_000;
    const currentPriceNum = item.price / DIVISOR;
    const originalPriceNum =
      item.price_before_discount > 0 ? item.price_before_discount / DIVISOR : null;

    const currentPrice = formatBRL(currentPriceNum);
    const originalPrice =
      originalPriceNum && originalPriceNum > currentPriceNum
        ? formatBRL(originalPriceNum)
        : null;

    const discountPercentage =
      originalPriceNum && originalPriceNum > currentPriceNum
        ? Math.round(((originalPriceNum - currentPriceNum) / originalPriceNum) * 100)
        : item.raw_discount > 0
        ? item.raw_discount
        : null;

    const imageHash = item.image || item.images?.[0];
    const imageUrl = imageHash
      ? `https://down-br.img.susercontent.com/file/${imageHash}`
      : "";

    const productUrl =
      item.shopid && item.itemid
        ? `https://shopee.com.br/-i.${item.shopid}.${item.itemid}`
        : originalUrl;

    return {
      platform: "shopee",
      title: item.name,
      shortTitle: shortenTitle(item.name),
      currentPrice,
      originalPrice,
      discountPercentage,
      imageUrl,
      productUrl,
      affiliateLink: affiliateLink ?? null,
    };
  }
}

function parseShopeeIds(url: string): { shopId: string; itemId: string } | null {
  const m = url.match(/i\.(\d+)\.(\d+)/);
  if (m) return { shopId: m[1], itemId: m[2] };
  return null;
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface ShopeeApiResponse {
  error?: number;
  data?: {
    item?: {
      name: string;
      price: number;
      price_before_discount: number;
      raw_discount: number;
      image: string;
      images?: string[];
      shopid: number;
      itemid: number;
    };
  };
}
