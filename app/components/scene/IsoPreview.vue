<script setup lang="ts">
import { catalogById } from '#shared/catalog/items'
import { sceneToIso } from '#shared/iso'
import type { SceneData } from '#shared/types/scene'

/** Aperçu SVG de la scène, rendu côté serveur : placeholder instantané avant le WebGL, cartes, vignettes. */
const props = defineProps<{ scene: SceneData; label?: string }>()
const drawing = computed(() => sceneToIso(props.scene, catalogById))
</script>

<template>
  <svg
    :viewBox="drawing.viewBox"
    class="block h-full w-full"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    :aria-label="label ?? 'Aperçu isométrique du setup'"
  >
    <polygon
      v-for="(p, i) in drawing.polygons"
      :key="i"
      :points="p.points"
      :fill="p.fill"
      :stroke="p.fill"
      stroke-width="0.6"
      stroke-linejoin="round"
    />
  </svg>
</template>
