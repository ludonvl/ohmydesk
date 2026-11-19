<script setup lang="ts">
import { BrickWall, Grid3x3, LoaderCircle } from 'lucide-vue-next'
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
  capture: () => Promise<Blob> | null
}

const route = useRoute()
const editor = useEditorStore()
const setupId = computed(() => String(route.params.id))

const { data, error, status } = await useFetch<SetupWithScene>(() => `/api/setups/${setupId.value}`)
watch(data, (setup) => setup && editor.load(setup), { immediate: true })

useHead({ title: () => `${editor.name} · Éditeur · Oh My Desk` })

const canvas = ref<CanvasApi | null>(null)
const preview = ref(false)
const dragOver = ref(false)

const engineOptions = computed<Partial<EngineOptions>>(() => ({
  mode: preview.value ? 'viewer' : 'editor',
  grid: !preview.value && editor.showGrid,
  controls: true,
  zoom: true,
}))

let cameraSaveTimer: ReturnType<typeof setTimeout> | null = null
function persistCameraSoon() {
  if (cameraSaveTimer) clearTimeout(cameraSaveTimer)
  cameraSaveTimer = setTimeout(() => {
    const state = canvas.value?.getCameraState()
    if (state) editor.setCamera(state.azimuth, state.zoom)
  }, 800)
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
  if (target && (target.closest('input, textarea, select, [contenteditable="true"]'))) return
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
  if (key === 'escape') editor.selectedId = null
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

onMounted(() => window.addEventListener('keydown', onKeydown))
function onCanvasReady() {
  editor.setPreviewCapture(() => canvas.value?.capture() ?? null)
}

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  // La page est démontée avant le canvas : le moteur peut encore faire la capture.
  // Une modification non encore sauvegardée : on sauvegarde et on capture l'aperçu maintenant.
  const unsaved = editor.saveStatus === 'saving'
  if (unsaved) editor.save()
  editor.flushPreview(unsaved)
  editor.setPreviewCapture(null)
})
</script>

<template>
  <div class="flex h-dvh min-h-[640px] flex-col bg-chrome font-sans text-sm text-chrome-text">
    <EditorHeader :preview="preview" @toggle-preview="preview = !preview" />

    <div v-if="error" class="grid flex-1 place-items-center p-8 text-center">
      <div class="flex max-w-sm flex-col items-center gap-3">
        <h1 class="font-display text-2xl font-bold">Setup introuvable</h1>
        <p class="text-chrome-muted">Ce setup n’existe pas ou n’est plus accessible.</p>
        <NuxtLink to="/editor/new" class="font-semibold text-tangerine underline">Créer un nouveau setup</NuxtLink>
      </div>
    </div>

    <div v-else-if="status === 'pending' || !editor.setupId" class="grid flex-1 place-items-center text-chrome-muted">
      <LoaderCircle class="size-6 animate-spin" aria-label="Chargement du setup" />
    </div>

    <div v-else class="flex min-h-0 flex-1 flex-col md:flex-row">
      <CatalogPanel v-if="!preview" class="max-h-[40vh] md:max-h-none" />

      <main
        class="relative flex min-h-[420px] min-w-0 flex-1 flex-col text-ink canvas-dots"
        :class="dragOver ? 'ring-2 ring-tangerine ring-inset' : ''"
        @dragover="onDragOver"
        @dragleave="dragOver = false"
        @drop="onDrop"
      >
        <SceneCanvas
          ref="canvas"
          :scene="editor.scene"
          :selected-id="editor.selectedId"
          :options="engineOptions"
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

        <div v-if="!preview" class="pointer-events-none absolute inset-x-4 top-4 flex flex-wrap justify-end gap-2">
          <button
            class="pointer-events-auto flex h-10 items-center gap-2 rounded-xl border border-[#e2ddee] px-3.5 text-[13px] font-medium"
            :class="editor.scene.room.walls ? 'bg-white' : 'bg-[#e6e1f1]'"
            :aria-pressed="editor.scene.room.walls"
            @click="editor.setRoom({ walls: !editor.scene.room.walls })"
          >
            <BrickWall class="size-4" />Murs
          </button>
          <button
            class="pointer-events-auto flex h-10 items-center gap-2 rounded-xl border border-[#e2ddee] px-3.5 text-[13px] font-medium"
            :class="editor.showGrid ? 'bg-white' : 'bg-[#e6e1f1]'"
            :aria-pressed="editor.showGrid"
            @click="editor.showGrid = !editor.showGrid"
          >
            <Grid3x3 class="size-4" />Grille
          </button>
        </div>

        <div v-if="!preview && editor.scene.objects.length === 0" class="pointer-events-none absolute inset-x-0 top-20 flex justify-center">
          <p class="rounded-xl bg-white/90 px-4 py-2.5 text-[13px] font-medium text-subtle shadow-sm">
            Glisse un objet du catalogue dans la pièce pour commencer.
          </p>
        </div>

        <div class="absolute bottom-4 left-1/2 -translate-x-1/2">
          <SceneToolbar
            :has-selection="!!editor.selectedId && !preview"
            @rotate-object="editor.selectedId && editor.rotateObject(editor.selectedId, 90)"
            @duplicate="editor.selectedId && editor.duplicateObject(editor.selectedId)"
            @remove="editor.selectedId && editor.removeObject(editor.selectedId)"
            @zoom-in="zoom(1.2)"
            @zoom-out="zoom(1 / 1.2)"
            @reset="resetCamera"
            @rotate-camera="rotateCamera"
          />
        </div>

        <div v-if="!preview" class="pointer-events-none absolute bottom-6 left-4 hidden flex-wrap gap-2.5 text-xs text-subtle xl:flex">
          <span><kbd class="rounded-[5px] border border-[#dcd6ea] bg-white px-1.5 py-0.5 text-[11px] font-semibold">R</kbd> pivoter</span>
          <span><kbd class="rounded-[5px] border border-[#dcd6ea] bg-white px-1.5 py-0.5 text-[11px] font-semibold">D</kbd> dupliquer</span>
          <span><kbd class="rounded-[5px] border border-[#dcd6ea] bg-white px-1.5 py-0.5 text-[11px] font-semibold">Alt</kbd> sans aimant</span>
        </div>
      </main>

      <InspectorPanel v-if="!preview" class="max-h-[50vh] md:max-h-none" />
    </div>
  </div>
</template>
