import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { useRuntimeConfig } from '#imports'
import { parseGpx } from './gpx'
import { trackDistanceKm, findRegion } from './geo'
import type { Craft, RegionDef, TrackConfig, TrackDetail, TrackSummary } from '#shared/types/track'

const UNKNOWN_REGION: RegionDef = {
  id: 'unknown',
  name: 'Unknown',
  bounds: { minLat: -90, maxLat: 90, minLon: -180, maxLon: 180 },
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function dataDir(): string {
  return useRuntimeConfig().dataDir
}

async function loadCraft(): Promise<Map<string, Craft>> {
  const list = await readJson<Craft[]>(join(dataDir(), 'craft.json'), [])
  return new Map(list.map((c) => [c.id, c]))
}

async function loadRegions(): Promise<RegionDef[]> {
  return readJson<RegionDef[]>(join(dataDir(), 'regions.json'), [])
}

async function loadTrackConfig(): Promise<TrackConfig> {
  return readJson<TrackConfig>(join(dataDir(), 'tracks.json'), {})
}

async function listGpxFiles(): Promise<string[]> {
  const entries = await readdir(dataDir())
  return entries.filter((f) => f.endsWith('.gpx')).sort()
}

function dateFromFilename(filename: string): string {
  const match = filename.match(/(\d{4}-\d{2}-\d{2})/)
  return match ? match[1]! : filename
}

async function buildDetail(
  filename: string,
  craftMap: Map<string, Craft>,
  regions: RegionDef[],
  config: TrackConfig,
): Promise<TrackDetail> {
  const xml = await readFile(join(dataDir(), filename), 'utf-8')
  const { points } = parseGpx(xml)

  const entry = config[filename]
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

export async function listTrackSummaries(): Promise<TrackSummary[]> {
  const [files, craftMap, regions, config] = await Promise.all([
    listGpxFiles(),
    loadCraft(),
    loadRegions(),
    loadTrackConfig(),
  ])

  const details = await Promise.all(files.map((f) => buildDetail(f, craftMap, regions, config)))
  return details.map(({ points: _points, ...summary }) => summary)
}

export async function getTrackDetail(id: string): Promise<TrackDetail | undefined> {
  const files = await listGpxFiles()
  if (!files.includes(id)) return undefined

  const [craftMap, regions, config] = await Promise.all([loadCraft(), loadRegions(), loadTrackConfig()])
  return buildDetail(id, craftMap, regions, config)
}
