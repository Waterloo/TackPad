# TackPad v2 — Nuxt 4 Migration Plan

## Context

TackPad is a freeform canvas productivity app built on Nuxt 3 + NuxtHub over 3-4 months of incremental development. The codebase works but suffers from patchy architecture, complex dual-state management (Pinia + Yjs), 12 layered DB migrations, and fragmented stores. This rebuild creates a coherent, well-architected version in Nuxt 4 deployed to Cloudflare Workers, keeping all features but with a clean foundation designed to support future drawing/diagram mode, multi-select/grouping, and external integrations (web extension, Telegram bot).

**Key architectural shifts:**
- Yjs becomes the **single source of truth** for board data (Pinia is a reactive view)
- Hybrid HTML + SVG canvas (HTML widgets + SVG layer for future drawings)
- Clean database schema from scratch (no migration layers)
- Self-hosted Cloudflare Workers deployment (no NuxtHub Admin)
- Nuxt 4 `app/` directory structure

**Dropped:** Client-side encryption, SSE notifications, NuxtHub Admin
**Deferred to Phase 2:** Telegram bot consent page, bookmarklet

---

## Project Directory Structure (Nuxt 4)

```
tackpad-v2/
├── app/                          # Client-side application code
│   ├── assets/
│   │   └── css/
│   │       └── main.css          # Tailwind + PrimeVue layer config
│   ├── components/
│   │   ├── board/
│   │   │   ├── BoardCanvas.vue       # Main canvas container (pan/zoom/grid)
│   │   │   ├── BoardHeader.vue       # Title, board list dropdown
│   │   │   ├── BoardToolbar.vue      # Bottom creation toolbar
│   │   │   ├── CommandPalette.vue     # Ctrl+K command palette
│   │   │   └── SvgLayer.vue          # SVG overlay for future drawings
│   │   ├── widgets/
│   │   │   ├── WidgetWrapper.vue      # Universal widget container
│   │   │   ├── WidgetOptions.vue      # Teleport-based custom options
│   │   │   ├── StickyNote.vue
│   │   │   ├── TodoList.vue
│   │   │   ├── LinkItem.vue
│   │   │   ├── Timer.vue
│   │   │   ├── TextWidget.vue
│   │   │   ├── ImageWidget.vue
│   │   │   ├── AudioWidget.vue
│   │   │   ├── FileWidget.vue
│   │   │   └── Tacklet.vue
│   │   ├── pip/
│   │   │   └── PiPWidgetWrapper.vue
│   │   ├── profile/
│   │   │   ├── ProfilePopup.vue
│   │   │   ├── UserTab.vue
│   │   │   ├── SettingsTab.vue
│   │   │   ├── BoardSharePopup.vue
│   │   │   ├── UsageIndicator.vue
│   │   │   └── BackupPanel.vue
│   │   ├── zoom/
│   │   │   ├── ZoomControls.vue
│   │   │   └── MiniMap.vue
│   │   └── ui/
│   │       ├── ColorPicker.vue       # Tailwind-only color swatch picker
│   │       ├── OfflineIndicator.vue  # Tailwind status dot
│   │       ├── UploadPopover.vue
│   │       └── VoiceRecorder.vue
│   │       # Note: Dialog, Toast, Drawer come from PrimeVue directly — no wrappers
│   ├── composables/
│   │   ├── canvas/
│   │   │   ├── usePanZoom.ts          # Pan, zoom, pinch logic
│   │   │   ├── useGesture.ts          # Touch gesture handling
│   │   │   └── useCanvasCoords.ts     # Coordinate math utilities
│   │   ├── yjs/
│   │   │   ├── useYjsDocument.ts      # Y.Doc lifecycle, providers
│   │   │   ├── useYjsBoard.ts         # Y.Map<BoardItem> operations
│   │   │   └── useYjsPresence.ts      # Awareness protocol, active users
│   │   ├── widgets/
│   │   │   ├── useWidgetDrag.ts       # Drag-to-move logic
│   │   │   ├── useWidgetResize.ts     # Resize handle logic
│   │   │   ├── useWidgetSelection.ts  # Click/select, multi-select (future)
│   │   │   └── useWidgetFactory.ts    # Create widgets at viewport center
│   │   ├── useClipboard.ts
│   │   ├── useGlobalShortcuts.ts
│   │   ├── useUpload.ts
│   │   ├── useModal.ts
│   │   ├── useErrorHandler.ts
│   │   ├── usePiPWindow.ts
│   │   ├── useMiniMap.ts
│   │   └── useUser.ts
│   ├── stores/
│   │   ├── board.ts                # Board state, Yjs bridge, save/load
│   │   ├── ui.ts                   # UI state (selection, modals, toolbar)
│   │   ├── auth.ts                 # User session, profile
│   │   ├── note.ts                 # Sticky note actions
│   │   ├── todo.ts                 # Todo list actions
│   │   ├── link.ts                 # Link widget actions
│   │   ├── timer.ts                # Timer actions
│   │   ├── text.ts                 # Text widget actions
│   │   ├── image.ts                # Image widget actions
│   │   ├── audio.ts                # Audio widget actions
│   │   ├── file.ts                 # File widget actions
│   │   └── tacklet.ts              # Tacklet actions
│   ├── layouts/
│   │   ├── default.vue             # Board layout (minimal)
│   │   ├── content.vue             # Public pages (nav + footer)
│   │   └── pip.vue                 # PiP window (bare)
│   ├── pages/
│   │   ├── board/[id].client.vue   # Main board page
│   │   ├── pip/[id]/[itemId].client.vue  # PiP widget page
│   │   ├── home.vue                # Landing page
│   │   ├── privacy.vue
│   │   ├── tos.vue
│   │   └── contact.vue
│   ├── plugins/
│   │   └── (none initially)
│   ├── utils/
│   │   ├── boardUtils.ts           # applyOptimalZoom, applyOverviewZoom
│   │   └── mapSerialization.ts     # Object↔Map conversion utilities
│   ├── app.vue
│   └── app.config.ts
├── server/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── google.get.ts
│   │   │   └── github.get.ts
│   │   ├── board/
│   │   │   ├── [id]/
│   │   │   │   ├── index.get.ts      # Load board
│   │   │   │   ├── index.delete.ts   # Delete board
│   │   │   │   ├── access.get.ts     # Get access list
│   │   │   │   ├── access.patch.ts   # Update user role
│   │   │   │   ├── access.delete.ts  # Remove user access
│   │   │   │   ├── access-level.patch.ts  # Change board access level
│   │   │   │   └── invite.post.ts    # Invite user
│   │   │   └── list.get.ts           # List user's boards
│   │   ├── save/
│   │   │   └── [id].post.ts          # Save board data
│   │   ├── upload/
│   │   │   ├── [id].post.ts          # Upload file
│   │   │   └── delete.post.ts        # Delete file
│   │   ├── profile/
│   │   │   ├── index.get.ts
│   │   │   ├── index.patch.ts
│   │   │   └── getUsers.post.ts
│   │   ├── metadata.ts               # OG/oEmbed fetch
│   │   └── backup/
│   │       ├── export.post.ts
│   │       └── import.post.ts
│   ├── database/
│   │   ├── schema.ts                 # Single clean Drizzle schema
│   │   └── migrations/               # Generated by drizzle-kit
│   ├── middleware/
│   │   └── auth.ts                   # Auth middleware
│   ├── plugins/
│   │   └── storage.ts                # S3 storage driver mount
│   └── utils/
│       ├── drizzle.ts                # useDrizzle() helper
│       └── auth.ts                   # Auth helper functions
├── shared/
│   ├── types/
│   │   ├── board.ts                  # BoardItem, widget types, Board
│   │   ├── access.ts                 # Access levels, roles
│   │   └── user.ts                   # User, Profile types
│   └── utils/
│       └── board.ts                  # calculateBoardBounds, findAvailablePosition, etc.
├── public/
│   ├── favicon.ico
│   └── scripts/                      # (bookmarklet - Phase 2)
├── themes/
│   └── primevue.ts                   # PrimeVue Aura theme customization
├── nuxt.config.ts
├── wrangler.json                     # Cloudflare Workers + D1 config
├── tailwind.config.js
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

---

## Database Schema (Clean Design)

```sql
-- Core user identity
CREATE TABLE profiles (
  id            TEXT PRIMARY KEY,           -- "usr_<nanoid>"
  first_name    TEXT,
  username      TEXT UNIQUE,                -- Set-once user handle
  email         TEXT,
  anonymous_token TEXT,                     -- SHA-256 of cookie token
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- OAuth provider links (multi-provider support)
CREATE TABLE profile_authentications (
  profile_id       TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider_name    TEXT NOT NULL,            -- "google" | "github"
  provider_user_id TEXT NOT NULL,
  PRIMARY KEY (profile_id, provider_name),
  UNIQUE (provider_name, provider_user_id)
);

-- Boards
CREATE TABLE boards (
  id           TEXT PRIMARY KEY,            -- "BOARD-<NANOID10>"
  owner_id     TEXT REFERENCES profiles(id),
  title        TEXT DEFAULT 'Untitled Board',
  data         TEXT,                         -- JSON: { items: { [id]: BoardItem } }
  access_level TEXT NOT NULL DEFAULT 'public',  -- public | private | view_only
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Fine-grained per-user board access
CREATE TABLE board_access (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id      TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  profile_id    TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'viewer',  -- viewer | editor | owner
  last_accessed TEXT DEFAULT (datetime('now')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (board_id, profile_id)
);

-- File upload tracking
CREATE TABLE uploads (
  id          TEXT PRIMARY KEY,             -- nanoid
  file_url    TEXT NOT NULL,                -- Full URL on S3/CDN
  profile_id  TEXT NOT NULL REFERENCES profiles(id),
  board_id    TEXT REFERENCES boards(id) ON DELETE SET NULL,
  file_name   TEXT,
  file_type   TEXT,
  file_size   INTEGER,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Per-user storage quota
CREATE TABLE usage_quotas (
  profile_id   TEXT PRIMARY KEY REFERENCES profiles(id),
  consumption  INTEGER NOT NULL DEFAULT 0,  -- Bytes used
  quota_limit  INTEGER NOT NULL DEFAULT 26214400,  -- 25MB default
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- API tokens (for web extension / telegram bot integrations - future)
CREATE TABLE api_tokens (
  id          TEXT PRIMARY KEY,
  token       TEXT NOT NULL UNIQUE,
  profile_id  TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT,                          -- "Chrome Extension", "Telegram Bot"
  scopes      TEXT,                          -- JSON array of permitted scopes
  expires_at  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

-- FTS5 search index (raw SQL migration, NOT managed by Drizzle)
-- Lives in server/db/migrations/0001_search_fts.sql
CREATE VIRTUAL TABLE IF NOT EXISTS board_items_fts USING fts5(
  board_id UNINDEXED,
  item_id UNINDEXED,
  kind UNINDEXED,
  owner_id UNINDEXED,
  text                         -- Extracted text content (title + body)
);
-- No triggers: index is rebuilt per-board on each debounced save (DELETE + batch INSERT)
-- Reason: board data arrives as a full JSON blob from Yjs, not row-by-row writes

**Changes from current schema:**
- Removed `board_settings` table (legacy) — replaced by `board_access.last_accessed`
- Moved `title` out of JSON `data` into its own column on `boards`
- Simplified access levels from 5 → 3: `public`, `private`, `view_only` (dropped `limited_edit` and `admin_only` which were confusingly similar)
- Added `created_at`/`updated_at` timestamps to boards
- Added `name` and `scopes` to `api_tokens` for future integrations
- Renamed tables for consistency (snake_case, plurals)
- Board `data` stores items as `{ [id]: BoardItem }` object (not array)

---

## UI Layer Architecture

**Rule: PrimeVue 4 is used sparingly — only for complex overlay and form components where accessibility and keyboard behaviour matter.**

| Layer | Technology |
|---|---|
| Canvas, widgets, toolbar, minimap, zoom controls | **Tailwind CSS + plain CSS** — full custom design |
| WidgetWrapper, drag handles, resize handles | **Tailwind CSS + plain CSS** |
| Board header, command palette | **Tailwind CSS + plain CSS** |
| Dialog (delete confirm, error modal) | **PrimeVue `<Dialog>`** |
| Collapsible sidebar (board list, profile panel) | **PrimeVue `<Drawer>` / `<Panel>`** |
| Board share form, invite inputs | **PrimeVue form components** |
| Toast notifications | **PrimeVue `<Toast>`** |

PrimeVue uses the Aura preset with a minimal customisation (no dark mode). The `tailwindcss-primeui` bridge is installed so PrimeVue design tokens are available as Tailwind utilities if needed for consistency.

---

## Phase 0: Project Setup

**Goal:** Initialize a clean Nuxt 4 project with Cloudflare Workers deployment configured.

### Steps
1. Initialize new Nuxt 4 project: `npx nuxi@latest init tackpad-v2`
2. Set up `app/` directory structure
3. Install core dependencies:
   - `pinia`, `@pinia/nuxt`
   - `@primevue/nuxt-module`, `primevue`, `@primevue/themes`, `tailwindcss-primeui`
   - `@nuxtjs/tailwindcss@^3`, `@tailwindcss/typography`
   - `@nuxt/fonts`
   - `drizzle-orm`, `drizzle-kit`
   - `nuxt-auth-utils`
   - `nanoid`
   - `@vueuse/core`
4. Configure `nuxt.config.ts`:
   ```ts
   import Aura from '@primevue/themes/aura'
   export default defineNuxtConfig({
     modules: ['@nuxtjs/tailwindcss', '@primevue/nuxt-module', '@pinia/nuxt', 'nuxt-auth-utils'],
     nitro: { preset: 'cloudflare_module' },
     primevue: { options: { theme: { preset: Aura, options: { darkModeSelector: false } } } },
     tailwindcss: { cssPath: '~/assets/css/main.css' },
     runtimeConfig: {
       sessionPassword: '',        // NUXT_SESSION_PASSWORD
       public: { websocketUrl: 'ws://localhost:1234' },
     }
   })
   ```
5. D1 binding name is `tackpad_db` (set in `wrangler.jsonc`). All server code references `event.context.cloudflare.env.tackpad_db`.
6. Set up Drizzle config (`drizzle.config.ts`)
7. Copy and adapt PrimeVue theme from `themes/primevue.ts`
8. Set up Tailwind config with Figtree font and typography plugin
9. Create basic `app/app.vue` with Nuxt layout system
10. Verify dev server runs and deploys to CF Workers

**Reuse from old:** `themes/primevue.ts`, `tailwind.config.js`, `.env.example`

---

## Phase 1: Core Foundation — Database & Auth

**Goal:** Clean database schema, auth middleware, and profile API.

### Steps
1. Write `server/database/schema.ts` with full Drizzle schema (all 7 tables above)
2. Run `drizzle-kit generate` to create initial migration
3. Create `server/utils/drizzle.ts` — `useDrizzle()` wrapping `hubDatabase()`
4. Create `server/utils/auth.ts` — token hashing, profile resolution helpers
5. Create `server/middleware/auth.ts`:
   - Same hybrid anonymous + OAuth approach
   - Auto-create anonymous profile on first visit
   - Set `event.context.session` with profileId, username, isAnonymous
   - Public routes allowlist
6. Create OAuth handlers:
   - `server/api/auth/google.get.ts` — Google OAuth with 4-step account linking
   - `server/api/auth/github.get.ts` — GitHub OAuth with same linking
7. Create profile API:
   - `server/api/profile/index.get.ts` — Current user profile + usage
   - `server/api/profile/index.patch.ts` — Update profile (set-once username/email)
   - `server/api/profile/getUsers.post.ts` — Batch user lookup
8. Create S3 storage plugin: `server/plugins/storage.ts`

### Implementation Details

#### Hybrid Anonymous + OAuth Auth System
The app supports two tiers of users without requiring login:

1. **Anonymous users:** On first API call, the server middleware generates a `nanoid()` token, sets it as an `httpOnly` cookie (`user-token`, 400-day expiry), SHA-256 hashes it, and creates a `Profile` row with `anonymous_token = hash`. Every visitor automatically gets a profile — no login required to use the app.

2. **OAuth upgrade:** When a user logs in with Google/GitHub, the system uses a 4-step account linking strategy:
   - Step 1: Check `profile_authentications` for existing OAuth link → reuse that profile
   - Step 2: Check `user-token` cookie → link OAuth provider to the existing anonymous profile (upgrades it)
   - Step 3: Check email match → link OAuth to a profile with the same email
   - Step 4: No match → create a new profile + auth link
   This ensures users never lose their anonymous boards when they sign up.

3. **Session:** Uses `nuxt-auth-utils` with `setUserSession()` / `getUserSession()`. Session encrypted with `NUXT_SESSION_PASSWORD` env var.

4. **Auth middleware flow** (runs on all `/api/*` routes):
   ```
   Request → Check getUserSession() for OAuth session
           → If OAuth: set context.session = { profileId, username, isAnonymous: false }
           → If no OAuth: check user-token cookie
             → If cookie exists: hash it, lookup Profile by anonymous_token
             → If no cookie: generate new token, create new Profile, set cookie
             → Set context.session = { profileId, username: null, isAnonymous: true }
   ```

5. **Public routes** (skip auth enforcement): `auth/*`, `board/[id] GET`, `metadata`, `save/*`. Protected routes return 401 if no identity.

6. **Upload guard:** Uploading files requires OAuth (checks `profile_authentications` has at least one row). Anonymous users cannot upload.

#### Profile Update Rules
- `first_name`: Can be updated freely
- `username`: Set-once — once set, cannot be changed. Must be unique. Checked server-side.
- `email`: Set-once — once set, cannot be changed. Usually auto-populated from OAuth provider.

**Reuse from old:** Auth logic from `server/api/_auth/`, middleware logic, profile API handlers. These are mostly portable with schema name adjustments.

---

## Phase 2: Canvas Engine

**Goal:** Build the board page with canvas, pan/zoom, dot grid, and the SVG layer stub.

### Steps
1. Create `app/pages/board/[id].client.vue` — client-only board page
2. Create `app/components/board/BoardCanvas.vue`:
   - 20,000x20,000px container with CSS transform
   - Centered coordinate origin (`translate(50%, 50%)`)
   - Computed dot grid background
   - GPU-accelerated (`will-change: transform`, `touch-action: none`)
3. Create `app/composables/canvas/usePanZoom.ts`:
   - Space+drag panning, touch panning
   - Ctrl+scroll zoom, pinch-to-zoom
   - Zoom anchored to cursor position
   - Min 0.25, max 1.0 scale
4. Create `app/composables/canvas/useGesture.ts` — touch gesture abstraction
5. Create `app/composables/canvas/useCanvasCoords.ts`:
   - Screen → board coordinate conversion
   - Board → screen coordinate conversion
   - Viewport center calculation
   - (Used by widget creation, minimap, etc.)
6. Create `app/components/board/SvgLayer.vue`:
   - SVG element overlaid on canvas, same transform/coordinate system
   - Empty for now — placeholder for future drawing mode
   - Shares `viewBox` or transform with the HTML layer
   - Positioned via CSS to overlay exactly on the widget layer
   - Pointer events: `none` by default (pass-through to widgets), `all` when drawing mode active (future)

### Implementation Details

#### Canvas Coordinate System
The canvas is a fixed full-screen `div` (viewport) containing a 20,000x20,000px `.board-container` div:
```
Viewport (position: fixed, inset: 0)
  └── .board-container (20,000x20,000px, absolute, left: -10,000, top: -10,000)
        transform: translate3d({translateX}px, {translateY}px, 0) scale({scale})
        transform-origin: center
        └── .origin-wrapper (transform: translate(50%, 50%))
              └── All widgets positioned here (x_position, y_position relative to center)
```
Widget position (0, 0) = exact center of the 20,000x20,000 board = center of the screen at default zoom.

#### Dot Grid Background
The dot grid is a CSS `radial-gradient` applied to the viewport (not the board container), so it tiles infinitely:
```js
backgroundImage: `radial-gradient(circle at ${scale*3}px ${scale*3}px, #D1D5DB ${scale*3}px, transparent ...)`
backgroundSize: `${scale * 50}px ${scale * 50}px`
backgroundPosition: `calc(50% + ${translateX}px) calc(50% + ${translateY}px)`
```
Dots scale with zoom and pan with the board.

#### Pan/Zoom Math
- **Zoom anchored to cursor:** When zooming, the point under the cursor stays fixed:
  ```js
  const zoomPoint = { x: (clientX - translateX) / scale, y: (clientY - translateY) / scale }
  scale = clamp(newScale, 0.25, 1.0)
  translateX = clientX - zoomPoint.x * newScale
  translateY = clientY - zoomPoint.y * newScale
  ```
- **Space+drag panning:** Hold Space key, then pointer drag moves `translateX/Y` by delta pixels
- **Touch panning:** Single finger on canvas background (not on a widget) pans
- **Pinch zoom:** Two-finger touch, `Math.hypot()` distance change → zoom delta
- **Scroll wheel:** `Ctrl + wheel` → zoom. Plain wheel → pan via `translateX/Y -= delta * 0.1`

#### SVG Layer Architecture
```html
<div class="board-container" :style="boardTransform">
  <div class="origin-wrapper">
    <!-- HTML widget layer -->
    <WidgetWrapper v-for="item in items" ... />
    <!-- SVG drawing layer (same coordinate space) -->
    <SvgLayer />
  </div>
</div>
```
The SVG layer is an `<svg>` element with:
- `position: absolute; inset: 0; overflow: visible;` (fills the origin-wrapper)
- Same coordinate system as widgets (SVG internal coords = board coords)
- `pointer-events: none` by default → clicks pass through to widgets
- When drawing mode activates (future): `pointer-events: all` + widget layer gets `pointer-events: none`

#### Screen ↔ Board Coordinate Conversion
```js
// Screen position → Board position (for placing new widgets at click/viewport center)
function screenToBoard(screenX, screenY) {
  return {
    x: (screenX - translateX) / scale - 10000,  // offset for the -10000 left/top
    y: (screenY - translateY) / scale - 10000
  }
}
// Viewport center in board coords (used for "create widget at center")
function getViewportCenter() {
  return screenToBoard(window.innerWidth / 2, window.innerHeight / 2)
}
```

**Reuse from old:** Pan/zoom math from `composables/usePanZoom.ts`, dot grid CSS from board page, coordinate utilities from `shared/board.ts`.

---

## Phase 3: State Architecture — Yjs as Source of Truth

**Goal:** Set up Yjs as THE source of board data, with Pinia stores as reactive views.

### Architecture

```
Server DB → API → Client loads board JSON
                      ↓
              Y.Doc created, Y.Map('items') seeded from JSON
                      ↓
              WebsocketProvider connects (syncs with other clients)
              IndexeddbPersistence (offline cache)
                      ↓
              Y.Map.observeDeep → updates Pinia board store reactively
                      ↓
              Pinia board.items (reactive Map) ← read-only view of Y.Map
                      ↓
              Widget stores call Y.Map methods to write changes
                      ↓
              Y.Map change → Pinia updates → Vue re-renders
                      ↓
              Debounced save: serialize Y.Map → POST /api/save/[id]
```

### Steps
1. Create `app/composables/yjs/useYjsDocument.ts`:
   - Creates/caches `Y.Doc` per boardId
   - Connects `WebsocketProvider` (from runtime config URL)
   - Connects `IndexeddbPersistence`
   - Exposes: `doc`, `connectionStatus`, `destroy()`
2. Create `app/composables/yjs/useYjsBoard.ts`:
   - Gets `Y.Map<BoardItem>('items')` from doc
   - `seed(items: Record<string, BoardItem>)` — populate Y.Map from server data
   - `observeDeep` → calls a callback whenever items change
   - Exposes: `yItems` (the Y.Map), `addItem()`, `updateItem()`, `removeItem()`
   - `Y.UndoManager` for undo/redo
3. Create `app/stores/board.ts`:
   - **Read state:** `items` (reactive Map, populated by Y.Map observer), `title`, `boardId`, `accessLevel`, `canEdit`, etc.
   - **Write actions:** All mutations go through `useYjsBoard()` → Y.Map
   - `initializeBoard(id)` — fetch from API, seed Yjs, start observing
   - `saveBoard()` — serialize items from Y.Map to JSON, POST to API
   - `debouncedSave` — 3-second debounce after any Y.Map change
   - Canvas state: `scale`, `translateX`, `translateY`, `zoomLevel`
4. Create `app/stores/ui.ts`:
   - `selectedItemId`, `isCommandPaletteOpen`, `isFilePickerVisible`, `isVoiceRecorderVisible`
   - Modal states, toolbar states
5. Create `app/stores/auth.ts`:
   - User session, profile data, login/logout
   - Fetches from `/api/profile`
6. Create shared types in `shared/types/board.ts`:
   - `BoardItem` union type (all 9 widget kinds)
   - `Board`, `Position`, `BoardPosition`, `ConnectionStatus`, `User`

### Implementation Details

#### Yjs Document Lifecycle
Each board gets one `Y.Doc` instance, cached in a module-level `Map<string, { doc, wsProvider, idbProvider }>`:
```ts
// useYjsDocument.ts
const docs = new Map()  // module-level singleton cache

export function useYjsDocument(boardId: string) {
  if (!docs.has(boardId)) {
    const doc = new Y.Doc()
    const wsProvider = new WebsocketProvider(wsUrl, boardId, doc)
    const idbProvider = new IndexeddbPersistence(boardId, doc)
    docs.set(boardId, { doc, wsProvider, idbProvider })
  }
  return docs.get(boardId)
}
```

#### Yjs → Pinia One-Way Data Flow
The critical pattern: **Yjs is written to, Pinia is read from.** Never write directly to Pinia for board items.

```ts
// useYjsBoard.ts
const yItems = doc.getMap<BoardItem>('items')

// SEED: When board first loads from API
function seed(serverItems: Record<string, BoardItem>) {
  doc.transact(() => {
    for (const [id, item] of Object.entries(serverItems)) {
      if (!yItems.has(id)) yItems.set(id, item)
    }
  })
}

// OBSERVE: Y.Map changes → update Pinia reactively
yItems.observeDeep(() => {
  const boardStore = useBoardStore()
  boardStore._syncFromYjs(yItems.toJSON())  // internal action, not for external use
})

// WRITE: All mutations go through Y.Map
function addItem(item: BoardItem) { yItems.set(item.id, item) }
function updateItem(id: string, changes: Partial<BoardItem>) {
  const existing = yItems.get(id)
  if (existing) yItems.set(id, { ...existing, ...changes })
}
function removeItem(id: string) { yItems.delete(id) }
```

#### Board Store Structure
```ts
// stores/board.ts
export const useBoardStore = defineStore('board', () => {
  // READ-ONLY state (populated by Yjs observer)
  const items = ref(new Map<string, BoardItem>())
  const boardItemsArray = computed(() => [...items.value.values()])

  // Board metadata (from API, not in Yjs)
  const boardId = ref('')
  const title = ref('')
  const accessLevel = ref<BoardAccessLevel>('public')
  const ownerId = ref('')

  // Canvas state
  const scale = ref(1)
  const translateX = ref(0)
  const translateY = ref(0)

  // Internal: called by Yjs observer only
  function _syncFromYjs(rawItems: Record<string, BoardItem>) {
    items.value = new Map(Object.entries(rawItems))
  }

  // Debounced save to server (triggers on every Yjs change)
  const debouncedSave = useDebounceFn(() => {
    const data = { items: Object.fromEntries(items.value) }
    $fetch(`/api/save/${boardId.value}`, { method: 'POST', body: { data } })
  }, 3000)
})
```

#### Widget Store Pattern (each follows this)
```ts
// stores/note.ts
export const useNoteStore = defineStore('note', () => {
  const { updateItem } = useYjsBoard()  // writes to Y.Map

  function updateNoteContent(id: string, text: string, color: string) {
    updateItem(id, { content: { text, color } })
    // This triggers: Y.Map change → observer → board._syncFromYjs → Vue re-render
  }
})
```

#### Undo/Redo
```ts
const undoManager = new Y.UndoManager(yItems)
// Cmd+Z → undoManager.undo()
// Cmd+Shift+Z → undoManager.redo()
```
The UndoManager automatically tracks all Y.Map operations and can reverse them.

**Reuse from old:** `composables/useYjsBoard.ts` (adapt to make Yjs authoritative), `composables/useYjsConnection.ts`, `types/board.ts`, `types/access.ts`. The key change is removing the "dual write" — stores no longer independently mutate items; they go through Yjs.

---

## Phase 4: Widget System

**Goal:** Implement all 9 widget types with WidgetWrapper.

### Steps
1. Create `app/components/widgets/WidgetWrapper.vue`:
   - Position via CSS transform
   - Drag handle (top pill), resize handle (bottom-right corner)
   - Selection state (outline, z-index boost)
   - Context menu: delete, lock/unlock, PiP, custom slot
   - Counter-scaled menu (`scale(1/boardScale)`)
   - Display name editing
   - Lock state (hide handles)
2. Create `app/composables/widgets/useWidgetDrag.ts`:
   - Pointer Events API with `setPointerCapture`
   - Delta divided by board scale
   - Writes to Y.Map via board store
3. Create `app/composables/widgets/useWidgetResize.ts`:
   - SE corner resize
   - Min dimensions: 160x120
   - Delta divided by board scale
4. Create `app/composables/widgets/useWidgetSelection.ts`:
   - Click to select, click canvas to deselect
   - Foundation for future multi-select
5. Create `app/composables/widgets/useWidgetFactory.ts`:
   - `createWidget(kind, defaults)` — generates ID, calculates position at viewport center, calls `yjs.addItem()`
   - Per-widget-type factory functions: `createNote()`, `createTodo()`, etc.
6. Create per-widget stores (each follows same pattern):
   - Import `useYjsBoard` for write operations
   - Actions: update content via `yjs.updateItem(id, changes)`
   - Read state from board store's items Map
7. Implement all 9 widget components:
   - **StickyNote.vue** — TipTap editor, color picker (install `@tiptap/vue-3`, `@tiptap/starter-kit`, `@tiptap/pm`)
   - **TodoList.vue** — Title, task list, drag-to-reorder, completion toggle
   - **LinkItem.vue** — URL card with OG metadata from `/api/metadata`
   - **Timer.vue** — Pomodoro timer (Focus/Short/Long break modes)
   - **TextWidget.vue** — Double-click to edit, display in cursive font
   - **ImageWidget.vue** — Display uploaded image from S3
   - **AudioWidget.vue** — WaveSurfer.js waveform player (install `wavesurfer.js`)
   - **FileWidget.vue** — File attachment display with download link
   - **Tacklet.vue** — Placeholder iframe (full implementation in Phase 9)
8. Create `app/components/widgets/WidgetOptions.vue` — Teleport pattern for custom widget controls
9. Create `app/components/ui/ColorPicker.vue`
10. Create `app/components/ui/DeleteConfirm.vue`
11. Wire up board page template: `v-for` over `boardStore.boardItemsArray` → `WidgetWrapper` → conditional widget by `item.kind`

### Implementation Details

#### WidgetWrapper Rendering & Interaction
Each widget on the canvas is wrapped in `WidgetWrapper` which handles all spatial concerns:

```html
<!-- WidgetWrapper.vue template structure -->
<div class="widget-wrapper"
  :style="{
    transform: `translate(${item.x_position}px, ${item.y_position}px)`,
    width: `${item.width}px`,
    height: `${item.height}px`,
    zIndex: isSelected ? 11 : 1
  }">

  <!-- Display name (hover to show, double-click to edit) -->
  <div class="display-name" v-if="showName">{{ item.displayName }}</div>

  <!-- Context menu (counter-scaled to stay readable at any zoom) -->
  <div class="context-menu" v-if="isSelected && !isMoving"
    :style="{ transform: `translateX(-50%) scale(${1 / boardScale})` }">
    <DeleteButton /><LockToggle /><PiPButton />
    <div class="widget-custom-item" :class="item.id"><!-- teleport target --></div>
  </div>

  <!-- Drag handle (top center pill) -->
  <div class="drag-handle" v-if="!item.lock" @pointerdown="startDrag" />

  <!-- Widget content slot -->
  <slot />

  <!-- Resize handle (bottom-right corner) -->
  <div class="resize-handle" v-if="!item.lock" @pointerdown="startResize" />
</div>
```

#### Drag-to-Move (Pointer Events API)
```ts
// useWidgetDrag.ts
function startDrag(e: PointerEvent) {
  (e.target as HTMLElement).setPointerCapture(e.pointerId)
  const startX = item.x_position, startY = item.y_position
  const startPointerX = e.clientX, startPointerY = e.clientY

  function onMove(e: PointerEvent) {
    // CRITICAL: divide delta by scale so movement matches cursor at any zoom level
    const dx = (e.clientX - startPointerX) / boardStore.scale
    const dy = (e.clientY - startPointerY) / boardStore.scale
    updateItem(item.id, { x_position: startX + dx, y_position: startY + dy })
  }
  function onUp(e: PointerEvent) {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId)
    // cleanup listeners
  }
}
```
Uses `setPointerCapture()` so drag continues even when pointer leaves the element.

#### Resize
Same pattern as drag but updates `width`/`height`. Only SE (bottom-right) corner. Min dimensions: 160x120.

#### WidgetOptions Teleport Pattern
Individual widgets inject custom controls (like ColorPicker) into WidgetWrapper's context menu:
```vue
<!-- In StickyNote.vue -->
<WidgetOptions :itemId="props.itemId">
  <ColorPicker :color="note.content.color" @change="updateColor" />
</WidgetOptions>

<!-- WidgetOptions.vue teleports its slot to the matching class selector -->
<Teleport :to="`.widget-custom-item.${props.itemId}`">
  <slot />
</Teleport>
```
This avoids prop drilling while keeping widget-specific controls in the WidgetWrapper toolbar.

#### Widget Factory (Creating New Widgets)
```ts
// useWidgetFactory.ts
function createNote() {
  const { x, y } = getViewportCenter()  // from useCanvasCoords
  const item: StickyNote = {
    id: `NOTE-${nanoid(10)}`,
    kind: 'note',
    content: { text: '', color: '#FBBF24' },  // yellow
    x_position: x, y_position: y,
    width: 216, height: 216,
    lock: false, displayName: ''
  }
  addItem(item)  // writes to Y.Map → observer → Pinia → re-render
}
```
Each widget type has a factory function with appropriate defaults and dimensions.

#### StickyNote — TipTap Rich Text
Uses `@tiptap/vue-3` with `StarterKit` (bold, italic, lists, headings, etc.). The TipTap editor is embedded inside `StickyNote.vue` with:
- `onUpdate` callback → debounced `noteStore.updateNoteContent(id, editor.getHTML())`
- Background color from `content.color`, selectable via `ColorPicker`
- Editor disabled when `item.lock` is true

#### TodoList — Draggable Tasks
- Title with auto-sized font (computed from character count)
- Tasks array in `content.tasks: Task[]` where `Task = { task_id, content, completed }`
- Add task: input at bottom, Enter to add
- Toggle: click checkbox → `todoStore.toggleTask(id, taskId)`
- Reorder: HTML5 drag-and-drop + touch equivalents (`touchstart/touchmove/touchend` with `document.elementFromPoint`)
- Delete task: X button on hover
- Inline edit: double-click task text → input field

#### LinkItem — URL Card with Metadata
When a link is added (via toolbar modal or clipboard paste):
1. Client calls `$fetch('/api/metadata', { params: { url } })`
2. Server fetches the URL, extracts OpenGraph tags (`og:title`, `og:image`, `og:description`) or oEmbed data
3. Returns metadata to client
4. Link widget displays: thumbnail image (if any), title, description, URL
5. Supports both regular links and oEmbed (e.g., YouTube embeds with `html` field)

#### Timer — Pomodoro
Three modes: Focus (25min default), Short Break (5min), Long Break (15min). State stored in `content`:
```ts
{ timerType: 'Focus' | 'Short Break' | 'Long Break', duration: number }
```
Timer countdown is local (not synced via Yjs — each user sees their own timer state). Only the mode/duration config syncs.

#### AudioWidget — WaveSurfer.js
Displays an audio waveform visualization using `wavesurfer.js`. The audio file URL comes from S3 (uploaded via VoiceRecorder or file upload). Waveform is rendered in a `<div>` that WaveSurfer attaches to.

#### FileWidget
Simple display card showing: file icon (by type), filename, file size (human-readable), download link to S3 URL.

**Reuse from old:** All widget components can be adapted. `WidgetWrapper.vue` logic is mostly portable. TipTap editor setup from `StickyEditor.vue`. The key change is that all mutations go through Yjs instead of directly to Pinia.

---

## Phase 5: Real-time Collaboration

**Goal:** Connect Yjs WebSocket for multi-user editing, presence, offline support.

### Steps
1. Install: `yjs`, `y-websocket`, `y-indexeddb`
2. Finalize `app/composables/yjs/useYjsDocument.ts`:
   - WebSocket reconnection logic
   - Connection status tracking
   - Proper cleanup on board leave
3. Create `app/composables/yjs/useYjsPresence.ts`:
   - Yjs Awareness protocol
   - Set local user info (name, color, role)
   - Track `activeUsers` reactively
   - Show avatars in board UI
4. Add connection status indicator to board page (online/offline dot)
5. Add undo/redo buttons wired to `Y.UndoManager`
6. Test multi-user scenarios: concurrent edits, conflict resolution

**Reuse from old:** `composables/useYjsConnection.ts`, `composables/useYjsUser.ts`. These are mostly portable — the main change is integrating with the new Yjs-as-source-of-truth architecture.

### Implementation Details

#### Yjs Awareness Protocol (User Presence)
```ts
// useYjsPresence.ts
const awareness = wsProvider.awareness

// Set local user state
awareness.setLocalStateField('user', {
  id: profileId,
  name: username || 'Anonymous',
  color: '#' + Math.floor(Math.random()*16777215).toString(16),  // random color
  access: userRole  // 'viewer' | 'editor' | 'owner'
})

// Track all connected users reactively
const activeUsers = ref<User[]>([])
awareness.on('change', () => {
  activeUsers.value = Array.from(awareness.getStates().values())
    .map(state => state.user)
    .filter(Boolean)
})
```
Active users are shown as colored avatar circles in the board header area.

#### Connection Status
```ts
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'
const status = ref<ConnectionStatus>('connecting')
wsProvider.on('status', ({ status: s }) => { status.value = s })
```
Shown as a colored dot (green/yellow/red) in the board UI. When disconnected, IndexedDB persistence keeps local changes that sync when reconnected.

#### External WebSocket Server
The y-websocket server is a **separate Node.js process** (not part of the Nuxt app). It runs the standard `y-websocket` server binary. The URL is configured via `NUXT_PUBLIC_WEBSOCKET_URL` env var (default: `ws://localhost:1234`). In production, this is hosted separately (e.g., on a VPS or container service).

**Note:** The separate y-websocket server remains external. It's not part of the Nuxt app.

---

## Phase 6: Board Management & API

**Goal:** Board CRUD, access control, sharing, board list.

### Steps
1. Create board API routes:
   - `server/api/board/[id]/index.get.ts` — Load or create board, access control, claim orphaned boards
   - `server/api/board/[id]/index.delete.ts` — Delete board (owner only), cascade uploads
   - `server/api/board/list.get.ts` — List boards user has access to
   - `server/api/save/[id].post.ts` — Save board data (permission check, update `updated_at`)
   - `server/api/board/[id]/access.get.ts` — Get access list with profiles
   - `server/api/board/[id]/access.patch.ts` — Update user role
   - `server/api/board/[id]/access.delete.ts` — Remove user access
   - `server/api/board/[id]/access-level.patch.ts` — Change board access level
   - `server/api/board/[id]/invite.post.ts` — Invite user by username
   - `server/api/search.get.ts` — Cross-board FTS5 search (`?q=&boardId=` optional scope filter)
2. Create `app/components/board/BoardHeader.vue`:
   - Editable title
   - Board list dropdown (from localStorage)
   - Board switching
3. Create `app/components/profile/BoardSharePopup.vue` — share/invite UI
4. Create `app/components/profile/SettingsTab.vue` — access level management
5. Wire up board store: `initializeBoard()`, `saveBoard()`, access list management
6. Handle board routing: `/board/[id]`, create new board, load last-accessed

### Implementation Details

#### Board Loading Flow
When navigating to `/board/[id]`:
1. If `id === 'load'`: Check localStorage `settings` for last-accessed board ID → redirect to it. If none, redirect to `create`.
2. If `id === 'create'`: POST to create a new board → server generates `BOARD-${nanoid(10)}` → redirect to `/board/[newId]`.
3. If `id` is a real board ID: GET `/api/board/[id]` → server logic:
   - If board exists: check access permissions (owner, access list, or public)
   - If board doesn't exist AND user is authenticated: create it as a new empty board, set user as owner
   - If board doesn't exist AND anonymous: return 404
   - "Claim orphaned boards": if a board has no `owner_id`, the first authenticated user to load it becomes the owner
   - Upsert a `board_access` record for the requesting user (updates `last_accessed`)
   - Return board data (JSON with items object) + access details

#### Access Control (Simplified from 5 → 3 levels)
| Level | Who can view | Who can edit |
|-------|-------------|-------------|
| `public` | Anyone with the URL | Anyone with the URL |
| `view_only` | Anyone with the URL | Only owner + editors in access list |
| `private` | Only users in access list | Only owner + editors in access list |

Roles in `board_access`: `owner` (full control), `editor` (can edit), `viewer` (can view only).

#### Board List (localStorage-based)
Boards are tracked in `useLocalStorage<Record<string, { board_id, title }>>('boards', {})`. When a board loads successfully, it's added/updated in this localStorage record. The header dropdown lists all known boards for quick switching. This is client-side only — not synced to server (the server has `board_access` for the authoritative list, but localStorage is faster for the dropdown).

#### Saving
Debounced save (3 seconds after last Yjs change): serializes the Y.Map items to a plain object `{ [id]: BoardItem }`, POSTs to `/api/save/[id]`. Server validates edit permission, updates `boards.data` and `boards.updated_at`.

Also rebuilds the FTS5 search index for this board in the same request:
```ts
// server/api/save/[id].post.ts — after updating boards.data
const ownerId = board.owner_id
await db.run(sql`DELETE FROM board_items_fts WHERE board_id = ${boardId}`)
const ftsRows = Object.entries(items).flatMap(([itemId, item]) => {
  const text = extractItemText(item)  // shared/utils/search.ts
  if (!text) return []
  return [{ board_id: boardId, item_id: itemId, kind: item.kind, owner_id: ownerId, text }]
})
if (ftsRows.length > 0) {
  // batch insert via raw sql
  for (const row of ftsRows) {
    await db.run(sql`INSERT INTO board_items_fts(board_id, item_id, kind, owner_id, text)
      VALUES (${row.board_id}, ${row.item_id}, ${row.kind}, ${row.owner_id}, ${row.text})`)
  }
}
```
`extractItemText()` is a pure function in `shared/utils/search.ts` that returns a searchable string per widget kind (note → HTML stripped to plain text, todo → title + task strings, link → title + description, text → raw string, others → empty).

**Reuse from old:** All API route handlers are largely portable with schema name adjustments. Board store initialization logic. Header and sharing components.

---

## Phase 7: UI Polish

**Goal:** Command palette, minimap, keyboard shortcuts, clipboard, PiP, toolbar.

### Steps
1. Create `app/components/board/BoardToolbar.vue`:
   - Creation buttons for all widget types
   - Upload popover and voice recorder toggles
   - Tacklet directory toggle
2. Create `app/components/board/CommandPalette.vue`:
   - Ctrl+K / Cmd+K trigger
   - Fuzzy search over commands
   - Arrow key navigation, Enter to execute, Esc to close
   - Expandable command registry (easy to add new commands)
3. Create `app/composables/useGlobalShortcuts.ts`:
   - Delete selected, Cmd+Z/Shift+Z undo/redo
   - Alt+S (note), Alt+C (todo), Alt+B (timer), Alt+N (new board)
   - +/- zoom, Space for pan mode
4. Create `app/composables/useClipboard.ts`:
   - Paste URL → link widget
   - Paste short text → text widget
   - Paste long text → sticky note
   - Paste image → image widget
5. Create `app/components/zoom/MiniMap.vue`:
   - 150x100px overview with colored item dots
   - Viewport indicator (draggable)
   - Click-to-navigate
6. Create `app/components/zoom/ZoomControls.vue`:
   - +/- buttons, toggle fit/overview
7. Create `app/composables/usePiPWindow.ts`:
   - Document PiP API integration
   - Multi-widget stacking in single PiP window
8. Create `app/pages/pip/[id]/[itemId].client.vue`:
   - PiP widget page with draggable reordering
   - `PiPWidgetWrapper` with remove button
9. Use **PrimeVue `<Dialog>`** for delete confirm and error modals — no custom Modal.vue needed
10. Use **PrimeVue `<Toast>`** for toast notifications — wired via `useToast()`
11. `OfflineIndicator.vue` — small Tailwind-only status dot, no PrimeVue

### Implementation Details

#### Command Palette
Triggered by `Ctrl+K` / `Cmd+K` (using `useMagicKeys` from VueUse). A centered overlay with:
- Search input that filters commands by name
- Arrow key navigation through filtered results
- Enter to execute, Esc to close
- Commands stored in a registry array, each with `{ id, name, shortcut, category, action }`:
  ```ts
  const commands = [
    { id: 'new-note', name: 'New Note', shortcut: 'Alt+S', category: 'Create', action: () => createNote() },
    { id: 'new-todo', name: 'New Todo List', shortcut: 'Alt+C', category: 'Create', action: () => createTodo() },
    { id: 'new-timer', name: 'New Timer', shortcut: 'Alt+B', category: 'Create', action: () => createTimer() },
    // ... more commands
  ]
  ```
  Commands are grouped by category in the UI. Adding new commands = pushing to the array.

#### MiniMap
A 150x100px fixed panel (bottom-right) showing a bird's-eye view of all board items:
1. Calculate bounding box of all items (minX, minY, maxX, maxY)
2. Scale ratio = min(150/boundsWidth, 100/boundsHeight)
3. Each item drawn as a small colored rectangle:
   - note = gold, todo = light blue, link = light green, timer = salmon, text = lavender, others = gray
4. A blue semi-transparent rectangle shows the current viewport area
5. **Click** on minimap: convert minimap coords back to board coords, center board there
6. **Drag viewport indicator**: delta in minimap coords scaled to board coords, updates `translateX/Y`

#### Clipboard Paste Detection
```ts
// useClipboard.ts — listens for global 'paste' event
document.addEventListener('paste', (e) => {
  if (isTypingInInput()) return  // skip if user is in a text field
  const text = e.clipboardData?.getData('text/plain')
  const imageItem = e.clipboardData?.items?.[0]

  if (isValidUrl(text)) createLinkWidget(text)
  else if (text && text.length < 100) createTextWidget(text)
  else if (text) createStickyNote(text)
  else if (imageItem?.type.startsWith('image/')) uploadAndCreateImage(imageItem)
})
```

#### Picture-in-Picture (Document PiP API)
Uses the modern `window.documentPictureInPicture.requestWindow()` API (Chrome 116+):
1. User clicks PiP button on a widget's context menu
2. Opens `/pip/[boardId]/[itemId]` in a PiP window
3. PiP page loads the board store, renders the widget in a minimal wrapper (`PiPWidgetWrapper`)
4. **Multi-widget stacking:** Additional widgets send a `postMessage({ type: 'append', itemId })` to the PiP window. The PiP page listens and appends widgets to a list. The PiP window resizes taller as more widgets are added.
5. Widgets in PiP are wrapped in `VueDraggableNext` for reorder-by-drag
6. Each has a remove button (X) that filters it out of the PiP item list

#### Modals & Toasts — PrimeVue
All overlay dialogs (delete confirm, error, share form) use **PrimeVue `<Dialog>`** directly — no custom Modal wrapper. PrimeVue handles focus trap, ARIA, scroll lock, and keyboard out of the box.

```vue
<Dialog v-model:visible="showDelete" modal header="Delete widget?" :style="{ width: '20rem' }">
  <p>This cannot be undone.</p>
  <template #footer>
    <Button label="Cancel" text @click="showDelete = false" />
    <Button label="Delete" severity="danger" @click="confirmDelete" />
  </template>
</Dialog>
```

Toasts use `useToast()` from PrimeVue — `toast.add({ severity, summary, detail, life })`.
Board-level sidebars (board list, profile panel) use PrimeVue `<Drawer>`.
All **whiteboard UI** (widgets, toolbar, minimap, zoom controls, command palette, board header) is **Tailwind + plain CSS only** — no PrimeVue components on the canvas.

**Reuse from old:** Most UI components are directly portable. CommandPalette, MiniMap, ZoomControls, Modal, PiP logic — all can be adapted.

---

## Phase 8: File System

**Goal:** File upload, S3 storage, quota tracking, voice recorder.

### Steps
1. Create `server/plugins/storage.ts`:
   - Mount S3 driver via `unstorage` + `aws4fetch`
2. Create upload API:
   - `server/api/upload/[id].post.ts` — Upload file, OAuth required, track in DB, update quota
   - `server/api/upload/delete.post.ts` — Delete file, decrement quota
3. Create `app/composables/useUpload.ts` — file upload logic with progress
4. Create `app/components/ui/UploadPopover.vue` — drag-and-drop upload area
5. Create `app/components/ui/VoiceRecorder.vue` — MediaRecorder API, save as audio widget
6. Create `app/components/profile/UsageIndicator.vue` — storage usage display
7. Create metadata API: `server/api/metadata.ts` — OG/oEmbed scraping

### Implementation Details

#### S3 Storage Plugin
Uses `unstorage` with an S3 driver (via `aws4fetch` for request signing):
```ts
// server/plugins/storage.ts
import { createStorage } from 'unstorage'
import s3Driver from 'unstorage/drivers/s3'

const tackpadStorage = createStorage({
  driver: s3Driver({
    bucket: config.bucket,
    endpoint: config.endpoint,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    region: config.region
  })
})
useStorage().mount('tackpad', tackpadStorage)
```
Files are stored at a CDN URL (e.g., `https://assets.tackpad.xyz/<nanoid>.<ext>`).

#### Upload Flow
1. Client selects file(s) via `UploadPopover` (drag-and-drop or file picker)
2. Client POSTs file to `/api/upload/[boardId]` as multipart form data
3. Server checks: user is OAuth-authenticated (anonymous users cannot upload)
4. Server checks: user's `usage_quotas.consumption + file.size <= quota_limit`
5. Server generates `<nanoid>.<extension>` filename
6. Server writes file to S3 via `useStorage('tackpad').setItemRaw(filename, buffer)`
7. Server inserts row in `uploads` table, increments `usage_quotas.consumption`
8. Returns `{ url: 'https://assets.tackpad.xyz/<filename>' }`
9. Client creates the appropriate widget (image/audio/file) with the URL

#### Voice Recorder
Uses browser `MediaRecorder` API:
1. `navigator.mediaDevices.getUserMedia({ audio: true })` → get microphone stream
2. `new MediaRecorder(stream)` → record audio chunks
3. On stop: combine chunks into a `Blob`, upload via the same upload flow
4. Creates an `AudioWidget` with the resulting S3 URL

#### Metadata Scraping
`/api/metadata` accepts a URL parameter, fetches it server-side (10-second timeout), and extracts:
- **OpenGraph** tags: `og:title`, `og:description`, `og:image`
- **oEmbed** discovery: looks for `<link type="application/json+oembed">`, fetches that URL for rich embed data (used for YouTube, Twitter, etc.)
- Returns both OG and oEmbed data; the LinkItem widget decides which to display

**Reuse from old:** Upload API handlers, S3 storage plugin, VoiceRecorder component, UploadPopover, metadata fetching.

---

## Phase 9: Tacklets Plugin System

**Goal:** Rebuild the tacklet system with a cleaner architecture.

### Steps
1. Create `app/components/widgets/Tacklet.vue`:
   - iframe with sandbox permissions
   - Query params: `node_id`, `container_type`, `board_id`
2. Set up Penpal communication (install `penpal`):
   - **Parent → Child API:**
     - `getWidgetData()` — return widget's stored data
     - `setWidgetData(data)` — update via Yjs
     - `getWidgetId()` — return item ID
     - `getTheme()` — return theme info
     - `getBoardContext()` — return board ID, user role (new)
   - **Child → Parent API:**
     - `onSelected()` / `onDeselected()`
     - `onResize(width, height)` — tacklet can request resize (new)
3. Create `app/components/TackletsDirectory.vue`:
   - Fetch from tacklet registry URL
   - Searchable list with add button
4. Create `app/stores/tacklet.ts`:
   - `addTacklet(tacklet)` — create widget via Yjs
   - `updateTackletData(id, data)` — update widget data via Yjs
5. Type-safe tacklet manifest interface in `shared/types/board.ts`

### Implementation Details

#### Tacklets Architecture
Tacklets are **external web apps loaded in sandboxed iframes** that communicate with the parent board via the `penpal` library (structured postMessage).

#### Discovery & Registry
A JSON file at `https://tacklets.tackpad.xyz/directory/tacklets.json` lists available tacklets:
```json
[{
  "id": "pomodoro",
  "name": "Pomodoro Timer",
  "url": "https://tacklets.tackpad.xyz/pomodoro/",
  "icon": "timer.svg",
  "description": "A focused work timer",
  "version": "1.0.0",
  "dimensions": { "defaultWidth": 300, "defaultHeight": 200 },
  "permissions": ["storage"],
  "data": {}
}]
```
The `TackletsDirectory` component fetches this list, renders a searchable panel, and "Add" creates a Tacklet widget.

#### iframe Setup
```html
<iframe
  :src="`${tacklet.url}?node_id=${itemId}&container_type=${containerType}&board_id=${boardId}`"
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
  allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi"
/>
```
- `container_type` = `'board'` (on canvas) or `'pip'` (in PiP window) — tacklet can adapt its UI
- `node_id` = the widget's unique item ID

#### Penpal Communication
Each tacklet connection uses a **channel ID = widget item ID** to prevent cross-talk between multiple tacklet instances:

```ts
// Parent side (Tacklet.vue)
const connection = connectToChild({
  iframe: iframeRef.value,
  childOrigin: tackletOrigin,
  channelId: props.itemId,  // unique per widget instance
  methods: {
    // Methods the tacklet can call on the parent:
    getWidgetData: () => item.value.content.data,
    setWidgetData: (data) => tackletStore.updateTackletData(id, data),
    getWidgetId: () => props.itemId,
    getTheme: () => 'light',
    getBoardContext: () => ({ boardId, userRole }),  // NEW
    registerWidget: () => { /* ack */ }
  }
})

// Child side (inside the tacklet app):
const parent = await connectToParent({
  channelId: new URL(location).searchParams.get('node_id'),
  methods: {
    onSelected: () => { /* tacklet knows it was selected */ },
    onDeselected: () => { /* tacklet knows it was deselected */ },
    onResize: (width, height) => { /* tacklet can request resize */ }  // NEW
  }
})
const data = await parent.getWidgetData()
await parent.setWidgetData({ ...data, count: data.count + 1 })
```

#### Tacklet State Persistence
Each tacklet's state is stored in `content.data` (an opaque JSON blob) on the `BoardItem`. When the tacklet calls `setWidgetData(data)`, it goes through Yjs → saved to DB with the board. Tacklets don't need their own backend.

**Improvements over old:**
- Typed Penpal API (both directions)
- `getBoardContext()` for tacklets to know their environment
- `onResize()` for tacklets to request dimension changes
- Channel ID isolation per widget (same as before, but documented)

---

## Phase 10: Backup, Public Pages & Migration

**Goal:** Export/import, public pages, and data migration tooling.

### Steps
1. Create backup API:
   - `server/api/backup/export.post.ts` — Export selected boards as JSON
   - `server/api/backup/import.post.ts` — Import board JSON, handle ID conflicts
2. Create `app/components/profile/BackupPanel.vue`
3. Create public pages (reuse content from old app):
   - `app/pages/home.vue` — Landing page
   - `app/pages/privacy.vue` — Privacy policy
   - `app/pages/tos.vue` — Terms of service
   - `app/pages/contact.vue` — Contact page
4. Create `app/layouts/content.vue` — Nav + footer for public pages
5. Create profile UI:
   - `app/components/profile/ProfilePopup.vue` — Dialog with tabs
   - `app/components/profile/UserTab.vue` — User info, login/logout
6. **Data Migration Script** (one-time):
   - Script to export boards from old D1 database
   - Transform old schema → new schema (handle array→object items, move title to column, map old access levels to simplified ones)
   - Import into new D1 database

### Implementation Details

#### Backup Export Format
```json
{
  "version": 2,
  "exportedAt": "2026-02-20T...",
  "boards": [{
    "id": "BOARD-abc123",
    "title": "My Board",
    "items": { "NOTE-xyz": { "kind": "note", "content": {...}, ... } },
    "accessLevel": "public"
  }]
}
```
User selects which boards to export from a checklist. Server returns the JSON blob for download.

#### Backup Import
- Parses JSON, validates format version
- For each board: generates new board ID (to avoid conflicts), preserves item IDs within
- Creates board in DB, adds user as owner
- If items reference uploaded file URLs: those URLs still point to the original S3 files (files are NOT re-uploaded; if original files were deleted, those widgets will show broken state)

#### Data Migration Script (Old → New)
A one-time Node.js script to migrate data from the old D1 database to the new one:
1. Export all rows from old `boards` table
2. For each board:
   - Parse `data` JSON
   - Extract `title` from `data.title` → new `boards.title` column
   - Convert `data.items` from array format `[{id, ...}]` to object format `{ [id]: {...} }` if needed (old app may store either)
   - Map old access levels: `limited_edit` → `public`, `admin_only` → `private`, `private_shared` → `private`
3. Migrate `Profile` → `profiles` (rename columns: `firstName` → `first_name`, `user_token` → `anonymous_token`)
4. Migrate `profile_authentications` (schema is the same)
5. Migrate `board_access` (schema is the same)
6. Migrate `user_uploads` → `uploads` (generate `id` column, keep `file_url`)
7. Migrate `usage_quota` → `usage_quotas` (rename `limit` → `quota_limit`)
8. Skip `board_settings` (replaced by `board_access.last_accessed`)

**Reuse from old:** Public page content (privacy, tos, contact, home), backup API logic, profile components.

---

## Design Considerations for Future Features

### Multi-Select & Grouping (Future)
- `useWidgetSelection.ts` should track `selectedItemIds: Set<string>` (not just single ID)
- Group = a new `BoardItem` kind: `{ kind: 'group', childIds: string[], ... }`
- Grouped items render normally but move/resize together
- WidgetWrapper checks if item is in a group for coordinated transforms

### Drawing / Diagram Mode (Future)
- `SvgLayer.vue` activates when drawing mode is enabled
- Drawing mode toggled by toolbar button or keyboard shortcut
- When active: SVG layer captures pointer events, HTML widget layer becomes `pointer-events: none`
- Shapes/arrows are stored as `BoardItem` with kind `'drawing'` or `'shape'`
- They live in the same Y.Map as widgets, same coordinate system
- Rendered in SVG layer instead of HTML layer (board page routes by kind)

### Web Extension & Telegram Bot (Future)
- `api_tokens` table with scopes enables authenticated API access
- API routes already follow RESTful patterns
- Add token-based auth as alternative to cookie-based in auth middleware
- Extension/bot uses API tokens to create items on boards

---

## Verification Plan

After each phase:
1. **Phase 0:** `nuxt dev` runs, deploys to CF Workers, D1 database accessible
2. **Phase 1:** Create anonymous profile via API, OAuth login works, profile CRUD works
3. **Phase 2:** Board page renders, pan/zoom works, dot grid scales, SVG layer overlays
4. **Phase 3:** Board loads from API, seeds Yjs, Y.Map changes reflect in Pinia, undo/redo works
5. **Phase 4:** All 9 widget types render, drag/move/resize work, selection/deletion work
6. **Phase 5:** Two browser tabs sync changes in real-time, presence avatars show
7. **Phase 6:** Create/delete boards, share with users, access control enforced
8. **Phase 7:** Ctrl+K opens palette, minimap shows items, shortcuts work, PiP opens
9. **Phase 8:** Upload files, voice record, quota enforced, images/audio display
10. **Phase 9:** Add tacklet from directory, iframe loads, penpal communication works
11. **Phase 10:** Export boards, import back, public pages accessible, old data migrated
