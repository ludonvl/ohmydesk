import { defineStore } from 'pinia'
import { getCatalogItem } from '#shared/catalog/items'
import type { Finish, Room, SceneData, SceneObject, SetupWithScene } from '#shared/types/scene'
import { createEmptyScene } from '#shared/utils/defaultScene'
import { createId } from '#shared/utils/ids'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const HISTORY_LIMIT = 100
const AUTOSAVE_DELAY = 1200
/** L'aperçu PNG est régénéré quand l'édition se calme, pas à chaque sauvegarde. */
const PREVIEW_DELAY = 5000

type PreviewCapture = () => Promise<Blob> | null

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const normalizeAngle = (deg: number) => ((Math.round(deg) % 360) + 360) % 360

/**
 * État de l'éditeur. La scène (SceneData) est la source de vérité ;
 * le moteur 3D ne fait que la refléter via <SceneCanvas>.
 */
export const useEditorStore = defineStore('editor', () => {
  const setupId = ref<string | null>(null)
  const name = ref('Mon setup')
  const slug = ref('')
  const description = ref('')
  const isPublic = ref(false)
  const scene = ref<SceneData>(createEmptyScene())
  const selectedId = ref<string | null>(null)
  const saveStatus = ref<SaveStatus>('idle')
  const showGrid = ref(true)
  const previewUrl = ref<string | null>(null)

  const past = shallowRef<SceneData[]>([])
  const future = shallowRef<SceneData[]>([])
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let pendingMeta = false
  let previewTimer: ReturnType<typeof setTimeout> | null = null
  let capturePreview: PreviewCapture | null = null

  const selected = computed<SceneObject | null>(() => scene.value.objects.find((o) => o.id === selectedId.value) ?? null)
  const selectedItem = computed(() => (selected.value ? getCatalogItem(selected.value.catalogId) ?? null : null))
  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)

  function load(setup: SetupWithScene) {
    setupId.value = setup.id
    name.value = setup.name
    slug.value = setup.slug
    description.value = setup.description
    isPublic.value = setup.isPublic
    previewUrl.value = setup.previewUrl
    scene.value = clone(setup.scene)
    selectedId.value = null
    past.value = []
    future.value = []
    saveStatus.value = 'saved'
  }

  /** Toute modification de la scène passe par ici : historique + sauvegarde automatique. */
  function commit(mutate: (draft: SceneData) => void) {
    const snapshot = clone(scene.value)
    mutate(scene.value)
    past.value = [...past.value.slice(-(HISTORY_LIMIT - 1)), snapshot]
    future.value = []
    scheduleSave()
  }

  function findObject(id: string) {
    return scene.value.objects.find((o) => o.id === id)
  }

  function addObject(catalogId: string, placement?: { position: [number, number, number]; rotation?: number }) {
    const item = getCatalogItem(catalogId)
    if (!item) return null
    const id = createId('o_')
    const room = scene.value.room
    const fallback: [number, number, number] =
      item.placement === 'wall' ? [0, Math.min(1.5, room.height - 0.3), -room.depth / 2] : [0, 0, 0]
    commit((s) => {
      s.objects.push({
        id,
        catalogId,
        position: placement?.position ?? fallback,
        rotation: placement?.rotation ?? 0,
        scale: 1,
        colors: {},
        finish: 'satin',
      })
    })
    selectedId.value = id
    return id
  }

  function updateObject(id: string, patch: Partial<Omit<SceneObject, 'id' | 'catalogId'>>) {
    if (!findObject(id)) return
    commit((s) => {
      const obj = s.objects.find((o) => o.id === id)
      if (obj) Object.assign(obj, clone(patch))
    })
  }

  function setPosition(id: string, position: [number, number, number], rotation?: number) {
    updateObject(id, rotation === undefined ? { position } : { position, rotation: normalizeAngle(rotation) })
  }

  function rotateObject(id: string, delta: number) {
    const obj = findObject(id)
    if (obj) updateObject(id, { rotation: normalizeAngle(obj.rotation + delta) })
  }

  function setColor(id: string, slot: string, color: string) {
    const obj = findObject(id)
    if (obj && obj.colors[slot] !== color) updateObject(id, { colors: { ...obj.colors, [slot]: color } })
  }

  function setFinish(id: string, finish: Finish) {
    updateObject(id, { finish })
  }

  function removeObject(id: string) {
    if (!findObject(id)) return
    commit((s) => {
      s.objects = s.objects.filter((o) => o.id !== id)
    })
    if (selectedId.value === id) selectedId.value = null
  }

  function duplicateObject(id: string) {
    const obj = findObject(id)
    if (!obj) return null
    const copy: SceneObject = { ...clone(obj), id: createId('o_') }
    const item = getCatalogItem(obj.catalogId)
    if (item?.placement === 'wall') copy.position = [copy.position[0] + 0.2, copy.position[1], copy.position[2]]
    else copy.position = [copy.position[0] + 0.15, copy.position[1], copy.position[2] + 0.15]
    commit((s) => {
      s.objects.push(copy)
    })
    selectedId.value = copy.id
    return copy.id
  }

  function setRoom(patch: Partial<Room>) {
    commit((s) => {
      s.room = { ...s.room, ...patch }
    })
  }

  function setCamera(azimuth: number, zoom: number) {
    // La vue n'entre pas dans l'historique : c'est un réglage de présentation.
    scene.value.camera = { azimuth, zoom }
    scheduleSave()
  }

  function undo() {
    const previous = past.value.at(-1)
    if (!previous) return
    future.value = [clone(scene.value), ...future.value]
    past.value = past.value.slice(0, -1)
    scene.value = previous
    if (selectedId.value && !findObject(selectedId.value)) selectedId.value = null
    scheduleSave()
  }

  function redo() {
    const next = future.value[0]
    if (!next) return
    past.value = [...past.value, clone(scene.value)]
    future.value = future.value.slice(1)
    scene.value = next
    if (selectedId.value && !findObject(selectedId.value)) selectedId.value = null
    scheduleSave()
  }

  function setMeta(patch: { name?: string; description?: string; isPublic?: boolean }) {
    if (patch.name !== undefined) name.value = patch.name
    if (patch.description !== undefined) description.value = patch.description
    if (patch.isPublic !== undefined) isPublic.value = patch.isPublic
    pendingMeta = true
    scheduleSave()
  }

  function scheduleSave() {
    if (!setupId.value) return
    saveStatus.value = 'saving'
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(save, AUTOSAVE_DELAY)
  }

  async function save() {
    if (!setupId.value) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = null
    saveStatus.value = 'saving'
    try {
      const body: Record<string, unknown> = { scene: scene.value }
      if (pendingMeta) Object.assign(body, { name: name.value.trim() || 'Mon setup', description: description.value, isPublic: isPublic.value })
      const result = await $fetch<SetupWithScene>(`/api/setups/${setupId.value}`, { method: 'PUT', body })
      pendingMeta = false
      slug.value = result.slug
      saveStatus.value = 'saved'
      schedulePreview()
    } catch (error) {
      console.error('[editor] Échec de la sauvegarde', error)
      saveStatus.value = 'error'
    }
  }

  /**
   * Branche la capture du moteur 3D (fournie par la page de l'éditeur une fois la scène affichée).
   * Un setup sans aperçu (créé avant l'étape 3, ou remixé) en reçoit un tout de suite.
   */
  function setPreviewCapture(capture: PreviewCapture | null) {
    capturePreview = capture
    if (capture && !previewUrl.value) schedulePreview(800)
  }

  function schedulePreview(delay = PREVIEW_DELAY) {
    if (!setupId.value || !capturePreview) return
    if (previewTimer) clearTimeout(previewTimer)
    previewTimer = setTimeout(uploadPreview, delay)
  }

  async function uploadPreview() {
    if (previewTimer) clearTimeout(previewTimer)
    previewTimer = null
    const id = setupId.value
    const pending = capturePreview?.()
    if (!id || !pending) return
    try {
      const png = await pending
      const result = await $fetch<{ previewUrl: string }>(`/api/setups/${id}/preview`, {
        method: 'PUT',
        body: png,
        headers: { 'Content-Type': 'image/png' },
      })
      if (setupId.value === id) previewUrl.value = result.previewUrl
    } catch (error) {
      // Non bloquant : l'aperçu SVG reste affiché tant qu'aucun PNG n'existe, et le prochain changement réessaiera.
      console.warn('[editor] Échec de l’envoi de l’aperçu', error)
    }
  }

  /** À appeler avant de quitter l'éditeur : envoie l'aperçu en attente pendant que le moteur existe encore. */
  function flushPreview(force = false) {
    if (previewTimer || force) void uploadPreview()
  }

  return {
    setupId, name, slug, description, isPublic, scene, selectedId, saveStatus, showGrid, previewUrl,
    selected, selectedItem, canUndo, canRedo,
    load, addObject, updateObject, setPosition, rotateObject, setColor, setFinish, removeObject,
    duplicateObject, setRoom, setCamera, undo, redo, setMeta, save, setPreviewCapture, flushPreview,
  }
})
