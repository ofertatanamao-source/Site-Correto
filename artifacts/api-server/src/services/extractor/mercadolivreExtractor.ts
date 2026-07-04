import type { ProductExtractor, ExtractedProduct } from "./types.js";
import { shortenTitle } from "./titleShortener.js";

/**
 * Mercado Livre Brasil product extractor.
 *
 * NOTE: This is a scaffold for future API integration.
 * Currently returns mock data based on URL detection.
 * Replace the extract() method body with the Mercado Livre API
 * when credentials are available.
 *
 * The Mercado Livre API is publicly available and free for basic access:
 * https://developers.mercadolivre.com.br/
 *
 * For the real implementation, parse the item ID from the URL
 * (e.g. MLB123456789) and call:
 * GET https://api.mercadolibre.com/items/{item_id}
 */
export class MercadoLivreExtractor implements ProductExtractor {
  readonly platform = "mercadolivre" as const;

  canHandle(url: string): boolean {
    return /mercadolivre\.com\.br/i.test(url) || /mercadolibre\.com\.br/i.test(url) || /meli\.com/i.test(url);
  }

  async extract(url: string, affiliateLink?: string | null): Promise<ExtractedProduct> {
    // TODO: Replace with Mercado Livre Items API
    // GET https://api.mercadolibre.com/items/{item_id}
    // item_id can be extracted from URL: /MLB(\d+)/

    const itemIdMatch = url.match(/MLB(\d+)/i);
    if (itemIdMatch) {
      try {
        const itemId = `MLB${itemIdMatch[1]}`;
        const response = await fetch(`https://api.mercadolibre.com/items/${itemId}`);
        if (response.ok) {
          const data = await response.json() as {
            title: string;
            price: number;
            original_price: number | null;
            pictures?: Array<{ url: string }>;
            permalink: string;
          };
          const currentPrice = formatBRL(data.price);
          const originalPrice = data.original_price ? formatBRL(data.original_price) : null;
          const discountPercentage =
            data.original_price && data.price < data.original_price
              ? Math.round(((data.original_price - data.price) / data.original_price) * 100)
              : null;

          return {
            platform: "mercadolivre",
            title: data.title,
            shortTitle: shortenTitle(data.title),
            currentPrice,
            originalPrice,
            discountPercentage,
            imageUrl: data.pictures?.[0]?.url ?? "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop",
            productUrl: data.permalink,
            affiliateLink: affiliateLink ?? null,
          };
        }
      } catch {
        // Fall through to mock data
      }
    }

    // Demo mock for development
    const title = "Samsung Galaxy A55 5G 128GB 8GB RAM Câmera Tripla 50MP";
    return {
      platform: "mercadolivre",
      title,
      shortTitle: shortenTitle(title),
      currentPrice: "R$ 1.899,00",
      originalPrice: "R$ 2.499,00",
      discountPercentage: 24,
      imageUrl:
        "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop",
      productUrl: url,
      affiliateLink: affiliateLink ?? null,
    };
  }
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
