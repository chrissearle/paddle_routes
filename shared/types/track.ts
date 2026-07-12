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
  craftId: string
  area?: string
  name?: string
}

export type TrackConfig = Record<string, TrackConfigEntry>

export interface TrackPoint {
  lat: number
  lon: number
  ele: number
  time: string
}

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
  points: TrackPoint[]
}
