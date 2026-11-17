<script setup lang="ts">
/** Message de résultat d'un formulaire : succès, information ou erreur. */
withDefaults(defineProps<{ kind?: 'success' | 'info' | 'error' }>(), { kind: 'info' })
</script>

<template>
  <div
    :role="kind === 'error' ? 'alert' : 'status'"
    class="rounded-xl px-4 py-3 text-sm leading-relaxed"
    :class="{
      'bg-[#d2f5e8] text-[#155c44]': kind === 'success',
      'bg-lilac text-subtle': kind === 'info',
      'bg-[#fdecea] text-[#8f2a17]': kind === 'error',
    }"
  >
    <slot />
  </div>
</template>
