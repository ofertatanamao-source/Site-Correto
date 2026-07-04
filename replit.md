# Tá na Mão

A mobile-first web app for Brazilian affiliate marketers to extract product info from Amazon Brasil, Shopee Brasil, and Mercado Livre Brasil and generate ready-to-post promotional content.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/ta-na-mao run dev` — run the frontend (port 21456)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + Tailwind + shadcn/ui + Framer Motion + wouter

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle ORM schema (history, promotions, templates tables)
- `artifacts/api-server/src/routes/` — Express route handlers (products, promotions, templates)
- `artifacts/api-server/src/services/extractor/` — modular product extractor (Amazon, Shopee, ML)
- `artifacts/api-server/src/services/promotionGenerator.ts` — WhatsApp/Instagram/Telegram/Script text generator
- `artifacts/ta-na-mao/src/` — React frontend (pages: home, result, historico, favoritos, templates)

## Architecture decisions

- **Modular extractor pattern:** Each platform (Amazon, Shopee, ML) has its own class implementing `ProductExtractor`. Adding a new platform = adding a new class and registering it in `extractor/index.ts`. No other files need to change.
- **API-first, codegen-driven:** OpenAPI spec defines the contract → Orval generates typed React Query hooks and Zod validators. Never hand-write types that codegen produces.
- **Mock-first extraction:** Extractors return realistic demo data until real API credentials are wired in. MercadoLivre extractor actually calls the public Mercado Livre Items API when a valid MLB ID is detected.
- **Text generation is pure server-side:** WhatsApp, Instagram, Telegram, and 15-sec script are generated from templates on the server — no AI cost, instant generation.
- **Image generation scaffolded:** Story (1080x1920) and Feed (1080x1350) image URLs are stored in the promotions table, ready for an image generation service to populate.

## Product

- Home: paste a product URL, click "Gerar Promoção" — auto-detects platform (Amazon/Shopee/ML)
- Result: product card + 6 promotional content tabs (WhatsApp, Instagram caption, Telegram, 15-sec script, Story preview, Feed preview) — all with Copy/Download buttons
- Histórico: scrollable history of extracted products with favorites toggle and delete
- Favoritos: filtered view of favorited products
- Templates: upload and manage custom Instagram Story templates

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run codegen after every OpenAPI spec change: `pnpm --filter @workspace/api-spec run codegen`
- Body schema names in OpenAPI must use entity-shaped names (e.g. `NoteInput`), never `CreateNoteBody` — Orval auto-generates that name and a collision causes TS2308
- MercadoLivre extractor calls the public Mercado Livre Items API when a valid `MLB\d+` ID is in the URL — this is the only extractor with a real live API call
- `DATABASE_URL` is already set via Replit's built-in Postgres provisioning

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Extractor scaffold: `artifacts/api-server/src/services/extractor/` — add new platforms here
- To integrate Amazon PA API: update `amazonExtractor.ts` with real credentials
- To integrate Shopee Open Platform: update `shopeeExtractor.ts` with real credentials
