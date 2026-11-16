<script setup lang="ts">
// Layout minimal pour /embed/:slug : pas de header, pas de footer, fond transparent possible.
useHead({
  htmlAttrs: { class: 'omd-embed' },
  style: [{ innerHTML: 'html.omd-embed, html.omd-embed body { background: transparent; margin: 0; height: 100%; overflow: hidden; }' }],
})
</script>

<template>
  <div class="h-dvh w-full">
    <slot />
  </div>
</template>
