<script setup lang="ts">
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { EncodedPoint, TrackSummary } from '#shared/types/track'

const props = defineProps<{
  tracks: TrackSummary[]
  visibleIds: string[]
  geometry: Record<string, EncodedPoint[]>
  pending: boolean
}>()

const emit = defineEmits<{
  'viewport-change': [ids: string[]]
}>()

const wrapperEl = ref<HTMLDivElement>()
const mapEl = ref<HTMLDivElement>()
const colorMode = useColorMode()
let map: L.Map | undefined
const layers = new Map<string, L.Polyline>()
// Each layer's bounding box, cached at build time so `updateViewportIds` can
// reject non-intersecting tracks without walking their points.
const layerBounds = new Map<string, L.LatLngBounds>()

// True until the first polyline is on the map, which is what the skeleton
// covers — `pending` alone would uncover a still-empty map for a frame.
const drawn = ref(false)
const showSkeleton = computed(() => !drawn.value)

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

  syncLayers()
  updateViewportIds()
})

onBeforeUnmount(() => {
  map?.remove()
})

// Builds/removes polyline layers for the full filtered set. Synchronous — all
// geometry arrives in a single up-front request (see `useTracks`), so this is
// pure work against data already in memory and filter changes redraw instantly.
// Bounds are fit separately in `applyVisibility`, called at the end once the
// new layers exist.
function syncLayers() {
  if (!map) return

  const activeIds = new Set(props.tracks.map((t) => t.id))
  for (const [id, layer] of layers) {
    if (!activeIds.has(id)) {
      layer.remove()
      layers.delete(id)
      layerBounds.delete(id)
    }
  }

  for (const track of props.tracks) {
    if (layers.has(track.id)) continue
    const pts = props.geometry[track.id]
    // Geometry request still in flight — the watcher re-runs when it lands.
    if (!pts) continue

    const latLngs = pts.map(([lat, lon]) => [lat, lon] as [number, number])
    // smoothFactor decimates in screen space at render time, adaptively per
    // zoom. Gets the drawing cost of simplification without discarding any
    // stored points, which the planned playback/per-km-split features need.
    const polyline = L.polyline(latLngs, { color: trackColor.value, weight: 3, smoothFactor: 2 })
    polyline.bindPopup(`${track.name} — ${track.distanceKm.toFixed(1)} km`)
    layers.set(track.id, polyline)
    layerBounds.set(track.id, polyline.getBounds())
  }

  if (layers.size > 0) drawn.value = true
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
// The cached bbox is used only to *reject*. A track whose bbox misses the
// viewport entirely cannot have a point inside it, so that test is exact —
// while anything that survives it still gets the full point scan the comment
// above requires. This skips most of the per-`moveend` work (`fitBounds`
// itself fires `moveend`) without changing which ids are reported.
function updateViewportIds() {
  if (!map) return
  const bounds = map.getBounds()
  const ids = [...layers.entries()]
    .filter(([id, layer]) => {
      const bbox = layerBounds.get(id)
      if (bbox && !bounds.intersects(bbox)) return false
      return (layer.getLatLngs() as L.LatLng[]).some((ll) => bounds.contains(ll))
    })
    .map(([id]) => id)
  emit('viewport-change', ids)
}

watch(() => props.tracks, syncLayers, { deep: false })
watch(() => props.geometry, syncLayers, { deep: false })
watch(() => props.visibleIds, applyVisibility, { deep: false })
watch(trackColor, (color) => {
  for (const layer of layers.values()) layer.setStyle({ color })
})
</script>

<template>
  <div ref="wrapperEl" class="track-map-wrapper" :class="{ 'track-map-wrapper--dark': colorMode.value === 'dark' }">
    <div ref="mapEl" class="track-map" />
    <Transition name="skeleton">
      <div v-if="showSkeleton" class="track-map-skeleton">
        <span class="track-map-skeleton__label font-mono">LOADING ROUTES</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.track-map-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 480px;
}

/* Sits above the tiles but below Leaflet's controls (z-index 1000), so zoom
   and attribution stay reachable while routes are still loading. */
.track-map-skeleton {
  position: absolute;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: var(--ui-bg);
}

.track-map-skeleton__label {
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  color: var(--ui-text-muted);
  animation: track-map-pulse 1.4s ease-in-out infinite;
}

@keyframes track-map-pulse {
  0%,
  100% {
    opacity: 0.35;
  }
  50% {
    opacity: 1;
  }
}

.skeleton-leave-active {
  transition: opacity 0.35s ease;
}

.skeleton-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .track-map-skeleton__label {
    animation: none;
  }
}

.track-map {
  width: 100%;
  height: 100%;
}

.track-map-wrapper--dark :deep(.map-tiles) {
  filter: brightness(0.65) invert(1) contrast(0.9) hue-rotate(180deg) saturate(0.6);
}
</style>
