<script setup lang="ts">
import type { Avatar } from '#shared/avatar/schema'
import type { AvatarStage } from '~/engine'

/** Pont Vue ↔ AvatarStage : figurine animée qu'on fait tourner au glisser et saluer d'un clic. */
const props = defineProps<{ avatar: Avatar; label?: string }>()

const container = ref<HTMLDivElement | null>(null)
const stage = shallowRef<AvatarStage | null>(null)
const failed = ref(false)

const clone = (a: Avatar): Avatar => JSON.parse(JSON.stringify(a))

onMounted(async () => {
  if (!container.value) return
  try {
    const { AvatarStage } = await import('~/engine')
    if (!container.value) return
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    stage.value = new AvatarStage(container.value, clone(props.avatar), { reducedMotion })
  } catch (error) {
    console.error('[AvatarPreview] Impossible de démarrer le rendu 3D', error)
    failed.value = true
  }
})

watch(
  () => props.avatar,
  (avatar) => stage.value?.setAvatar(clone(avatar)),
  { deep: true },
)

onBeforeUnmount(() => {
  stage.value?.dispose()
  stage.value = null
})

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft') stage.value?.rotateBy(-0.4)
  else if (e.key === 'ArrowRight') stage.value?.rotateBy(0.4)
  else if (e.key === 'Enter' || e.key === ' ') stage.value?.wave()
  else return
  e.preventDefault()
}

defineExpose({ wave: () => stage.value?.wave() })
</script>

<template>
  <div
    ref="container"
    class="relative h-full w-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
    role="img"
    tabindex="0"
    :aria-label="label ?? 'Aperçu 3D de ton avatar. Flèches gauche et droite pour le tourner, Entrée pour qu’il te salue.'"
    @keydown="onKey"
  >
    <p v-if="failed" class="absolute inset-0 grid place-items-center p-4 text-center text-sm text-muted">
      L’aperçu 3D n’est pas disponible sur ce navigateur.
    </p>
  </div>
</template>
