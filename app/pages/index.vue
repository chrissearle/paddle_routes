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
} = useTracks()

const totalDistanceKm = computed(() =>
  filteredTracks.value.reduce((sum, t) => sum + t.distanceKm, 0),
)

const totalDurationHours = computed(
  () => filteredTracks.value.reduce((sum, t) => sum + t.durationSec, 0) / 3600,
)
</script>

<template>
  <div class="page">
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

    <div class="readout font-mono">
      <span>{{ String(filteredTracks.length).padStart(2, '0') }} TRACKS</span>
      <span>{{ totalDistanceKm.toFixed(1) }} KM</span>
      <span>{{ totalDurationHours.toFixed(1) }} H</span>
    </div>

    <TrackMap :tracks="filteredTracks" class="map" />
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
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
