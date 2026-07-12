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

- **UI:** Nuxt UI (v4) with a custom "water/course" theme (teal primary, coral secondary), dark mode by default with a header toggle. Display font Space Grotesk, body Inter, mono JetBrains Mono for the stats readout.
- **Map:** Leaflet + standard OpenStreetMap tiles, CSS `filter` applied to tiles in dark mode for visual cohesion (no separate paid dark-tile provider).
- **Data flow:** `server/api/tracks.get.ts` / `server/api/tracks/[id].get.ts` parse GPX files from `runtimeConfig.dataDir` (`DATA_DIR` env, default `./data`) on each request — no build-time generation step.
- **Craft:** `data/craft.json` is a lookup list (`id`, `name`, `type`, `make`, `model`, `colour`, `registration`); tracks reference a craft by `craftId`.
- **Region vs area:** `region` is computed server-side from each track's start GPS coordinates against named bounding boxes in `data/regions.json` (no geocoding API — keeps map/location data free). `area` is a free-text, human-assigned field per track in `data/tracks.json`, also filterable, for finer-grained labeling than region (e.g. a specific lake within a region).
- **Config files (git-tracked, hand-maintained):**
  - `data/craft.json` — craft lookup table
  - `data/regions.json` — named bounding boxes for region lookup
  - `data/tracks.json` — per-GPX-filename metadata: `craftId`, `area`, optional `name`
- Type-checking gotcha: a Leaflet-owned DOM ref must not carry a reactive Vue `:class` binding directly — Vue's re-render clobbers classes Leaflet sets imperatively (`leaflet-container`, tile panes). Put reactive classes on a wrapper `<div>` instead (see `app/components/TrackMap.client.vue`).
