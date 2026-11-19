<script setup lang="ts">
import { catalogById } from '#shared/catalog/items'
import type { Avatar } from '#shared/avatar/schema'
import type { SceneData } from '#shared/types/scene'
import type { Engine, EngineOptions } from '~/engine'

/**
 * Pont Vue ↔ moteur. Ne contient aucune logique 3D : il instancie l'Engine côté client,
 * lui transmet la scène et les options, et relaie ses événements.
 */
const props = withDefaults(
  defineProps<{
    scene: SceneData
    selectedId?: string | null
    options?: Partial<EngineOptions>
    label?: string
    /** Avatar de l'auteur, affiché dans la pièce ; null = aucun. */
    avatar?: Avatar | null
  }>(),
  { selectedId: null, options: () => ({}), label: 'Scène 3D isométrique du setup', avatar: null },
)

const emit = defineEmits<{
  ready: []
  select: [id: string | null]
  objectClick: [id: string]
  transformEnd: [payload: { id: string; position: [number, number, number]; rotation: number }]
}>()

const container = ref<HTMLDivElement | null>(null)
const engine = shallowRef<Engine | null>(null)
const loading = ref(true)
const failed = ref(false)

const clone = (scene: SceneData): SceneData => JSON.parse(JSON.stringify(scene))
const { assetsBaseUrl } = useRuntimeConfig().public

onMounted(async () => {
  if (!container.value) return
  try {
    const { Engine } = await import('~/engine')
    if (!container.value) return
    const instance = new Engine(container.value, catalogById, { assetBaseUrl: assetsBaseUrl, ...props.options })
    instance.events.on('select', (id) => emit('select', id))
    instance.events.on('objectclick', (id) => emit('objectClick', id))
    instance.events.on('transformend', (payload) => emit('transformEnd', payload))
    engine.value = instance
    await instance.load(clone(props.scene))
    instance.setAvatar(props.avatar ? JSON.parse(JSON.stringify(props.avatar)) : null)
    // La scène a pu changer pendant le chargement : on rattrape (diff peu coûteux).
    await instance.sync(clone(props.scene))
    instance.select(props.selectedId ?? null)
    loading.value = false
    emit('ready')
  } catch (error) {
    console.error('[SceneCanvas] Impossible de démarrer le rendu 3D', error)
    failed.value = true
    loading.value = false
  }
})

watch(
  () => props.scene,
  (scene) => {
    if (engine.value && !loading.value) engine.value.sync(clone(scene))
  },
  { deep: true },
)
watch(
  () => props.avatar,
  (avatar) => {
    if (engine.value && !loading.value) engine.value.setAvatar(avatar ? JSON.parse(JSON.stringify(avatar)) : null)
  },
  { deep: true },
)
watch(
  () => props.selectedId,
  (id) => engine.value?.select(id ?? null),
)
watch(
  () => props.options,
  (options) => engine.value?.setOptions({ ...options }),
  { deep: true },
)

onBeforeUnmount(() => {
  engine.value?.dispose()
  engine.value = null
})

defineExpose({
  rotateCamera: (deg: number) => engine.value?.rotateCamera(deg),
  zoomBy: (factor: number) => engine.value?.zoomBy(factor),
  resetCamera: () => engine.value?.resetCamera(),
  getCameraState: () => engine.value?.getCameraState(),
  getDropPlacement: (x: number, y: number, catalogId: string) => engine.value?.getDropPlacement(x, y, catalogId) ?? null,
  screenshot: () => engine.value?.screenshot(),
  /** Ancre écran (haut-centre) d'un objet, en px relatifs au canvas ; null si absent. */
  getObjectAnchor: (id: string) => (engine.value && !loading.value ? engine.value.getObjectAnchor(id) : null),
  /** Aperçu PNG à taille fixe ; null tant que le moteur n'est pas prêt. */
  capture: (size?: { width?: number; height?: number }) => (engine.value && !loading.value ? engine.value.capture(size) : null),
})
</script>

<template>
  <div class="relative h-full w-full" role="img" :aria-label="label">
    <div ref="container" class="absolute inset-0" />
    <div v-if="loading" class="pointer-events-none absolute inset-0 grid place-items-center">
      <slot name="loading" />
    </div>
    <div v-if="failed" class="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted">
      <slot name="error">
        Le rendu 3D n’a pas pu démarrer. Vérifie que WebGL est activé dans ton navigateur.
      </slot>
    </div>
  </div>
</template>
