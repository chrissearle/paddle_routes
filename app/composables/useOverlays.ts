import type { OverlayLine, OverlayMeta } from '#shared/types/track'

// Picks the first level whose maxZoom covers the current zoom. The final level
// has no maxZoom and is the fallback, so this always resolves.
export function levelForZoom(meta: OverlayMeta, zoom: number): number {
  const index = meta.levels.findIndex((l) => l.maxZoom === undefined || zoom <= l.maxZoom)
  return index === -1 ? meta.levels.length - 1 : index
}

export function useOverlays() {
  // Definitions only — no geometry, so this is cheap enough to render with the
  // page. Geometry is fetched per level, on demand, by `requestLevel` below.
  const { data: overlays } = useFetch<OverlayMeta[]>('/api/geojson', { default: () => [] })

  const hiddenOverlayIds = reactive(new Set<string>())
  // `defaultVisible` is applied once, when the definitions land. Tracked
  // separately so a user's later toggle-off is not undone by a refetch.
  const seeded = new Set<string>()
  watch(
    overlays,
    (list) => {
      for (const o of list) {
        if (seeded.has(o.id)) continue
        seeded.add(o.id)
        if (!o.defaultVisible) hiddenOverlayIds.add(o.id)
      }
    },
    { immediate: true },
  )

  function isOverlayVisible(id: string): boolean {
    return !hiddenOverlayIds.has(id)
  }

  function toggleOverlay(id: string) {
    if (hiddenOverlayIds.has(id)) hiddenOverlayIds.delete(id)
    else hiddenOverlayIds.add(id)
  }

  // Level geometry, keyed `${id}:${level}`. Levels are immutable for the life
  // of a deploy, so once a level is here it is never refetched — zooming in and
  // back out costs nothing. In-flight requests live in the same map so a burst
  // of zoom events cannot start the same download twice.
  const levelData = reactive(new Map<string, OverlayLine[]>()) as Map<string, OverlayLine[]>
  const inFlight = new Map<string, Promise<void>>()
  const loading = ref(false)

  function requestLevel(id: string, level: number): void {
    const key = `${id}:${level}`
    if (levelData.has(key) || inFlight.has(key)) return

    loading.value = true
    const promise = $fetch<OverlayLine[]>(`/api/geojson/${encodeURIComponent(id)}/${level}`)
      .then((lines) => {
        levelData.set(key, lines)
      })
      .catch(() => {
        // A failed level leaves whatever level is already rendered in place.
        // Deliberately silent: an overlay is supplementary map decoration, and
        // a toast for it would be noise on top of the actual tracks.
      })
      .finally(() => {
        inFlight.delete(key)
        if (inFlight.size === 0) loading.value = false
      })

    inFlight.set(key, promise)
  }

  return {
    overlays,
    overlayLevels: levelData,
    overlaysLoading: loading,
    isOverlayVisible,
    toggleOverlay,
    hiddenOverlayIds,
    requestLevel,
  }
}
