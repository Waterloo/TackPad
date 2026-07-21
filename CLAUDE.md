# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

TackPad v2 — a freeform canvas whiteboard app. This is the Nuxt 4 scaffold repo. The full architecture blueprint is in `migration_plan.md`.

## Commands

```bash
pnpm dev              # Start dev server (localhost:3000)
pnpm build            # Build for production (Cloudflare Workers)
pnpm preview          # Preview production build locally

pnpm db:generate      # Generate SQL migrations from schema changes (drizzle-kit)
pnpm db:migrate-local # Apply migrations to local D1 (via wrangler)
pnpm db:migrate-prod  # Apply migrations to production D1 (--remote)
```

No test suite is configured yet.

## Stack

- **Nuxt 4** with `app/` directory layout (ESM, `"type": "module"`)
- **Cloudflare Workers** as the runtime (Nitro preset: `cloudflare_module`)
- **Cloudflare D1** (SQLite-compatible) as the database, bound as `DB`
- **Drizzle ORM** for type-safe queries; schema in `server/db/schema.ts`
- **Wrangler** for local D1 dev and deployment

## Architecture

### Database / Server

`server/utils/db.ts` exports `useDrizzle(event)` — the standard pattern for all API routes:

```ts
// Access D1 from the Cloudflare binding on the H3 event context
export function useDrizzle(event: H3Event) {
  const d1 = event.context.cloudflare.env.DB
  return drizzle(d1, { schema })
}
```

`server/types/env.d.ts` augments the H3 module to type `event.context.cloudflare.env` with `DB: D1Database` and `ASSETS: Fetcher`.

### Planned State Management (see `migration_plan.md`)

- **Yjs** is the single source of truth for board canvas state (`Y.Doc`)
  - `WebsocketProvider` for real-time collaboration
  - `IndexeddbPersistence` for offline support
- **Pinia stores are reactive views of Yjs** — writes go through `Y.Map`, never directly to Pinia
  - `stores/board.ts` — canvas items, board save/load
  - `stores/ui.ts` — selection, modals, toolbar
  - `stores/auth.ts` — user session

### Planned Canvas Engine

- 20,000×20,000px `div` with `transform: translate3d + scale` (GPU-accelerated)
- Coordinate origin is centered: widget position `(0,0)` = screen center at 1:1 zoom
- Hybrid HTML (widgets) + SVG (future drawing layer)

### Planned Auth

- Every visitor gets an anonymous profile automatically (no login required)
- Anonymous → OAuth upgrade path preserves all data
- `nuxt-auth-utils` for encrypted session cookies
- Server middleware guards all `/api/*` routes

### Planned DB Schema (7 tables)

`profiles`, `profile_authentications`, `boards`, `board_access`, `uploads`, `usage_quotas`, `api_tokens`

Refer to `migration_plan.md` for the complete column definitions and access patterns.
