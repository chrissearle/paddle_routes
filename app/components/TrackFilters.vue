<script setup lang="ts">
import type { Ref } from 'vue'
import type { Craft } from '#shared/types/track'

const props = defineProps<{
  craft: Craft[]
  regionOptions: { id: string; name: string }[]
  areaOptions: string[]
  dateOptions: string[]
}>()

const selectedCraftId = defineModel<string>('craftId', { required: true })
const selectedRegionId = defineModel<string>('regionId', { required: true })
const selectedArea = defineModel<string>('area', { required: true })
const selectedDate = defineModel<string>('date', { required: true })

const ALL = '__all__'

const craftItems = computed(() => [
  { label: 'All craft', value: ALL },
  ...props.craft.map((c) => ({ label: c.name, value: c.id })),
])
const regionItems = computed(() => [
  { label: 'All regions', value: ALL },
  ...props.regionOptions.map((r) => ({ label: r.name, value: r.id })),
])
const areaItems = computed(() => [
  { label: 'All areas', value: ALL },
  ...props.areaOptions.map((a) => ({ label: a, value: a })),
])
const dateItems = computed(() => [
  { label: 'All dates', value: ALL },
  ...props.dateOptions.map((d) => ({ label: d, value: d })),
])

function bind(model: Ref<string>) {
  return computed({
    get: () => model.value || ALL,
    set: (v: string) => (model.value = v === ALL ? '' : v),
  })
}

const craftModel = bind(selectedCraftId)
const regionModel = bind(selectedRegionId)
const areaModel = bind(selectedArea)
const dateModel = bind(selectedDate)
</script>

<template>
  <div class="track-filters">
    <USelect v-model="craftModel" :items="craftItems" icon="i-lucide-ship" size="sm" />
    <USelect v-model="regionModel" :items="regionItems" icon="i-lucide-map" size="sm" />
    <USelect v-model="areaModel" :items="areaItems" icon="i-lucide-map-pin" size="sm" />
    <USelect v-model="dateModel" :items="dateItems" icon="i-lucide-calendar" size="sm" />
  </div>
</template>

<style scoped>
.track-filters {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  padding: 0.75rem 1.25rem;
}
</style>
