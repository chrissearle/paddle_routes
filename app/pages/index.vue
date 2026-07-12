<script setup lang="ts">
const {
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
} = useTracks()

const totalDistanceKm = computed(() =>
  filteredTracks.value.reduce((sum, t) => sum + t.distanceKm, 0),
)

const totalDurationHours = computed(
  () => filteredTracks.value.reduce((sum, t) => sum + t.durationSec, 0) / 3600,
)

const visibleIds = computed(() => displayedTracks.value.map((t) => t.id))

const sidebarOpen = ref(false)
function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <TrackFilters
        v-model:craft-id="selectedCraftId"
        v-model:region-id="selectedRegionId"
        v-model:area="selectedArea"
        v-model:date="selectedDate"
        :craft="craft"
        :region-options="regionOptions"
        :area-options="areaOptions"
        :date-options="dateOptions"
      />
      <UButton
        icon="i-lucide-list"
        color="neutral"
        variant="ghost"
        aria-label="Toggle routes sidebar"
        @click="toggleSidebar"
      />
    </div>

    <div class="readout font-mono">
      <span>{{ String(filteredTracks.length).padStart(2, '0') }} ROUTES</span>
      <span>{{ totalDistanceKm.toFixed(1) }} KM</span>
      <span>{{ totalDurationHours.toFixed(1) }} H</span>
    </div>

    <TrackMap :tracks="filteredTracks" :visible-ids="visibleIds" class="map" />

    <TrackSidebar
      v-model:open="sidebarOpen"
      :tracks="filteredTracks"
      :craft="displayedCraft"
      :solo-id="soloId"
      :is-visible="isVisible"
      :toggle-visible="toggleVisible"
      :toggle-solo="toggleSolo"
    />
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toolbar > :first-child {
  flex: 1;
}

.readout {
  display: flex;
  gap: 1.5rem;
  padding: 0.4rem 1.25rem;
  font-size: 0.8rem;
  letter-spacing: 0.04em;
  color: var(--ui-text-muted);
  border-bottom: 1px solid var(--ui-border);
}

.map {
  flex: 1;
  min-height: 0;
}
</style>
