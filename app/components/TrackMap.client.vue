<script setup lang="ts">
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { TrackDetail, TrackSummary } from '#shared/types/track'

const props = defineProps<{
  tracks: TrackSummary[]
}>()

const wrapperEl = ref<HTMLDivElement>()
const mapEl = ref<HTMLDivElement>()
const colorMode = useColorMode()
let map: L.Map | undefined
const layers = new Map<string, L.Polyline>()

onMounted(async () => {
  await nextTick()
  if (!mapEl.value) return

  map = L.map(mapEl.value).setView([59.16, 11.48], 12)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    className: 'map-tiles',
  }).addTo(map)

  syncTracks(props.tracks)
})

onBeforeUnmount(() => {
  map?.remove()
})

async function syncTracks(tracks: TrackSummary[]) {
  if (!map) return

  const activeIds = new Set(tracks.map((t) => t.id))
  for (const [id, layer] of layers) {
    if (!activeIds.has(id)) {
      layer.remove()
      layers.delete(id)
    }
  }

  for (const track of tracks) {
    if (layers.has(track.id)) continue
    const detail = await $fetch<TrackDetail>(`/api/tracks/${track.id}`)
    const latLngs = detail.points.map((p) => [p.lat, p.lon] as [number, number])
    const polyline = L.polyline(latLngs, { color: '#ff6b4a', weight: 3 }).addTo(map)
    polyline.bindPopup(`${detail.name} — ${detail.distanceKm.toFixed(1)} km`)
    layers.set(track.id, polyline)
  }

  const allBounds = [...layers.values()].map((l) => l.getBounds())
  if (allBounds.length > 0) {
    let bounds = allBounds[0]!
    for (const b of allBounds.slice(1)) bounds = bounds.extend(b)
    map.fitBounds(bounds, { padding: [24, 24] })
  }
}

watch(() => props.tracks, syncTracks, { deep: false })
</script>

<template>
  <div ref="wrapperEl" class="track-map-wrapper" :class="{ 'track-map-wrapper--dark': colorMode.value === 'dark' }">
    <div ref="mapEl" class="track-map" />
  </div>
</template>

<style scoped>
.track-map-wrapper {
  width: 100%;
  height: 100%;
  min-height: 480px;
}

.track-map {
  width: 100%;
  height: 100%;
}

.track-map-wrapper--dark :deep(.map-tiles) {
  filter: brightness(0.65) invert(1) contrast(0.9) hue-rotate(180deg) saturate(0.6);
}
</style>
