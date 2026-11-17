<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next'
import type { SetupWithScene } from '#shared/types/scene'

/**
 * Crée un setup puis redirige vers l'éditeur.
 * ?template=studio|neon|scandi · ?from=<slug> pour remixer un setup public.
 */
definePageMeta({ layout: false, middleware: 'auth' })

const route = useRoute()
const failed = ref(false)

onMounted(async () => {
  try {
    const template = typeof route.query.template === 'string' ? route.query.template : undefined
    const fromSlug = typeof route.query.from === 'string' ? route.query.from : undefined
    const setup = await $fetch<SetupWithScene>('/api/setups', { method: 'POST', body: { template, fromSlug } })
    await navigateTo(`/editor/${setup.id}`, { replace: true })
  } catch (error) {
    console.error(error)
    failed.value = true
  }
})
</script>

<template>
  <div class="grid h-dvh place-items-center bg-chrome text-chrome-text">
    <div v-if="failed" class="flex flex-col items-center gap-3 text-center">
      <p class="font-display text-xl font-bold">Impossible de créer le setup</p>
      <NuxtLink to="/" class="text-sm font-semibold text-tangerine underline">Revenir à l’accueil</NuxtLink>
    </div>
    <div v-else class="flex items-center gap-3 text-chrome-muted">
      <LoaderCircle class="size-5 animate-spin" aria-hidden="true" />
      Préparation de ta pièce…
    </div>
  </div>
</template>
