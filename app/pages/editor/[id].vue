<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next'
import { getCatalogItem } from '#shared/catalog/items'
import type { CategorySlug } from '#shared/catalog/types'
import type { SetupWithScene } from '#shared/types/scene'
import type { EngineOptions } from '~/engine'
import { CATALOG_DRAG_TYPE } from '~/lib/dnd'
import { useEditorStore } from '~/stores/editor'

definePageMeta({ layout: false, middleware: 'auth' })

interface CanvasApi {
  rotateCamera: (deg: number) => void
  zoomBy: (factor: number) => void
  resetCamera: () => void
  getCameraState: () => { azimuth: number; zoom: number } | undefined
  getDropPlacement: (x: number, y: number, catalogId: string) => { position: [number, number, number]; rotation?: number } | null
  getObjectAnchor: (id: string) => { x: number; y: number } | null
  screenshot: () => string | undefined
  capture: () => Promise<Blob> | null
}

/** Ce qu'affiche le panneau flottant de droite : une catégorie, la pièce, ou les réglages de l'objet sélectionné. */
type Panel = { kind: 'category'; slug: CategorySlug } | { kind: 'room' } | { kind: 'object' } | null

const route = useRoute()
const editor = useEditorStore()
const setupId = computed(() => String(route.params.id))

const { data, error, status } = await useFetch<SetupWithScene>(() => `/api/setups/${setupId.value}`)
watch(data, (setup) => setup && editor.load(setup), { immediate: true })

useHead({ title: () => `${editor.name} · Éditeur · Oh My Desk` })

const canvas = ref<CanvasApi | null>(null)
const preview = ref(false)
const dragOver = ref(false)
const mode = ref<'catalog' | 'scene'>('catalog')
const panel = ref<Panel>(null)
const zoomLabel = ref('100 %')

const SHORTCUTS = [
  { key: 'R', label: 'pivoter' },
  { key: 'D', label: 'dupliquer' },
  { key: 'Alt', label: 'sans aimant' },
] as const

// Hauteur réelle de la barre du haut (elle passe sur plusieurs lignes sur les écrans étroits) :
// la barre de catégories et le panneau de droite se placent juste en dessous.
const headerEl = ref<HTMLElement | null>(null)
const headerHeight = ref(48)
let headerObserver: ResizeObserver | null = null
watch(headerEl, (el) => {
  headerObserver?.disconnect()
  if (!el) return
  headerObserver = new ResizeObserver(() => (headerHeight.value = el.offsetHeight))
  headerObserver.observe(el)
})
const layoutVars = computed(() => ({
  '--rail-top': `${20 + headerHeight.value + 16}px`,
  '--panel-top': `${20 + headerHeight.value + 20}px`,
}))

const engineOptions = computed<Partial<EngineOptions>>(() => ({
  mode: preview.value ? 'viewer' : 'editor',
  grid: !preview.value && editor.showGrid,
  controls: true,
  zoom: true,
}))

const panelOpen = computed(() => !preview.value && panel.value !== null && (panel.value.kind !== 'object' || !!editor.selected))
const railActive = computed(() => (panel.value?.kind === 'category' ? panel.value.slug : panel.value?.kind === 'room' ? 'room' : null))

/** Nombre d'objets présents par catégorie, affiché sur la barre de catégories en mode Scène. */
const sceneCounts = computed(() => {
  if (mode.value !== 'scene') return undefined
  const counts: Partial<Record<CategorySlug, number>> = {}
  for (const obj of editor.scene.objects) {
    const category = getCatalogItem(obj.catalogId)?.category
    if (category) counts[category] = (counts[category] ?? 0) + 1
  }
  return counts
})

function toggleRail(target: CategorySlug | 'room') {
  if (target === 'room') panel.value = panel.value?.kind === 'room' ? null : { kind: 'room' }
  else panel.value = panel.value?.kind === 'category' && panel.value.slug === target ? null : { kind: 'category', slug: target }
}
function toggleSettings() {
  panel.value = panel.value?.kind === 'object' ? null : { kind: 'object' }
}
watch(
  () => editor.selectedId,
  (id) => {
    if (!id && panel.value?.kind === 'object') panel.value = null
  },
)

// Barre contextuelle : suit l'objet sélectionné à l'écran (caméra, déplacement, rotation).
const anchor = ref<{ x: number; y: number } | null>(null)
let rafId = 0
function trackAnchor() {
  const id = editor.selectedId
  const next = id && !preview.value && panel.value?.kind !== 'room' ? (canvas.value?.getObjectAnchor(id) ?? null) : null
  if (next?.x !== anchor.value?.x || next?.y !== anchor.value?.y) anchor.value = next
  rafId = requestAnimationFrame(trackAnchor)
}
const anchorStyle = computed(() =>
  anchor.value
    ? { left: `clamp(200px, ${Math.round(anchor.value.x)}px, calc(100% - ${panelOpen.value ? 592 : 200}px))`, top: `${Math.max(150, Math.round(anchor.value.y) - 12)}px` }
    : undefined,
)

let cameraSaveTimer: ReturnType<typeof setTimeout> | null = null
function persistCameraSoon() {
  if (cameraSaveTimer) clearTimeout(cameraSaveTimer)
  cameraSaveTimer = setTimeout(() => {
    const state = canvas.value?.getCameraState()
    if (!state) return
    editor.setCamera(state.azimuth, state.zoom)
    zoomLabel.value = `${Math.round(state.zoom * 100)} %`
  }, 400)
}

function rotateCamera() {
  canvas.value?.rotateCamera(90)
  persistCameraSoon()
}
function zoom(factor: number) {
  canvas.value?.zoomBy(factor)
  persistCameraSoon()
}
function resetCamera() {
  canvas.value?.resetCamera()
  persistCameraSoon()
}
function downloadCapture() {
  const url = canvas.value?.screenshot()
  if (!url) return
  const link = document.createElement('a')
  link.href = url
  link.download = `${editor.name || 'oh-my-desk'}.png`
  link.click()
}

function onDragOver(e: DragEvent) {
  if (!e.dataTransfer?.types.includes(CATALOG_DRAG_TYPE)) return
  e.preventDefault()
  e.dataTransfer.dropEffect = 'copy'
  dragOver.value = true
}
function onDrop(e: DragEvent) {
  dragOver.value = false
  const catalogId = e.dataTransfer?.getData(CATALOG_DRAG_TYPE)
  if (!catalogId) return
  e.preventDefault()
  const placement = canvas.value?.getDropPlacement(e.clientX, e.clientY, catalogId)
  editor.addObject(catalogId, placement ?? undefined)
}

function onTransformEnd(payload: { id: string; position: [number, number, number]; rotation: number }) {
  editor.setPosition(payload.id, payload.position, payload.rotation)
}

function onKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  if (target && target.closest('input, textarea, select, [contenteditable="true"]')) return
  const mod = e.metaKey || e.ctrlKey
  const key = e.key.toLowerCase()
  if (mod && key === 'z') {
    e.preventDefault()
    if (e.shiftKey) editor.redo()
    else editor.undo()
    return
  }
  if (mod && key === 'y') {
    e.preventDefault()
    editor.redo()
    return
  }
  if (mod && key === 's') {
    e.preventDefault()
    editor.save()
    return
  }
  const id = editor.selectedId
  if (key === 'escape') {
    if (id) editor.selectedId = null
    else panel.value = null
  }
  if (!id || preview.value) return
  if (key === 'r') editor.rotateObject(id, e.shiftKey ? -90 : 90)
  else if (key === 'd' || (mod && key === 'd')) {
    e.preventDefault()
    editor.duplicateObject(id)
  } else if (key === 'delete' || key === 'backspace') {
    e.preventDefault()
    editor.removeObject(id)
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  rafId = requestAnimationFrame(trackAnchor)
})
function onCanvasReady() {
  editor.setPreviewCapture(() => canvas.value?.capture() ?? null)
  const state = canvas.value?.getCameraState()
  if (state) zoomLabel.value = `${Math.round(state.zoom * 100)} %`
}

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  cancelAnimationFrame(rafId)
  headerObserver?.disconnect()
  // La page est démontée avant le canvas : le moteur peut encore faire la capture.
  // Une modification non encore sauvegardée : on sauvegarde et on capture l'aperçu maintenant.
  const unsaved = editor.saveStatus === 'saving'
  if (unsaved) editor.save()
  editor.flushPreview(unsaved)
  editor.setPreviewCapture(null)
})
</script>

<template>
  <div class="desk-stage relative h-dvh min-h-[640px] overflow-hidden font-sans text-sm text-desk-ink" :style="layoutVars">
    <div v-if="error" class="grid h-full place-items-center p-8 text-center">
      <div class="desk-float flex max-w-sm flex-col items-center gap-3 rounded-desk-2xl p-8">
        <h1 class="text-desk-panel-title">Setup introuvable</h1>
        <p class="text-desk-ink-soft">Ce setup n’existe pas ou n’est plus accessible.</p>
        <NuxtLink to="/editor/new" class="h-11 rounded-desk-pill bg-desk-active px-5 leading-[44px] font-semibold text-desk-on-active">Créer un nouveau setup</NuxtLink>
      </div>
    </div>

    <div v-else-if="status === 'pending' || !editor.setupId" class="grid h-full place-items-center text-desk-ink-muted">
      <LoaderCircle class="size-6 animate-spin" aria-label="Chargement du setup" />
    </div>

    <template v-else>
      <!-- La scène occupe tout l'écran, y compris sous le panneau de droite (qui flotte par-dessus). -->
      <main
        class="absolute inset-0"
        :class="dragOver ? 'ring-2 ring-desk-active ring-inset' : ''"
        @dragover="onDragOver"
        @dragleave="dragOver = false"
        @drop="onDrop"
      >
        <SceneCanvas
          ref="canvas"
          :scene="editor.scene"
          :selected-id="editor.selectedId"
          :options="engineOptions"
          :avatar="data?.authorAvatar ?? null"
          label="Scène 3D en cours d’édition"
          @select="editor.selectedId = $event"
          @transform-end="onTransformEnd"
          @ready="onCanvasReady"
        >
          <template #loading>
            <div class="h-[70%] w-[70%] opacity-60">
              <IsoPreview :scene="editor.scene" />
            </div>
          </template>
        </SceneCanvas>

        <!-- Barre contextuelle au-dessus de l'objet sélectionné -->
        <div v-if="anchorStyle" class="absolute z-10 -translate-x-1/2 -translate-y-full" :style="anchorStyle">
          <ContextToolbar :settings-open="panel?.kind === 'object'" @open-settings="toggleSettings" />
        </div>

        <!-- Aides -->
        <div v-if="!preview && editor.scene.objects.length === 0" class="pointer-events-none absolute inset-x-0 top-28 flex justify-center px-4">
          <p class="desk-float rounded-desk-pill px-4 py-2.5 text-desk-label text-desk-ink-soft">
            Ouvre une catégorie à gauche et glisse un objet dans la pièce pour commencer.
          </p>
        </div>
        <div
          v-else-if="!preview && !editor.selectedId && panel?.kind !== 'room'"
          class="pointer-events-none absolute inset-x-0 bottom-[88px] flex justify-center pl-[76px] transition-[padding] duration-200"
          :class="panelOpen ? 'md:pr-[392px]' : ''"
        >
          <p class="rounded-desk-pill bg-desk-ink/80 px-3.5 py-2 text-desk-label font-medium text-desk-on-active">Clique sur un objet pour le modifier</p>
        </div>

        <!-- Raccourcis clavier (grands écrans) -->
        <div
          v-if="!preview"
          class="pointer-events-none absolute bottom-[34px] left-desk-edge hidden items-center gap-3 text-desk-caption text-desk-ink-soft"
          :class="panelOpen ? '2xl:flex' : 'xl:flex'"
        >
          <span v-for="k in SHORTCUTS" :key="k.key" class="flex items-center gap-1.5">
            <kbd class="rounded-md bg-desk-surface px-1.5 py-0.5 font-sans text-desk-badge text-desk-ink shadow-desk-control">{{ k.key }}</kbd>
            {{ k.label }}
          </span>
        </div>

        <!-- Barre du bas, centrée sous la scène -->
        <div
          class="pointer-events-none absolute inset-x-0 bottom-desk-edge flex justify-center pl-[76px] transition-[padding] duration-200 [&>*]:pointer-events-auto"
          :class="panelOpen ? 'md:pr-[392px]' : ''"
        >
          <SceneToolbar
            :zoom-label="zoomLabel"
            :preview="preview"
            @rotate-camera="rotateCamera"
            @reset="resetCamera"
            @capture="downloadCapture"
            @zoom-in="zoom(1.2)"
            @zoom-out="zoom(1 / 1.2)"
            @toggle-preview="preview = !preview"
          />
        </div>
      </main>

      <!-- Barre du haut -->
      <div ref="headerEl" class="absolute inset-x-desk-edge top-desk-edge z-20">
        <EditorHeader v-model:mode="mode" :preview="preview" />
      </div>

      <!-- Barre de catégories + bouton maison -->
      <div v-if="!preview" class="absolute top-(--rail-top) bottom-[92px] left-desk-edge z-10 flex w-14 items-center justify-center [container-type:size]">
        <CategoryRail :active="railActive" :counts="sceneCounts" @toggle="toggleRail" />
      </div>

      <!-- Panneau flottant de droite -->
      <div
        v-if="panelOpen"
        class="absolute inset-x-3 bottom-3 z-10 h-[55vh] md:inset-x-auto md:top-(--panel-top) md:right-desk-edge md:bottom-desk-edge md:h-auto md:w-desk-panel"
      >
        <CatalogPanel
          v-if="panel?.kind === 'category'"
          :category="panel.slug"
          :mode="mode"
          @close="panel = null"
          @show-catalog="mode = 'catalog'"
        />
        <RoomPanel v-else-if="panel?.kind === 'room'" @close="panel = null" />
        <InspectorPanel v-else-if="panel?.kind === 'object'" @close="panel = null" />
      </div>
    </template>
  </div>
</template>
