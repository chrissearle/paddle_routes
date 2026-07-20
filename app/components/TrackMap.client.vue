<script setup lang="ts">
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { TrackDetail, TrackSummary } from '#shared/types/track'

const props = defineProps<{
  tracks: TrackSummary[]
  visibleIds: string[]
}>()

const emit = defineEmits<{
  'viewport-change': [ids: string[]]
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

  map.on('moveend', updateViewportIds)

  await syncLayers(props.tracks)
  updateViewportIds()
})

onBeforeUnmount(() => {
  map?.remove()
})

// Builds/removes polyline layers for the full filtered set. Bounds are fit
// separately in `applyVisibility`, called at the end of this function once
// the new layers exist.
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

  applyVisibility(props.visibleIds)
}

// Shows/hides layers per the sidebar's toggle/solo state, and fits the map
// to whichever layers end up visible — so the map always zooms to match
// whatever the sidebar currently shows, whether that came from the top
// filters, a solo, a manual toggle-off, or a restored permalink.
function applyVisibility(visibleIds: string[]) {
  if (!map) return
  const visible = new Set(visibleIds)
  const shownLayers: L.Polyline[] = []
  for (const [id, layer] of layers) {
    const shouldShow = visible.has(id)
    const onMap = map.hasLayer(layer)
    if (shouldShow && !onMap) layer.addTo(map)
    else if (!shouldShow && onMap) layer.remove()
    if (shouldShow) shownLayers.push(layer)
  }

  if (shownLayers.length > 0) {
    let bounds = shownLayers[0]!.getBounds()
    for (const layer of shownLayers.slice(1)) bounds = bounds.extend(layer.getBounds())
    map.fitBounds(bounds, { padding: [24, 24] })
  }
}

// Reports which layers currently intersect the visible map viewport, for
// panning/zooming to narrow the sidebar list — separate from `applyVisibility`,
// which controls which layers are drawn on the map at all.
//
// Checked against actual track points rather than each layer's bounding box:
// a long or winding track's bbox can span far beyond its line (e.g. a route
// that runs east also drags the bbox west), which caused unrelated tracks to
// be reported as "visible" just because the viewport overlapped that bbox.
function updateViewportIds() {
  if (!map) return
  const bounds = map.getBounds()
  const ids = [...layers.entries()]
    .filter(([, layer]) => (layer.getLatLngs() as L.LatLng[]).some((ll) => bounds.contains(ll)))
    .map(([id]) => id)
  emit('viewport-change', ids)
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
