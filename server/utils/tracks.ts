import { join } from 'node:path'
import { useRuntimeConfig } from '#imports'
import { buildDetail, listGpxFiles, loadCraft, loadRegions, loadTrackConfig, readJson } from './track-parse'
import type { Craft, RegionDef, TrackConfigEntry, TrackDetail, TrackSummary } from '#shared/types/track'

function dataDir(): string {
  return useRuntimeConfig().dataDir
}

// Pre-parsed cache written by scripts/build-track-cache.mjs at image build
// time. Loaded once per process; a cache miss (local dev without the build
// step, or a track added since the last build) falls back to live parsing.
let cachePromise: Promise<Record<string, TrackDetail>> | undefined

function loadCache(dir: string): Promise<Record<string, TrackDetail>> {
  cachePromise ??= readJson<Record<string, TrackDetail>>(join(dir, '.cache', 'tracks.json'), {})
  return cachePromise
}

async function getOrBuildDetail(
  dir: string,
  filename: string,
  craftMap: Map<string, Craft>,
  regions: RegionDef[],
  config: Map<string, TrackConfigEntry>,
): Promise<TrackDetail> {
  const cache = await loadCache(dir)
  return cache[filename] ?? buildDetail(dir, filename, craftMap, regions, config)
}

export async function listTrackSummaries(): Promise<TrackSummary[]> {
  const dir = dataDir()
  const [files, craftMap, regions, config] = await Promise.all([
    listGpxFiles(dir),
    loadCraft(dir),
    loadRegions(dir),
    loadTrackConfig(dir),
  ])

  const details = await Promise.all(files.map((f) => getOrBuildDetail(dir, f, craftMap, regions, config)))
  return details.map(({ points: _points, ...summary }) => summary)
}

export async function getTrackDetail(id: string): Promise<TrackDetail | undefined> {
  const dir = dataDir()
  const files = await listGpxFiles(dir)
  if (!files.includes(id)) return undefined

  const [craftMap, regions, config] = await Promise.all([loadCraft(dir), loadRegions(dir), loadTrackConfig(dir)])
  return getOrBuildDetail(dir, id, craftMap, regions, config)
}
