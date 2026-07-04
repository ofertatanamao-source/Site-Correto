import { AmazonExtractor } from "./amazonExtractor.js";
import { ShopeeExtractor } from "./shopeeExtractor.js";
import { MercadoLivreExtractor } from "./mercadolivreExtractor.js";
import type { ExtractedProduct, Platform } from "./types.js";

export type { ExtractedProduct, Platform };
export { shortenTitle } from "./titleShortener.js";

const extractors = [
  new AmazonExtractor(),
  new ShopeeExtractor(),
  new MercadoLivreExtractor(),
];

export function detectPlatform(url: string): Platform | null {
  for (const extractor of extractors) {
    if (extractor.canHandle(url)) return extractor.platform;
  }
  return null;
}

export async function extractProduct(
  url: string,
  affiliateLink?: string | null
): Promise<ExtractedProduct> {
  for (const extractor of extractors) {
    if (extractor.canHandle(url)) {
      return extractor.extract(url, affiliateLink);
    }
  }
  throw new Error(`URL não reconhecida. Suportamos Amazon, Shopee e Mercado Livre Brasil.`);
}
