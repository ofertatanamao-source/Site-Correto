/**
 * Mercado Livre OAuth client-credentials helper.
 *
 * To enable real extraction:
 *   1. Register a free app at https://developers.mercadolivre.com.br/
 *   2. Set ML_APP_ID and ML_APP_SECRET as environment variables.
 *
 * Without these, ML extraction is attempted via page scraping which may
 * be blocked on cloud server IPs.
 */

interface TokenCache {
  token: string;
  expiresAt: number; // unix ms
}

let cache: TokenCache | null = null;

export function hasMlCredentials(): boolean {
  return !!(process.env.ML_APP_ID && process.env.ML_APP_SECRET);
}

export async function getMlAccessToken(): Promise<string> {
  const now = Date.now();

  if (cache && cache.expiresAt > now + 60_000) {
    return cache.token;
  }

  const res = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.ML_APP_ID!,
      client_secret: process.env.ML_APP_SECRET!,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ML OAuth falhou (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cache = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return cache.token;
}
