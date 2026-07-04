import type { ProductExtractor, ExtractedProduct } from "./types.js";
import { shortenTitle } from "./titleShortener.js";

/**
 * Amazon Brasil product extractor.
 *
 * NOTE: This is a scaffold for future API integration.
 * Currently returns mock data based on URL detection.
 * Replace the extract() method body with real Amazon Product Advertising API
 * or a scraping service call when credentials are available.
 */
export class AmazonExtractor implements ProductExtractor {
  readonly platform = "amazon" as const;

  canHandle(url: string): boolean {
    return /amazon\.com\.br/i.test(url) || /amzn\.to/i.test(url);
  }

  async extract(url: string, affiliateLink?: string | null): Promise<ExtractedProduct> {
    // TODO: Replace with Amazon Product Advertising API 5.0
    // Credentials needed: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AMAZON_ASSOCIATE_TAG
    // Docs: https://webservices.amazon.com/paapi5/documentation/

    // For now, return a realistic mock product for development/demo
    const title =
      "Philips Walita RI7635/01 Liquidificador Pro Xtreme 1000W 2L Jarra de Vidro";
    return {
      platform: "amazon",
      title,
      shortTitle: shortenTitle(title),
      currentPrice: "R$ 299,90",
      originalPrice: "R$ 459,90",
      discountPercentage: 35,
      imageUrl:
        "https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=400&h=400&fit=crop",
      productUrl: url,
      affiliateLink: affiliateLink ?? null,
    };
  }
}
