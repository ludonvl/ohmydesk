<script setup lang="ts">
import type { CatalogItem } from '#shared/catalog/types'
import { catalogItemToIso } from '#shared/iso'

const props = defineProps<{ item: CatalogItem; colors?: Record<string, string> }>()
const drawing = computed(() => catalogItemToIso(props.item, props.colors))
</script>

<template>
  <img v-if="item.thumbnailUrl" :src="item.thumbnailUrl" alt="" class="h-full w-full object-contain">
  <svg v-else :viewBox="drawing.viewBox" class="block h-full w-full" aria-hidden="true">
    <polygon
      v-for="(p, i) in drawing.polygons"
      :key="i"
      :points="p.points"
      :fill="p.fill"
      :stroke="p.fill"
      stroke-width="0.5"
      stroke-linejoin="round"
    />
  </svg>
</template>
