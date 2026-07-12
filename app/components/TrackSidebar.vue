<script setup lang="ts">
import type { Craft, TrackSummary } from '#shared/types/track'

defineProps<{
  tracks: TrackSummary[]
  craft: Craft[]
  soloId: string
  isVisible: (id: string) => boolean
  toggleVisible: (id: string) => void
  toggleSolo: (id: string) => void
}>()

const open = defineModel<boolean>('open', { required: true })

const isWide = useIsWide()
</script>

<template>
  <USlideover v-if="!isWide" v-model:open="open" title="Routes" side="right" :overlay="false">
    <template #body>
      <TrackSidebarContent
        :tracks="tracks"
        :craft="craft"
        :solo-id="soloId"
        :is-visible="isVisible"
        :toggle-visible="toggleVisible"
        :toggle-solo="toggleSolo"
      />
    </template>
  </USlideover>

  <aside v-else class="sidebar-panel">
    <TrackSidebarContent
      :tracks="tracks"
      :craft="craft"
      :solo-id="soloId"
      :is-visible="isVisible"
      :toggle-visible="toggleVisible"
      :toggle-solo="toggleSolo"
    />
  </aside>
</template>

<style scoped>
.sidebar-panel {
  width: 320px;
  flex: 0 0 320px;
  overflow-y: auto;
  padding: 1rem;
  border-left: 1px solid var(--ui-border);
}
</style>
