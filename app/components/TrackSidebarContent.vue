<script setup lang="ts">
import type { Craft, TrackSummary } from '#shared/types/track'

const props = defineProps<{
  tracks: TrackSummary[]
  craft: Craft[]
  soloId: string
  isVisible: (id: string) => boolean
  toggleVisible: (id: string) => void
  toggleSolo: (id: string) => void
}>()

const sortedTracks = computed(() =>
  [...props.tracks].sort((a, b) => b.date.localeCompare(a.date)),
)
</script>

<template>
  <div class="sidebar-list">
    <UCard
      v-for="track in sortedTracks"
      :key="track.id"
      :class="{ 'route-card--hidden': !isVisible(track.id) }"
    >
      <div class="route-card">
        <div class="route-card__info">
          <p class="route-card__date font-mono">{{ track.date }}</p>
          <p class="route-card__craft">{{ track.craftName }}</p>
          <p class="route-card__stats font-mono">
            {{ formatDistance(track.distanceKm) }} · {{ formatDuration(track.durationSec) }}
          </p>
        </div>
        <div class="route-card__actions">
          <USwitch
            :model-value="isVisible(track.id)"
            :disabled="!!soloId && soloId !== track.id"
            aria-label="Toggle route visibility"
            @update:model-value="toggleVisible(track.id)"
          />
          <UButton
            :label="soloId === track.id ? 'Unsolo' : 'Solo'"
            size="xs"
            :color="soloId === track.id ? 'secondary' : 'neutral'"
            :variant="soloId === track.id ? 'solid' : 'outline'"
            @click="toggleSolo(track.id)"
          />
        </div>
      </div>
    </UCard>

    <template v-if="craft.length > 0">
      <p class="sidebar-list__heading">Craft</p>
      <UCard v-for="c in craft" :key="c.id">
        <div class="craft-card">
          <p class="craft-card__name">{{ c.name }}</p>
          <dl class="craft-card__details font-mono">
            <dt>Type</dt>
            <dd>{{ c.type }}</dd>
            <dt>Make</dt>
            <dd>{{ c.make }}</dd>
            <dt v-if="c.model">Model</dt>
            <dd v-if="c.model">{{ c.model }}</dd>
            <dt>Colour</dt>
            <dd>{{ c.colour }}</dd>
            <dt v-if="c.registration">Reg.</dt>
            <dd v-if="c.registration">{{ c.registration }}</dd>
          </dl>
        </div>
      </UCard>
    </template>
  </div>
</template>

<style scoped>
.sidebar-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.sidebar-list__heading {
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ui-text-muted);
}

.route-card--hidden {
  opacity: 0.5;
}

.route-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.route-card__date {
  margin: 0;
  font-size: 0.85rem;
}

.route-card__craft {
  margin: 0.15rem 0 0;
  font-size: 0.8rem;
  color: var(--ui-text-muted);
}

.route-card__stats {
  margin: 0.3rem 0 0;
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}

.route-card__actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.craft-card__name {
  margin: 0 0 0.4rem;
  font-weight: 600;
}

.craft-card__details {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.15rem 0.75rem;
  margin: 0;
  font-size: 0.8rem;
}

.craft-card__details dt {
  color: var(--ui-text-muted);
}

.craft-card__details dd {
  margin: 0;
}
</style>
