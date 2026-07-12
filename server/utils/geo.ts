import type { RegionDef, TrackPoint } from '#shared/types/track'

const EARTH_RADIUS_KM = 6371

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180
}

export function haversineDistanceKm(a: TrackPoint, b: TrackPoint): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLon = toRadians(b.lon - a.lon)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export function trackDistanceKm(points: TrackPoint[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += haversineDistanceKm(points[i - 1]!, points[i]!)
  }
  return total
}

export function findRegion(point: TrackPoint, regions: RegionDef[]): RegionDef | undefined {
  return regions.find(
    (region) =>
      point.lat >= region.bounds.minLat &&
      point.lat <= region.bounds.maxLat &&
      point.lon >= region.bounds.minLon &&
      point.lon <= region.bounds.maxLon,
  )
}
