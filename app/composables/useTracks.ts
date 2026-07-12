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
  }
}
