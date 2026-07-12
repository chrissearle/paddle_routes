export function formatDuration(durationSec: number): string {
  const totalMinutes = Math.round(durationSec / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

export function formatDistance(distanceKm: number): string {
  return `${distanceKm.toFixed(1)} km`
}
