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

- **UI:** Nuxt UI (v4) with a custom "water/course" theme (teal primary, coral secondary), dark mode by default with a header toggle. Display font Space Grotesk, body Inter, mono JetBrains Mono for the stats readout — self-hosted via `@nuxt/fonts` (no third-party `@import`, which would block first paint).
- **Map:** Leaflet + standard OpenStreetMap tiles, CSS `filter` applied to tiles in dark mode for visual cohesion (no separate paid dark-tile provider).
- **Data flow:** GPX files are parsed from `runtimeConfig.dataDir` (`DATA_DIR` env, default `./data`) by `scripts/build-track-cache.mjs` at build time (`pnpm cache:tracks`, run by `pnpm build`) into `data/.cache/tracks.json`, loaded once per process. A cache miss falls back to live parsing, so local dev works without the build step.
- **Track geometry wire format:** points ship as `EncodedPoint = [lat, lon, deltaMs]` — `deltaMs` is elapsed ms since the previous point, so timestamps reconstruct exactly as a running sum from the track's `startTime` (verified lossless across all points). `ele` is dropped (always 0 in this data). Coordinates are rounded to 5 decimals (~1.1m).
  - **Rule:** every derived metric (`distanceKm`, region lookup, and any future per-km splits) is computed **server-side from full-precision points, before encoding**. Nothing is ever measured from the rounded wire values client-side.
- **Geometry loading:** `server/api/tracks/points.get.ts` returns *all* tracks' geometry in one response, serialized and brotli/gzip-compressed once per process and held in memory (Nitro's node-server preset does not compress handler responses). The client fetches it once via `useTracks` (`lazy`, `server: false`, so it overlaps hydration rather than blocking it) and filters locally — changing a filter costs zero network. `server/api/tracks/[id].get.ts` remains for single-track use.
  - `cache-control` for that route is set via `routeRules` in `nuxt.config.ts`, **not** `setResponseHeader` — Nitro overrides handler-set cache headers on API routes.
- **Rendering:** polylines use Leaflet's `smoothFactor`, which decimates in screen space per zoom at render time. Deliberately no stored-geometry simplification (Douglas-Peucker), which would degrade planned playback and per-km splits.
- **Craft:** `data/craft.json` is a lookup list (`id`, `name`, `type`, `make`, `model`, `colour`, `registration`); tracks reference a craft by `craftId`.
- **Region vs area:** `region` is computed server-side from each track's start GPS coordinates against named bounding boxes in `data/regions.json` (no geocoding API — keeps map/location data free). `area` is a free-text, human-assigned field per track in `data/tracks.json`, also filterable, for finer-grained labeling than region (e.g. a specific lake within a region).
- **Config files (git-tracked, hand-maintained):**
  - `data/craft.json` — craft lookup table
  - `data/regions.json` — named bounding boxes for region lookup
  - `data/tracks.json` — per-GPX-filename metadata: `craftId`, `area`, optional `name`
- Type-checking gotcha: a Leaflet-owned DOM ref must not carry a reactive Vue `:class` binding directly — Vue's re-render clobbers classes Leaflet sets imperatively (`leaflet-container`, tile panes). Put reactive classes on a wrapper `<div>` instead (see `app/components/TrackMap.client.vue`).
