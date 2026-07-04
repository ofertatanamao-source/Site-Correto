export type Platform = "amazon" | "shopee" | "mercadolivre";

export interface ExtractedProduct {
  platform: Platform;
  title: string;
  shortTitle: string;
  currentPrice: string;
  originalPrice: string | null;
  discountPercentage: number | null;
  imageUrl: string;
  productUrl: string;
  affiliateLink: string | null;
}

export interface ProductExtractor {
  platform: Platform;
  canHandle(url: string): boolean;
  extract(url: string, affiliateLink?: string | null): Promise<ExtractedProduct>;
}
