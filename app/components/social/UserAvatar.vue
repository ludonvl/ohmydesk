<script setup lang="ts">
/** Avatar d'un membre : photo (Google) si disponible, sinon initiales sur une couleur stable dérivée du nom. */
const props = withDefaults(defineProps<{ name: string; image?: string | null; size?: number }>(), { image: null, size: 40 })

const PALETTE = ['#7E9C8F', '#8A7BD8', '#D9825B', '#5A8DB8', '#B7739C', '#6F9A5B']
const initials = computed(() =>
  props.name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?',
)
const color = computed(() => {
  let hash = 0
  for (const c of props.name) hash = (hash * 31 + c.charCodeAt(0)) >>> 0
  return PALETTE[hash % PALETTE.length]
})
</script>

<template>
  <span
    class="grid shrink-0 place-items-center overflow-hidden rounded-full font-display font-bold text-white"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.36)}px`, background: color }"
    aria-hidden="true"
  >
    <img v-if="image" :src="image" alt="" referrerpolicy="no-referrer" class="size-full object-cover">
    <template v-else>{{ initials }}</template>
  </span>
</template>
