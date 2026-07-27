import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { buildLevel, loadOverlayDefs, readOverlaySource } from '../server/utils/overlay-parse'

const dataDir = process.env.DATA_DIR || './data'

const defs = await loadOverlayDefs(dataDir)
const cacheDir = join(dataDir, '.cache', 'geojson')
await mkdir(cacheDir, { recursive: true })

let built = 0

for (const def of defs) {
  // A missing source is a warning, not a build failure: DATA_DIR is
  // configurable and may point at a partially-populated volume. The overlay is
  // simply omitted from the cache, and the API serves it as empty rather than
  // erroring, so the rest of the map is unaffected.
  let collection
  try {
    collection = await readOverlaySource(dataDir, def.file)
  } catch {
    console.warn(`⚠ ${def.id}: source ${def.file} not found under ${dataDir}/geojson — skipping`)
    continue
  }

  built++

  for (const [index, level] of def.levels.entries()) {
    const lines = buildLevel(collection, def, level)
    const json = JSON.stringify(lines)
    await writeFile(join(cacheDir, `${def.id}-${index}.json`), json)

    const points = lines.reduce((sum, [, pts]) => sum + pts.length, 0)
    const zoom = level.maxZoom === undefined ? 'z*' : `z<=${level.maxZoom}`
    console.log(
      `${def.id} L${index} (${zoom}): ${lines.length} lines, ${points} points, ${(json.length / 1024).toFixed(0)}KB raw`,
    )
  }
}

console.log(`Cached ${built} of ${defs.length} overlay(s) to ${cacheDir}`)
