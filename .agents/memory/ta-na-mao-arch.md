---
name: Ta na Mao architecture
description: Key decisions for the Tá na Mão affiliate marketing tool
---

## Extractor pattern
Each platform has its own class implementing `ProductExtractor` in `artifacts/api-server/src/services/extractor/`. Adding a new platform = new class + register in `index.ts`. No other files change.

**Why:** User explicitly asked for modular architecture to add real APIs later.

**How to apply:** When wiring real Amazon PA API or Shopee Open Platform, only edit the matching extractor file.

## MercadoLivre real API
ML extractor calls `https://api.mercadolibre.com/items/{item_id}` when a valid `MLB\d+` is detected in the URL. Falls through to mock data on failure.

## Text generation
All promotional texts (WhatsApp, Instagram, Telegram, 15-sec script) are generated server-side in `promotionGenerator.ts` using template functions — no AI cost.

## Image generation
Story (1080x1920) and Feed (1080x1350) image URLs stored as nullable columns in promotions table. Frontend renders a CSS preview. A real image service can populate these later.
