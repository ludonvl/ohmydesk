<script setup lang="ts">
import type { SetupWithScene } from '#shared/types/scene'
import type { EmbedCommand } from '~/composables/useEmbedBridge'
import { useEmbedBridge } from '~/composables/useEmbedBridge'

/**
 * Viewer embarqué : /embed/:slug?transparent=true&autorotate=true&controls=false&zoom=true&angle=45&branding=false
 */
definePageMeta({ layout: 'embed' })

interface CanvasApi {
  rotateCamera: (deg: number) => void
  zoomBy: (factor: number) => void
  resetCamera: () => void
}

const route = useRoute()
const slug = computed(() => String(route.params.slug))

function flag(name: string, fallback: boolean): boolean {
  const raw = route.query[name]
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value === undefined || value === null) return fallback
  return value === '' || value === 'true' || value === '1'
}
function num(name: string): number | undefined {
  const raw = route.query[name]
  const value = Number(Array.isArray(raw) ? raw[0] : raw)
  return Number.isFinite(value) ? value : undefined
}

const params = {
  transparent: flag('transparent', false),
  autoRotate: flag('autorotate', false),
  controls: flag('controls', true),
  // Désactivé par défaut pour ne pas capturer le défilement de la page hôte.
  zoom: flag('zoom', false),
  branding: flag('branding', true),
  angle: num('angle'),
  speed: num('speed'),
}

const { data: setup, error } = await useFetch<SetupWithScene>(() => `/api/public/setups/${slug.value}`)

const scene = computed(() => {
  if (!setup.value) return null
  if (params.angle === undefined) return setup.value.scene
  return { ...setup.value.scene, camera: { ...setup.value.scene.camera, azimuth: params.angle } }
})

const autoRotate = ref(params.autoRotate)
const highlighted = ref<string | null>(null)
const canvas = ref<CanvasApi | null>(null)

const options = computed(() => ({
  mode: 'embed' as const,
  transparent: params.transparent,
  autoRotate: autoRotate.value,
  autoRotateSpeed: params.speed ?? 10,
  controls: params.controls,
  zoom: params.zoom,
}))

const { send } = useEmbedBridge((command: EmbedCommand) => {
  switch (command.type) {
    case 'setAutoRotate': autoRotate.value = command.value; break
    case 'rotateCamera': canvas.value?.rotateCamera(command.degrees); break
    case 'zoom': canvas.value?.zoomBy(command.factor); break
    case 'resetCamera': canvas.value?.resetCamera(); break
    case 'highlight': highlighted.value = command.objectId; break
  }
})

function onObjectClick(objectId: string) {
  const obj = setup.value?.scene.objects.find((o) => o.id === objectId)
  if (obj) send({ type: 'objectClick', objectId, catalogId: obj.catalogId })
}

useHead({ title: () => (setup.value ? `${setup.value.name} · Oh My Desk` : 'Oh My Desk'), meta: [{ name: 'robots', content: 'noindex' }] })
</script>

<template>
  <div class="relative h-full w-full" :class="params.transparent ? 'bg-transparent' : 'bg-lilac'">
    <template v-if="scene && setup">
      <ClientOnly>
        <SceneCanvas
          ref="canvas"
          :scene="scene"
          :selected-id="highlighted"
          :options="options"
          :label="`Setup ${setup.name} en 3D`"
          @ready="send({ type: 'ready', slug })"
          @object-click="onObjectClick"
        >
          <template #loading>
            <div class="h-[80%] w-[80%]"><IsoPreview :scene="scene" /></div>
          </template>
        </SceneCanvas>
        <template #fallback>
          <div class="absolute inset-0 grid place-items-center">
            <div class="h-[80%] w-[80%]"><IsoPreview :scene="scene" /></div>
          </div>
        </template>
      </ClientOnly>
      <a
        v-if="params.branding"
        :href="`/setup/${setup.slug}`"
        target="_blank"
        rel="noopener"
        class="absolute bottom-3 left-3 flex h-8 items-center gap-2 rounded-full border border-line bg-white/90 px-3 text-[12.5px] font-semibold text-ink backdrop-blur-sm hover:bg-white"
      >
        <AppLogo :size="14" />Voir sur Oh My Desk
      </a>
    </template>
    <div v-else-if="error" class="grid h-full place-items-center p-4 text-center text-sm text-muted">
      Ce setup n’est pas disponible.
    </div>
  </div>
</template>
