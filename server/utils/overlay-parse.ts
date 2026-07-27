import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { OverlayDef, OverlayLevel, OverlayLine } from '#shared/types/track'

// Minimal shape of the source files. Only what we consume is typed — the
// Kartverket exports carry a further seven properties per feature (objectid,
// globalid, st_length(shape), …) that are dropped during the build, which is
// on its own a ~3.6x reduction before any simplification.
interface SourceGeometry {
  type: 'LineString' | 'MultiLineString'
  coordinates: number[][] | number[][][]
}

interface SourceFeature {
  properties: Record<string, unknown>
  geometry: SourceGeometry | null
}

interface SourceCollection {
  features: SourceFeature[]
}

export async function loadOverlayDefs(dataDir: string): Promise<OverlayDef[]> {
  try {
    const raw = await readFile(join(dataDir, 'geojson.json'), 'utf-8')
    return JSON.parse(raw) as OverlayDef[]
  } catch {
    return []
  }
}

// GeoJSON stores [lon, lat]; everything downstream of here uses [lat, lon] so
// the client can pass arrays straight to L.polyline.
function lineStrings(geometry: SourceGeometry): number[][][] {
  return geometry.type === 'LineString'
    ? [geometry.coordinates as number[][]]
    : (geometry.coordinates as number[][][])
}

// Perpendicular distance from `p` to the segment `a`-`b`, in degrees. Degrees
// rather than metres deliberately: the tolerances are per-level constants that
// only ever need to be self-consistent, and staying in degrees avoids a
// projection per point across ~375k points.
function perpendicularDistance(p: number[], a: number[], b: number[]): number {
  const [px, py] = p as [number, number]
  const [ax, ay] = a as [number, number]
  const [bx, by] = b as [number, number]
  const dx = bx - ax
  const dy = by - ay
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay)
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

// Iterative Douglas-Peucker. Iterative rather than recursive because contour
// lines here run to thousands of points and a recursive split would risk the
// stack on the degenerate (already-straight) cases.
//
// Safe for this data in a way it would not be for track geometry: contours are
// purely decorative, whereas CLAUDE.md forbids simplifying stored track points
// because distances and future per-km splits are derived from them.
function simplify(points: number[][], tolerance: number): number[][] {
  if (tolerance <= 0 || points.length < 3) return points

  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1

  const stack: [number, number][] = [[0, points.length - 1]]
  while (stack.length > 0) {
    const [first, last] = stack.pop()!
    let maxDist = 0
    let index = -1
    for (let i = first + 1; i < last; i++) {
      const dist = perpendicularDistance(points[i]!, points[first]!, points[last]!)
      if (dist > maxDist) {
        maxDist = dist
        index = i
      }
    }
    if (index !== -1 && maxDist > tolerance) {
      keep[index] = 1
      stack.push([first, index], [index, last])
    }
  }

  return points.filter((_, i) => keep[i] === 1)
}

// A feature survives a level if its property value is a multiple of the
// level's interval. Expressed as an interval rather than an explicit depth
// list so the ladder stays correct as datasets with different contour spacings
// are added — interval 10 keeps 0/10/20/…, interval 5 adds the halves, 0 keeps
// everything. Scaled to integers first: 7.5 % 2.5 is not reliably 0 in floats.
function matchesInterval(value: number, interval: number): boolean {
  if (interval <= 0) return true
  return Math.round(value * 1000) % Math.round(interval * 1000) === 0
}

export function buildLevel(collection: SourceCollection, def: OverlayDef, level: OverlayLevel): OverlayLine[] {
  const lines: OverlayLine[] = []
  const factor = 10 ** level.precision

  for (const feature of collection.features) {
    if (!feature.geometry) continue
    const value = feature.properties[def.property]
    if (typeof value !== 'number' || !matchesInterval(value, level.interval)) continue

    for (const coords of lineStrings(feature.geometry)) {
      const simplified = simplify(coords, level.tolerance)
      // A two-point line that simplification has collapsed to a dot renders as
      // nothing but still costs bytes.
      if (simplified.length < 2) continue
      lines.push([
        value,
        simplified.map(([lon, lat]) => [
          Math.round(lat! * factor) / factor,
          Math.round(lon! * factor) / factor,
        ]),
      ])
    }
  }

  return lines
}

export async function readOverlaySource(dataDir: string, file: string): Promise<SourceCollection> {
  const raw = await readFile(join(dataDir, 'geojson', file), 'utf-8')
  return JSON.parse(raw) as SourceCollection
}
