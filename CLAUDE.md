# Paddle data

Create a simple nuxt 4 app that shows gpx tracks (from paddle logger) on a map.

User should be able to choose what to see.

Various drill downs:

- by region
- by date
- by craft

Map data must be free.

Standard map functionality should apply - layers, zoom, pan etc.

It is allowed to have a config data json in the data dir for data that is not present in the exported GPX files.

## Frontend standards

- **Versioning:** Always use exact versions (no `^`/`~` ranges)
- **Package manager:** pnpm (never npm)
- **TypeScript:** Always preferred over JavaScript
  - All changes must pass linting and type checking
  - `any` is never acceptable — always use correct, specific types
- **Linting/formatting:** ESLint + Prettier
- **Pre-commit hooks:** Husky + lint-staged running `pnpm lint:fix` on staged `.js`, `.ts`, `.vue` files

## Other notes

Add a standard renovate.json (includes `"extends": ["config:recommended"]`)

Data dir must be passed as env. It is ok to default to ./data for development.

## Current implementation

- **UI:** Nuxt UI (v4), primary `violet` / secondary `amber` / neutral `zinc` (`app/app.config.ts`), dark mode by default with a header toggle. A custom "water/course" teal/coral palette is defined in `app/assets/css/main.css` (`--color-water-*` / `--color-course-*`) but is not currently wired to the UI colors. Display font Space Grotesk, body Inter, mono JetBrains Mono for the stats readout — self-hosted via `@nuxt/fonts` (no third-party `@import`, which would block first paint).
- **Map:** Leaflet + standard OpenStreetMap tiles, CSS `filter` applied to tiles in dark mode for visual cohesion (no separate paid dark-tile provider).
- **Data flow:** GPX files are parsed from `runtimeConfig.dataDir` (`DATA_DIR` env, default `./data`) by `scripts/build-track-cache.ts` at build time (`pnpm cache:tracks`, run by `pnpm build`) into `data/.cache/tracks.json`, loaded once per process. A cache miss falls back to live parsing, so local dev works without the build step.
- **Track geometry wire format:** points ship as `EncodedPoint = [lat, lon, deltaMs]` — `deltaMs` is elapsed ms since the previous point, so timestamps reconstruct exactly as a running sum from the track's `startTime` (verified lossless across all points). `ele` is dropped (always 0 in this data). Coordinates are rounded to 5 decimals (~1.1m).
  - **Rule:** every derived metric (`distanceKm`, region lookup, and any future per-km splits) is computed **server-side from full-precision points, before encoding**. Nothing is ever measured from the rounded wire values client-side.
- **Geometry loading:** `server/api/tracks/points.get.ts` returns *all* tracks' geometry in one response, serialized and brotli/gzip-compressed once per process and held in memory (Nitro's node-server preset does not compress handler responses). The client fetches it once via `useTracks` (`lazy`, `server: false`, so it overlaps hydration rather than blocking it) and filters locally — changing a filter costs zero network. `server/api/tracks/[id].get.ts` remains for single-track use.
  - `cache-control` for that route is set via `routeRules` in `nuxt.config.ts`, **not** `setResponseHeader` — Nitro overrides handler-set cache headers on API routes.
- **Rendering:** polylines use Leaflet's `smoothFactor`, which decimates in screen space per zoom at render time. Deliberately no stored-geometry simplification (Douglas-Peucker), which would degrade planned playback and per-km splits.
- **Craft:** `data/craft.json` is a lookup list (`id`, `name`, `type`, `make`, `model`, `colour`, `registration`); tracks reference a craft by `craftId`.
- **Region vs area:** `region` is computed server-side from each track's start GPS coordinates against named bounding boxes in `data/regions.json` (no geocoding API — keeps map/location data free). `area` is a free-text, human-assigned field per track in `data/tracks.json`, also filterable, for finer-grained labeling than region (e.g. a specific lake within a region).
- **GeoJSON overlays:** static decorative map layers (currently depth curves), defined in `data/geojson.json` with sources in `data/geojson/`. Rendered in a dedicated Leaflet pane at `zIndex` 350 — above tiles (200), below the track polylines in the default `overlayPane` (400). Toggled from the toolbar; `defaultVisible` in the config sets the initial state. Overlays **never** call `fitBounds` — they must not move the user's view.
  - **Bandwidth (the whole design constraint):** the source file is ~16MB (5.8MB gzipped), so it is never served as-is. `scripts/build-geojson-cache.ts` (`pnpm cache:geojson`, run by `pnpm build`) pre-generates a **detail ladder** into `data/.cache/geojson/<id>-<level>.json`. Each level combines a feature filter (`interval` — keep values that are multiples of it) with a Douglas-Peucker `tolerance` and coordinate `precision`. For the Halden curves that gives ~30KB / ~150KB / ~616KB brotli. The client picks a level from map zoom and fetches it once; levels are immutable per deploy and cached forever client-side, so zooming in and back out costs no network.
  - Spatial tiling was measured and **rejected**: this data is dense inside a small area rather than spread out, so a z11 grid yields only 13 tiles (~264KB median) while duplicating every edge-straddling line. Detail level, not viewport extent, is the lever that pays here. Viewport culling is applied *within* a level, as a render optimisation only.
  - **Simplification is allowed here** — unlike track geometry, which `CLAUDE.md` forbids simplifying because metrics derive from it. Contours are decoration and nothing is measured from them.
  - `.mapcss` files sit alongside their `.geojson` as the styling *source of record*, but are not parsed at runtime — the rules are hand-translated into the `style` array in `data/geojson.json` (first match wins; `min` inclusive, `max` exclusive). Stroke alpha is a single per-overlay `opacity` (0.35 for the depth curves) rather than baked into each rule's colour, so the ramp can be made more or less recessive as a whole. Dark mode lifts the pane with a CSS `filter` rather than defining a second palette.
  - **Overlay sources must be committed.** The Docker build is `COPY . .` + `pnpm run build` with no volume or external fetch, so the repo checkout *is* the data dir at build time — an uncommitted source means no cache to build from. (The runtime image also carries the sources; deliberate, for one simple `COPY` line.) A source that is missing anyway is warned-and-skipped rather than failing the build, and the API then serves that overlay as empty.
  - Geometry wire format is `[value, [[lat, lon], ...]]` — **lat/lon, the reverse of GeoJSON's lon/lat** — so the client hands arrays straight to `L.polyline`.
- **h3 is pinned to 1.15.11** in `pnpm-workspace.yaml` (pnpm 11 reads `overrides` from there, *not* from `package.json`). Nitro runs h3 1.x but the devtools/eslint chain pulls a 2.x RC; when both are in the tree, Nuxt's server auto-imports resolve `setResponseHeader` to the 2.x version, which 500s on every handler that sets a header. Changing the pin needs a full `rm -rf node_modules .nuxt` — the stale resolution survives a plain `pnpm install`.
- **Config files (git-tracked, hand-maintained):**
  - `data/craft.json` — craft lookup table
  - `data/regions.json` — named bounding boxes for region lookup
  - `data/tracks.json` — per-GPX-filename metadata: `craftId`, `area`, optional `name`
  - `data/geojson.json` — overlay definitions: styling rules and the detail ladder
  - `data/geojson/*.geojson` — overlay sources (large; never served directly)
  - `data/geojson/*.mapcss` — the styling these were translated from, kept for reference
- Type-checking gotcha: a Leaflet-owned DOM ref must not carry a reactive Vue `:class` binding directly — Vue's re-render clobbers classes Leaflet sets imperatively (`leaflet-container`, tile panes). Put reactive classes on a wrapper `<div>` instead (see `app/components/TrackMap.client.vue`).
