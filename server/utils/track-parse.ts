import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseGpx } from './gpx'
import { trackDistanceKm, findRegion } from './geo'
import type { Craft, RegionDef, TrackConfigEntry, TrackDetail } from '#shared/types/track'

// Pure, Nuxt-context-free GPX parsing shared by the Nitro server
// (server/utils/tracks.ts) and the build-time cache generator
// (scripts/build-track-cache.mjs), which runs as a plain Node script with
// no access to Nuxt auto-imports like `#imports`.

const UNKNOWN_REGION: RegionDef = {
  id: 'unknown',
  name: 'Unknown',
  bounds: { minLat: -90, maxLat: 90, minLon: -180, maxLon: 180 },
}

export async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export async function loadCraft(dir: string): Promise<Map<string, Craft>> {
  const list = await readJson<Craft[]>(join(dir, 'craft.json'), [])
  return new Map(list.map((c) => [c.id, c]))
}

export async function loadRegions(dir: string): Promise<RegionDef[]> {
  return readJson<RegionDef[]>(join(dir, 'regions.json'), [])
}

export async function loadTrackConfig(dir: string): Promise<Map<string, TrackConfigEntry>> {
  const list = await readJson<TrackConfigEntry[]>(join(dir, 'tracks.json'), [])
  return new Map(list.map((entry) => [entry.filename, entry]))
}

export async function listGpxFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir)
  return entries.filter((f) => f.endsWith('.gpx')).sort()
}

function dateFromFilename(filename: string): string {
  const match = filename.match(/(\d{4}-\d{2}-\d{2})/)
  return match ? match[1]! : filename
}

export async function buildDetail(
  dir: string,
  filename: string,
  craftMap: Map<string, Craft>,
  regions: RegionDef[],
  config: Map<string, TrackConfigEntry>,
): Promise<TrackDetail> {
  const xml = await readFile(join(dir, filename), 'utf-8')
  const { points } = parseGpx(xml)

  const entry = config.get(filename)
  const craft = entry ? craftMap.get(entry.craftId) : undefined
  const region = points.length > 0 ? (findRegion(points[0]!, regions) ?? UNKNOWN_REGION) : UNKNOWN_REGION

  const startTime = points[0]?.time ?? ''
  const endTime = points.at(-1)?.time ?? ''
  const durationSec =
    startTime && endTime ? (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000 : 0

  return {
    id: filename,
    filename,
    name: entry?.name ?? dateFromFilename(filename),
    date: dateFromFilename(filename),
    startTime,
    endTime,
    craftId: craft?.id ?? 'unknown',
    craftName: craft?.name ?? 'Unknown',
    area: entry?.area ?? 'Unknown',
    regionId: region.id,
    regionName: region.name,
    distanceKm: trackDistanceKm(points),
    durationSec,
    points,
  }
}
