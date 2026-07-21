export type CraftType = 'kayak' | 'canoe' | 'packraft'

export interface Craft {
  id: string
  name: string
  type: CraftType
  make: string
  model: string
  colour: string
  registration?: string
}

export interface RegionBounds {
  minLat: number
  maxLat: number
  minLon: number
  maxLon: number
}

export interface RegionDef {
  id: string
  name: string
  bounds: RegionBounds
}

export interface TrackConfigEntry {
  filename: string
  craftId: string
  area?: string
  name?: string
}

export type TrackConfig = TrackConfigEntry[]

// Full-precision parse shape, used server-side only (gpx.ts, geo.ts). All
// derived metrics — distanceKm, region lookup, and later per-km splits — are
// computed from these, never from the rounded wire format below.
export interface TrackPoint {
  lat: number
  lon: number
  ele: number
  time: string
}

// Wire format: [lat, lon, deltaMs], where deltaMs is elapsed milliseconds
// since the previous point (0 for the first). Timestamps reconstruct exactly
// as a running sum from the track's `startTime`, so no timing fidelity is
// lost — this is purely a transport encoding.
//
// Coordinates are rounded to 5 decimals (~1.1m, well inside GPS's 3-5m
// error). Safe precisely because nothing is measured from them client-side.
export type EncodedPoint = [number, number, number]

export interface TrackSummary {
  id: string
  filename: string
  name: string
  date: string
  startTime: string
  endTime: string
  craftId: string
  craftName: string
  area: string
  regionId: string
  regionName: string
  distanceKm: number
  durationSec: number
}

export interface TrackDetail extends TrackSummary {
  pts: EncodedPoint[]
}
