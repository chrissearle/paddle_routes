<script setup lang="ts">
import type { Craft, TrackSummary } from '#shared/types/track'

const props = defineProps<{
  tracks: TrackSummary[]
  craft: Craft[]
  soloId: string
  isVisible: (id: string) => boolean
  toggleVisible: (id: string) => void
  toggleSolo: (id: string) => void
  copyTrackLink: (id: string) => void
}>()

const sortedTracks = computed(() =>
  [...props.tracks].sort((a, b) => b.date.localeCompare(a.date)),
)

const craftById = computed(() => new Map(props.craft.map((c) => [c.id, c])))
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
          <p class="route-card__date font-mono text-secondary">{{ track.date }}</p>
          <UPopover v-if="craftById.get(track.craftId)" mode="click">
            <button type="button" class="route-card__craft route-card__craft--link">
              {{ track.craftName }}
            </button>
            <template #content>
              <div class="craft-popover font-mono">
                <p class="craft-popover__name">{{ craftById.get(track.craftId)!.name }}</p>
                <dl class="craft-popover__details">
                  <dt>Type</dt>
                  <dd>{{ craftById.get(track.craftId)!.type }}</dd>
                  <dt>Make</dt>
                  <dd>{{ craftById.get(track.craftId)!.make }}</dd>
                  <template v-if="craftById.get(track.craftId)!.model">
                    <dt>Model</dt>
                    <dd>{{ craftById.get(track.craftId)!.model }}</dd>
                  </template>
                  <dt>Colour</dt>
                  <dd>{{ craftById.get(track.craftId)!.colour }}</dd>
                  <template v-if="craftById.get(track.craftId)!.registration">
                    <dt>Reg.</dt>
                    <dd>{{ craftById.get(track.craftId)!.registration }}</dd>
                  </template>
                </dl>
              </div>
            </template>
          </UPopover>
          <p v-else class="route-card__craft">{{ track.craftName }}</p>
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
          <div class="route-card__actions-row">
            <UButton
              :label="soloId === track.id ? 'Unsolo' : 'Solo'"
              size="xs"
              :color="soloId === track.id ? 'secondary' : 'neutral'"
              :variant="soloId === track.id ? 'solid' : 'outline'"
              @click="toggleSolo(track.id)"
            />
            <UButton
              icon="i-lucide-link"
              size="xs"
              color="neutral"
              variant="ghost"
              aria-label="Copy permalink to this route"
              @click="copyTrackLink(track.id)"
            />
          </div>
        </div>
      </div>
    </UCard>
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

button.route-card__craft--link {
  display: inline-block;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  cursor: pointer;
  text-align: left;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 0.15rem;
  color: var(--ui-primary);
}

button.route-card__craft--link:hover,
button.route-card__craft--link:focus-visible {
  color: var(--ui-text-highlighted);
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

.route-card__actions-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.craft-popover {
  padding: 0.75rem 1rem;
  min-width: 12rem;
}

.craft-popover__name {
  margin: 0 0 0.4rem;
  font-weight: 600;
}

.craft-popover__details {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.15rem 0.75rem;
  margin: 0;
  font-size: 0.8rem;
}

.craft-popover__details dt {
  color: var(--ui-text-muted);
}

.craft-popover__details dd {
  margin: 0;
}
</style>
