import { XMLParser } from 'fast-xml-parser'
import type { TrackPoint } from '#shared/types/track'

interface RawTrkpt {
  '@_lat': string
  '@_lon': string
  ele?: number | string
  time?: string
}

interface RawGpx {
  gpx?: {
    trk?: {
      name?: string
      trkseg?: {
        trkpt?: RawTrkpt | RawTrkpt[]
      }
    }
  }
}

const parser = new XMLParser({ ignoreAttributes: false })

export interface ParsedGpx {
  points: TrackPoint[]
}

export function parseGpx(xml: string): ParsedGpx {
  const raw = parser.parse(xml) as RawGpx
  const rawPoints = raw.gpx?.trk?.trkseg?.trkpt
  const list = Array.isArray(rawPoints) ? rawPoints : rawPoints ? [rawPoints] : []

  const points: TrackPoint[] = list.map((pt) => ({
    lat: Number(pt['@_lat']),
    lon: Number(pt['@_lon']),
    ele: pt.ele !== undefined ? Number(pt.ele) : 0,
    time: pt.time ?? '',
  }))

  return { points }
}
