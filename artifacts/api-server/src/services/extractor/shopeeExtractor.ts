import type { ProductExtractor, ExtractedProduct } from "./types.js";
import { shortenTitle } from "./titleShortener.js";

/**
 * Shopee Brasil product extractor.
 *
 * NOTE: This is a scaffold for future API integration.
 * Currently returns mock data based on URL detection.
 * Replace the extract() method body with Shopee Open Platform API
 * when partner credentials are available.
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
    // TODO: Replace with Shopee Open Platform API
    // Credentials needed: SHOPEE_PARTNER_ID, SHOPEE_PARTNER_KEY
    // Docs: https://open.shopee.com/documents

    const title =
      "Tênis Feminino Nike Air Max SC Feminino Caminhada Corrida Academia";
    return {
      platform: "shopee",
      title,
      shortTitle: shortenTitle(title),
      currentPrice: "R$ 189,90",
      originalPrice: "R$ 319,90",
      discountPercentage: 41,
      imageUrl:
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop",
      productUrl: url,
      affiliateLink: affiliateLink ?? null,
    };
  }
}
