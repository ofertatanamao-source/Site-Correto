import { AmazonExtractor } from "./amazonExtractor.js";
import { ShopeeExtractor } from "./shopeeExtractor.js";
import { MercadoLivreExtractor } from "./mercadolivreExtractor.js";
import { normalizeAffiliateUrl } from "./urlNormalizer.js";
import type { ExtractedProduct, Platform } from "./types.js";

export type { ExtractedProduct, Platform };
export { shortenTitle } from "./titleShortener.js";
export { normalizeAffiliateUrl } from "./urlNormalizer.js";

const extractors = [
  new AmazonExtractor(),
  new ShopeeExtractor(),
  new MercadoLivreExtractor(),
];

/**
 * Detect which platform a URL belongs to.
 * Works on both resolved and raw affiliate URLs.
 */
export function detectPlatform(url: string): Platform | null {
  for (const extractor of extractors) {
    if (extractor.canHandle(url)) return extractor.platform;
  }
  return null;
}

/**
 * Extract product info from a URL.
 *
 * Handles:
 * - Direct product URLs (amazon.com.br, shopee.com.br, mercadolivre.com.br)
 * - Affiliate links with tracking params (tag=, linkId=, ascsubtag=, ref=, etc.)
 * - Short links that redirect (amzn.to, s.shopee.com.br, meli.com, etc.)
 *
 * The original rawUrl is preserved as the affiliateLink unless
 * the caller passes an explicit affiliateLink override.
 */
export async function extractProduct(
  rawUrl: string,
  explicitAffiliateLink?: string | null
): Promise<ExtractedProduct> {
  const { resolvedUrl, affiliateLink } = await normalizeAffiliateUrl(
    rawUrl,
    explicitAffiliateLink
  );

  for (const extractor of extractors) {
    if (extractor.canHandle(resolvedUrl)) {
      return extractor.extract(resolvedUrl, affiliateLink);
    }
  }

  // If resolution didn't help, try the raw URL as a fallback
  for (const extractor of extractors) {
    if (extractor.canHandle(rawUrl)) {
      return extractor.extract(rawUrl, affiliateLink);
    }
  }

  throw new Error(
    "URL não reconhecida. Suportamos links de Amazon, Shopee e Mercado Livre Brasil, incluindo links de afiliados e encurtados."
  );
}
