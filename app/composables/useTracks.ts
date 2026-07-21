import type { Craft, EncodedPoint, TrackSummary } from '#shared/types/track'

export function useTracks() {
  const { data: tracks } = useFetch<TrackSummary[]>('/api/tracks', { default: () => [] })
  const { data: craft } = useFetch<Craft[]>('/api/craft', { default: () => [] })

  // All track geometry in one request, fetched once and filtered client-side —
  // so changing a filter redraws with zero network.
  //
  // `server: false` keeps this bulk payload out of the SSR HTML, and `lazy`
  // keeps it from blocking hydration. Starting it here rather than inside
  // TrackMap matters: the request overlaps with the Leaflet chunk download and
  // hydration instead of queueing behind them.
  const { data: geometry, pending: geometryPending } = useFetch<Record<string, EncodedPoint[]>>(
    '/api/tracks/points',
    { default: () => ({}), lazy: true, server: false },
  )

  const route = useRoute()
  const toast = useToast()

  const regionOptions = computed(() => {
    const seen = new Map<string, string>()
    for (const t of tracks.value) seen.set(t.regionId, t.regionName)
    return [...seen.entries()].map(([id, name]) => ({ id, name }))
  })

  const areaOptions = computed(() => {
    const seen = new Set<string>()
    for (const t of tracks.value) if (t.area) seen.add(t.area)
    return [...seen].sort()
  })

  const dateOptions = computed(() => {
    const seen = new Set<string>()
    for (const t of tracks.value) seen.add(t.date)
    return [...seen].sort().reverse()
  })

  const selectedCraftId = ref<string>('')
  const selectedRegionId = ref<string>('')
  const selectedArea = ref<string>('')
  const selectedDate = ref<string>('')

  const filteredTracks = computed(() =>
    tracks.value.filter((t) => {
      if (selectedCraftId.value && t.craftId !== selectedCraftId.value) return false
      if (selectedRegionId.value && t.regionId !== selectedRegionId.value) return false
      if (selectedArea.value && t.area !== selectedArea.value) return false
      if (selectedDate.value && t.date !== selectedDate.value) return false
      return true
    }),
  )

  // Sidebar visibility/solo state — deliberately independent of the top filters.
  // Toggling a track on/off, or soloing one, must not change `filteredTracks`
  // (the list the sidebar renders) or trigger the map to re-fit bounds.
  const hiddenIds = reactive(new Set<string>())
  // Seeded synchronously from `?track=<filename>` — safe even before `tracks`
  // has loaded, since an id that turns out to be invalid is cleared by the
  // `filteredTracks` watcher below once the real list arrives. Doing this
  // synchronously (rather than waiting on the fetch) keeps SSR and client
  // renders identical, avoiding a hydration mismatch.
  const rawTrackParam = route.query.track
  const soloId = ref<string>(Array.isArray(rawTrackParam) ? (rawTrackParam[0] ?? '') : (rawTrackParam ?? ''))

  watch(
    filteredTracks,
    (list) => {
      const ids = new Set(list.map((t) => t.id))
      for (const id of hiddenIds) if (!ids.has(id)) hiddenIds.delete(id)
      if (soloId.value && !ids.has(soloId.value)) soloId.value = ''
    },
    { flush: 'sync' },
  )

  function isVisible(id: string): boolean {
    if (soloId.value) return soloId.value === id
    return !hiddenIds.has(id)
  }

  function toggleVisible(id: string) {
    if (soloId.value) return
    if (hiddenIds.has(id)) hiddenIds.delete(id)
    else hiddenIds.add(id)
  }

  function toggleSolo(id: string) {
    soloId.value = soloId.value === id ? '' : id
  }

  function copyTrackLink(id: string) {
    const url = `${window.location.origin}${route.path}?track=${encodeURIComponent(id)}`
    navigator.clipboard
      .writeText(url)
      .then(() => toast.add({ title: 'Link copied', color: 'success' }))
      .catch(() => toast.add({ title: 'Could not copy link', color: 'error' }))
  }

  const displayedTracks = computed(() => filteredTracks.value.filter((t) => isVisible(t.id)))

  const displayedCraft = computed(() => {
    const ids = new Set(filteredTracks.value.map((t) => t.craftId))
    return craft.value.filter((c) => ids.has(c.id))
  })

  // Which track ids currently intersect the map's viewport, as reported by
  // TrackMap on mount/pan/zoom. `null` means "not yet constrained" (before
  // the map has reported its first bounds), so nothing is hidden prematurely.
  const viewportIds = ref<Set<string> | null>(null)
  function setViewportIds(ids: string[]) {
    viewportIds.value = new Set(ids)
  }

  // Filter-matched and currently on-screen. Deliberately not further filtered
  // by `isVisible` — hidden/soloed tracks must stay in the list (greyed out)
  // so they can still be toggled back on.
  const sidebarTracks = computed(() =>
    viewportIds.value === null
      ? filteredTracks.value
      : filteredTracks.value.filter((t) => viewportIds.value!.has(t.id)),
  )

  // On-screen (viewport) and actually visible (not hidden/soloed-out) —
  // what the top readout's totals should reflect.
  const visibleSidebarTracks = computed(() => sidebarTracks.value.filter((t) => isVisible(t.id)))

  return {
    tracks,
    craft,
    geometry,
    geometryPending,
    regionOptions,
    areaOptions,
    dateOptions,
    selectedCraftId,
    selectedRegionId,
    selectedArea,
    selectedDate,
    filteredTracks,
    displayedTracks,
    displayedCraft,
    sidebarTracks,
    visibleSidebarTracks,
    setViewportIds,
    soloId,
    isVisible,
    toggleVisible,
    toggleSolo,
    copyTrackLink,
  }
}
