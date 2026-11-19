<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next'
import type { MissingPreview } from '#shared/types/moderation'
import { Button } from '~/components/ui/button'

/**
 * Génère, dans ce navigateur, les aperçus PNG des setups publics qui n'en ont pas (démos, anciens setups) :
 * chaque scène est rendue hors écran à 1200 × 900 par le moteur 3D, puis envoyée au serveur.
 */
const props = defineProps<{ items: MissingPreview[] }>()
const emit = defineEmits<{ done: [] }>()

interface CanvasApi {
  capture: () => Promise<Blob> | null
}

const running = ref(false)
const index = ref(0)
const failures = ref<string[]>([])
const canvas = ref<CanvasApi | null>(null)
const current = computed(() => (running.value ? props.items[index.value] : undefined))

function start() {
  failures.value = []
  index.value = 0
  running.value = props.items.length > 0
}

async function onReady() {
  const item = current.value
  if (!item) return
  try {
    // Laisse au moteur une image pour finir d'appliquer matériaux et ombres.
    await new Promise((r) => requestAnimationFrame(() => r(null)))
    const png = await canvas.value?.capture()
    if (!png) throw new Error('Capture impossible')
    await $fetch(`/api/admin/setups/${item.id}/preview`, { method: 'PUT', body: png, headers: { 'Content-Type': 'image/png' } })
  } catch (error) {
    console.error('[admin] Aperçu non généré', item.id, error)
    failures.value.push(item.name)
  }
  if (index.value + 1 < props.items.length) index.value++
  else {
    running.value = false
    emit('done')
  }
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <Button variant="outline" size="sm" :disabled="running || items.length === 0" :aria-busy="running" @click="start">
        <LoaderCircle v-if="running" class="size-4 animate-spin" aria-hidden="true" />
        {{ running ? `Génération ${index + 1} / ${items.length}…` : `Générer ${items.length} aperçu${items.length > 1 ? 's' : ''}` }}
      </Button>
      <span v-if="!running && items.length === 0" class="text-sm text-muted">Tous les setups publics ont un aperçu.</span>
    </div>
    <p v-if="failures.length" role="alert" class="text-sm text-[#b3361f]">Échec pour : {{ failures.join(', ') }}. Réessaie, ou ouvre ces setups pour voir l’erreur.</p>
    <!-- Rendu hors écran, à la taille exacte de l'aperçu. -->
    <div v-if="current" class="pointer-events-none fixed top-0 -left-[2000px] h-[900px] w-[1200px]" aria-hidden="true">
      <ClientOnly>
        <SceneCanvas :key="current.id" ref="canvas" :scene="current.scene" :options="{ mode: 'viewer', controls: false, zoom: false }" @ready="onReady" />
      </ClientOnly>
    </div>
  </div>
</template>
