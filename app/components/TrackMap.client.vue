<script setup lang="ts">
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { TrackDetail, TrackSummary } from '#shared/types/track'

const props = defineProps<{
  tracks: TrackSummary[]
  visibleIds: string[]
}>()

const wrapperEl = ref<HTMLDivElement>()
const mapEl = ref<HTMLDivElement>()
const colorMode = useColorMode()
let map: L.Map | undefined
const layers = new Map<string, L.Polyline>()

// Coral reads well on the light basemap but loses contrast against the
// hue-rotated dark tiles, and is hard to distinguish for red/green
// colorblindness — amber is legible in both modes and colorblind-safe.
const trackColor = computed(() => (colorMode.value === 'dark' ? '#ffc738' : '#ff6b4a'))

onMounted(async () => {
  await nextTick()
  if (!mapEl.value) return

  map = L.map(mapEl.value).setView([59.16, 11.48], 12)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    className: 'map-tiles',
  }).addTo(map)

  await syncLayers(props.tracks)
  applyVisibility(props.visibleIds)
})

onBeforeUnmount(() => {
  map?.remove()
})

// Builds/removes polyline layers for the full filtered set and re-fits bounds.
// Only the top filters change `tracks`, so this — and the fit — only runs then.
async function syncLayers(tracks: TrackSummary[]) {
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
    const polyline = L.polyline(latLngs, { color: trackColor.value, weight: 3 })
    polyline.bindPopup(`${detail.name} — ${detail.distanceKm.toFixed(1)} km`)
    layers.set(track.id, polyline)
  }

  const allBounds = [...layers.values()].map((l) => l.getBounds())
  if (allBounds.length > 0) {
    let bounds = allBounds[0]!
    for (const b of allBounds.slice(1)) bounds = bounds.extend(b)
    map.fitBounds(bounds, { padding: [24, 24] })
  }

  applyVisibility(props.visibleIds)
}

// Shows/hides layers per the sidebar's toggle/solo state. Never touches bounds.
function applyVisibility(visibleIds: string[]) {
  if (!map) return
  const visible = new Set(visibleIds)
  for (const [id, layer] of layers) {
    const shouldShow = visible.has(id)
    const onMap = map.hasLayer(layer)
    if (shouldShow && !onMap) layer.addTo(map)
    else if (!shouldShow && onMap) layer.remove()
  }
}

watch(() => props.tracks, syncLayers, { deep: false })
watch(() => props.visibleIds, applyVisibility, { deep: false })
watch(trackColor, (color) => {
  for (const layer of layers.values()) layer.setStyle({ color })
})
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
