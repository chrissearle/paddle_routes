import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { useRuntimeConfig } from '#imports'
import { buildLevel, loadOverlayDefs, readOverlaySource } from './overlay-parse'
import type { OverlayDef, OverlayLine, OverlayMeta } from '#shared/types/track'

function dataDir(): string {
  return useRuntimeConfig().dataDir
}

let defsPromise: Promise<OverlayDef[]> | undefined

function defs(): Promise<OverlayDef[]> {
  defsPromise ??= loadOverlayDefs(dataDir())
  return defsPromise
}

// The `file` path is server-only — the client never needs to know where the
// source GeoJSON lives, only how to style and request it.
export async function listOverlayMeta(): Promise<OverlayMeta[]> {
  return (await defs()).map(({ file: _file, ...meta }) => meta)
}

export async function findOverlay(id: string): Promise<OverlayDef | undefined> {
  return (await defs()).find((d) => d.id === id)
}

// Pre-built levels written by scripts/build-geojson-cache.ts at image build
// time. A cache miss (local dev without the build step, or an overlay added
// since the last build) falls back to building the level live — the same
// tolerance the track cache has. That fallback parses the full source file,
// which can be tens of MB, so it is genuinely a dev convenience rather than a
// production path.
export async function getOverlayLevel(def: OverlayDef, index: number): Promise<OverlayLine[] | undefined> {
  const level = def.levels[index]
  if (!level) return undefined

  const dir = dataDir()
  try {
    const cached = await readFile(join(dir, '.cache', 'geojson', `${def.id}-${index}.json`), 'utf-8')
    return JSON.parse(cached) as OverlayLine[]
  } catch {
    // Cache miss. Fall back to building from source, which is a dev
    // convenience only — a built image always has the cache.
    try {
      const collection = await readOverlaySource(dir, def.file)
      return buildLevel(collection, def, level)
    } catch {
      // No cache and no source. The build script warns and skips in this case
      // rather than failing, so match that here: serve the overlay as empty so
      // one missing file cannot take the map down.
      console.warn(`Overlay ${def.id}: no cache and no source (${def.file}) — serving empty`)
      return []
    }
  }
}
