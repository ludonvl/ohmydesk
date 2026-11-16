<script setup lang="ts">
withDefaults(defineProps<{ size?: number; dark?: boolean }>(), { size: 28, dark: false })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" aria-hidden="true">
    <polygon points="12,2 22,7.5 12,13 2,7.5" fill="#FF6B35" />
    <polygon points="2,7.5 12,13 12,23 2,17.5" fill="#A497FF" />
    <polygon points="12,13 22,7.5 22,17.5 12,23" :fill="dark ? '#ECEAF5' : '#16151F'" />
  </svg>
</template>
