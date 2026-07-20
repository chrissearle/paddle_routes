import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { buildDetail, listGpxFiles, loadCraft, loadRegions, loadTrackConfig } from '../server/utils/track-parse.js'

const dataDir = process.env.DATA_DIR || './data'

const [files, craftMap, regions, config] = await Promise.all([
  listGpxFiles(dataDir),
  loadCraft(dataDir),
  loadRegions(dataDir),
  loadTrackConfig(dataDir),
])

const entries = await Promise.all(
  files.map(async (filename) => [filename, await buildDetail(dataDir, filename, craftMap, regions, config)]),
)

const cacheDir = join(dataDir, '.cache')
await mkdir(cacheDir, { recursive: true })
await writeFile(join(cacheDir, 'tracks.json'), JSON.stringify(Object.fromEntries(entries)))

console.log(`Cached ${entries.length} track(s) to ${join(cacheDir, 'tracks.json')}`)
