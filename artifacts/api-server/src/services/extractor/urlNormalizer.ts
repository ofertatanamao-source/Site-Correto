/**
 * URL normalization for affiliate links.
 *
 * Affiliate links come in many forms:
 *   - amzn.to/xxxxxxx (Amazon short links)
 *   - amazon.com.br/dp/ASIN?tag=xxx&linkId=xxx&ascsubtag=xxx&ref=xxx
 *   - s.shopee.com.br/xxxxxxx (Shopee short links)
 *   - mercadolivre.com.br/... with tracking params
 *
 * Strategy:
 *   1. Never reject a URL because it has tracking parameters.
 *   2. For short links (amzn.to, s.shopee.com.br, etc.), follow HTTP redirects
 *      to discover the real product URL used for platform detection.
 *   3. The original pasted URL is always preserved as the affiliate link.
 */

const SHORT_LINK_PATTERNS = [
  /amzn\.to/i,
  /amzn\.com/i,
  /s\.shopee\.com\.br/i,
  /shopee\.link/i,
  /meli\.com/i,
  /mercadolivre\.com\/s\//i,
];

/**
 * Returns true if the URL is a known short/redirect link that needs resolution.
 */
export function isShortLink(url: string): boolean {
  return SHORT_LINK_PATTERNS.some((p) => p.test(url));
}

/**
 * Follows HTTP redirects and returns the final destination URL.
 * If resolution fails for any reason, returns the original URL unchanged.
 */
export async function resolveRedirects(url: string, timeoutMs = 8000): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    });

    clearTimeout(timer);

    // response.url is the final URL after all redirects
    if (response.url && response.url !== url) {
      return response.url;
    }
    return url;
  } catch {
    // If HEAD fails (some servers block HEAD), try GET with a range to avoid downloading the body
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
          "Accept-Language": "pt-BR,pt;q=0.9",
          Range: "bytes=0-0",
        },
      });

      clearTimeout(timer);

      if (response.url && response.url !== url) {
        return response.url;
      }
    } catch {
      // Fall through — return original URL
    }
    return url;
  }
}

/**
 * Normalize a raw user-pasted URL:
 * - If it's a short link, resolve redirects to get the real product URL.
 * - Otherwise return as-is (tracking params are fine, never stripped).
 *
 * Returns { resolvedUrl, affiliateLink } where:
 *   - resolvedUrl: the URL to use for platform detection + extraction
 *   - affiliateLink: the original pasted URL (always preserved as the affiliate link)
 */
export async function normalizeAffiliateUrl(
  rawUrl: string,
  explicitAffiliateLink?: string | null
): Promise<{ resolvedUrl: string; affiliateLink: string }> {
  // Trim whitespace and common copy-paste artifacts
  const cleaned = rawUrl.trim().replace(/[\u200B-\u200D\uFEFF]/g, "");

  // Ensure it has a protocol
  const url = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;

  // The original URL is always the affiliate link unless the caller provided one explicitly
  const affiliateLink = explicitAffiliateLink ?? url;

  if (isShortLink(url)) {
    const resolvedUrl = await resolveRedirects(url);
    return { resolvedUrl, affiliateLink };
  }

  return { resolvedUrl: url, affiliateLink };
}
