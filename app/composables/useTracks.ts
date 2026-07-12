import type { Craft, TrackSummary } from '#shared/types/track'

export function useTracks() {
  const { data: tracks } = useFetch<TrackSummary[]>('/api/tracks', { default: () => [] })
  const { data: craft } = useFetch<Craft[]>('/api/craft', { default: () => [] })

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
    return [...seen].sort()
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
  const soloId = ref<string>('')

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

  const displayedTracks = computed(() => filteredTracks.value.filter((t) => isVisible(t.id)))

  const displayedCraft = computed(() => {
    const ids = new Set(filteredTracks.value.map((t) => t.craftId))
    return craft.value.filter((c) => ids.has(c.id))
  })

  return {
    tracks,
    craft,
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
    soloId,
    isVisible,
    toggleVisible,
    toggleSolo,
  }
}
