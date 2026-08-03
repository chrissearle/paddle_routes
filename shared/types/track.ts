export type CraftType = 'kayak' | 'canoe' | 'packraft'

export interface Craft {
  id: string
  name: string
  type: CraftType
  make: string
  model: string
  colour: string
  registration?: string
  callSign?: string
  mmsi?: string
  mobileMmsi?: string
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

// --- GeoJSON overlays -------------------------------------------------------

// A styling rule matched against a feature's `property` value. Rules are
// evaluated in order and the first whose range contains the value wins, so
// they mirror the ordering semantics of the MapCSS files these are derived
// from (see data/geojson/*.mapcss) without needing a MapCSS parser.
export interface OverlayStyleRule {
  // Inclusive lower bound; exclusive upper bound. Both optional (open-ended).
  min?: number
  max?: number
  color: string
  weight: number
}

// One rung of the detail ladder. The client picks the first level whose
// `maxZoom` is >= the map's current zoom (the last level is the fallback).
//
// This is the primary bandwidth lever: this dataset is dense inside a small
// area rather than spread out, so spatial tiling barely helps (a z11 grid
// yields 13 tiles averaging ~264KB and duplicates every edge-straddling line),
// whereas dropping intermediate contours and simplifying geometry takes the
// far level to ~30KB.
export interface OverlayLevel {
  // Highest map zoom this level serves. Omitted on the final (full-detail) level.
  maxZoom?: number
  // Keep only features whose `property` value is a multiple of this. 0 = keep all.
  interval: number
  // Douglas-Peucker tolerance in degrees. 0 = no simplification.
  tolerance: number
  // Coordinate rounding, in decimal places.
  precision: number
}

export interface OverlayDef {
  id: string
  name: string
  file: string
  defaultVisible: boolean
  // Numeric feature property that drives both styling and level filtering.
  property: string
  // Appended to the value in popups, e.g. "m".
  unit?: string
  // Stroke alpha for the whole overlay. These layers are context sitting under
  // the tracks, so they are deliberately faint — tune here rather than baking
  // alpha into each style rule's colour, which would make the ramp harder to
  // adjust as a whole. Defaults to 0.75 if omitted.
  opacity?: number
  style: OverlayStyleRule[]
  levels: OverlayLevel[]
}

// Wire format: [value, [[lat, lon], ...]] per line. Note lat/lon order — the
// reverse of GeoJSON's [lon, lat] — so the client can hand arrays straight to
// L.polyline without flipping every point. Purely decorative geometry, so
// unlike track points it is safe to simplify (nothing is measured from it).
export type OverlayLine = [number, [number, number][]]

// What /api/geojson returns: the definitions, minus the server-only `file`.
export type OverlayMeta = Omit<OverlayDef, 'file'>
