---
name: Platform extraction blocking
description: All three BR e-commerce platforms (Amazon, Shopee, ML) block cloud provider (GCP/Replit) IPs for both API and page scraping. Credential-based API paths are implemented per-extractor.
---

## The rule
Do NOT assume scraping works from Replit/GCP IPs. All three platforms return 403 or empty JS shells.

**Why:** Amazon, Shopee, and Mercado Livre all run bot-detection that blocks cloud provider IP ranges (GCP, AWS, Azure).

**How to apply:** When debugging extraction failures from Replit, the issue is always the IP, not the code. Direct users to set the appropriate env vars.

## Per-platform credential paths

| Platform | Env vars needed | Registration |
|---|---|---|
| Mercado Livre | `ML_APP_ID`, `ML_APP_SECRET` | FREE at developers.mercadolivre.com.br — OAuth client_credentials flow, token cached 6h |
| Amazon | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AMAZON_ASSOCIATE_TAG` | Amazon Associates + PA API 5.0 |
| Shopee | `SHOPEE_PARTNER_ID`, `SHOPEE_PARTNER_KEY` | Shopee Open Platform partner account |

## What works without credentials
- Scraping code is correctly written — it WILL work from residential/non-cloud IPs
- ML page scraping: page returns 200 but is a 35KB JS shell with only generic OG tags ("Mercado Libre" title) — extractor detects this and throws a proper error
- Amazon: returns 500 or CAPTCHA page from cloud IPs
- Shopee internal API: returns error code 90309999 from cloud IPs

## ML OAuth implementation
- `mlAuth.ts` — `getMlAccessToken()` does client_credentials flow, caches token in memory
- `hasMlCredentials()` — checks env vars before attempting OAuth
- Product Group URLs (`/p/MLB...`) → uses `/products/{id}` then searches by name
- Item URLs (`MLB...`) → uses `/items/{id}` directly
