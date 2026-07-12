# Paddle tracks

A Nuxt 4 app that plots [Paddle Logger](https://paddlelogger.com) GPX tracks on a map, with drill-downs by craft, region, area, and date.

## How it works

- GPX files live in `data/` (or wherever `DATA_DIR` points) and are parsed on request — no build step needed to pick up a new track.
- Region is computed automatically from each track's start coordinates, matched against named bounding boxes in `data/regions.json`.
- Craft and area are hand-maintained per track in `data/tracks.json` and `data/craft.json`, since Paddle Logger doesn't export that information.
- Map tiles are free OpenStreetMap tiles rendered with Leaflet; a CSS filter darkens them to match dark mode.

## Config files

| File                | Purpose                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `data/craft.json`   | Lookup list of craft: `id`, `name`, `type`, `make`, `model`, `colour`, `registration`                                  |
| `data/regions.json` | Named bounding boxes (`minLat`/`maxLat`/`minLon`/`maxLon`) used to derive each track's region from its GPS start point |
| `data/tracks.json`  | Per-GPX-filename metadata: `craftId` (references `craft.json`), `area` (free text), optional `name`                    |

Add a new track by dropping the `.gpx` file into `data/` and adding a matching entry to `data/tracks.json`. Tracks without a config entry still show up, labelled "Unknown" craft/area.

## Setup

```bash
pnpm install
```

## Development

```bash
pnpm dev
```

Runs on `http://localhost:3000`. Reads GPX/config from `./data` by default; override with `DATA_DIR=/path/to/data pnpm dev`.

## Checks

```bash
pnpm lint       # ESLint
pnpm typecheck  # nuxt typecheck
```

Both run automatically on staged files via a Husky pre-commit hook.

## Production

```bash
pnpm build
pnpm preview
```

Set `DATA_DIR` in the deployment environment to point at wherever the GPX/config files live.
