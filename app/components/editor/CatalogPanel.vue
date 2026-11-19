<script setup lang="ts">
import { Crosshair, Plus, Search, X } from 'lucide-vue-next'
import { catalogItems, findFamilyVariant, getCatalogItem, getCategoryName, getFamily } from '#shared/catalog/items'
import type { CatalogItem, CategorySlug } from '#shared/catalog/types'
import { CATALOG_DRAG_TYPE } from '~/lib/dnd'
import { useEditorStore } from '~/stores/editor'

const props = defineProps<{ category: CategorySlug; mode: 'catalog' | 'scene' }>()
const emit = defineEmits<{ close: []; showCatalog: [] }>()

const editor = useEditorStore()
const query = ref('')
watch(() => props.category, () => (query.value = ''))

const categoryName = computed(() => getCategoryName(props.category))
const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const matches = (item: CatalogItem) => {
  const q = normalize(query.value.trim())
  return !q || [item.name, item.description, ...item.tags].some((t) => normalize(t).includes(q))
}

/** Mode Catalogue : tous les objets de la catégorie. */
/**
 * Une vignette par objet ; pour une famille, une vignette par valeur de son premier axe
 * (ex. un bureau par piètement), les autres axes se règlent dans l'inspecteur.
 */
const catalogList = computed(() => {
  const entries: { item: CatalogItem; variants: number }[] = []
  const groups = new Map<string, { familyId: string; options: Record<string, string>; members: CatalogItem[] }>()
  for (const item of catalogItems) {
    if (item.category !== props.category) continue
    const family = getFamily(item.family?.id)
    if (!family || !item.family) {
      if (matches(item)) entries.push({ item, variants: 1 })
      continue
    }
    const axis = family.axes[0]!.id
    const key = `${family.id}:${item.family.options[axis]}`
    let group = groups.get(key)
    if (!group) {
      group = { familyId: family.id, options: { ...family.defaults, [axis]: item.family.options[axis]! }, members: [] }
      groups.set(key, group)
      entries.push({ item, variants: 0 }) // garde la place du groupe ; remplacé par son représentant ci-dessous
    }
    group.members.push(item)
  }
  return entries.flatMap((entry) => {
    const { family } = entry.item
    if (!family) return [entry]
    const group = groups.get(`${family.id}:${family.options[getFamily(family.id)!.axes[0]!.id]}`)!
    if (!group.members.some(matches)) return []
    const item = findFamilyVariant(group.familyId, group.options) ?? group.members[0]!
    return [{ item, variants: group.members.length }]
  })
})

/** Mode Scène : objets présents dans la pièce, regroupés par modèle. */
const sceneList = computed(() => {
  const groups = new Map<string, { item: CatalogItem; ids: string[] }>()
  for (const obj of editor.scene.objects) {
    const item = getCatalogItem(obj.catalogId)
    if (!item || item.category !== props.category || !matches(item)) continue
    const group = groups.get(item.id) ?? { item, ids: [] }
    group.ids.push(obj.id)
    groups.set(item.id, group)
  }
  return [...groups.values()]
})

const count = computed(() => (props.mode === 'scene' ? sceneList.value.reduce((n, g) => n + g.ids.length, 0) : catalogList.value.length))
const subtitle = computed(() => (props.mode === 'scene' ? `${count.value} dans ta scène` : `${count.value} au catalogue`))

function onDragStart(e: DragEvent, item: CatalogItem) {
  if (!e.dataTransfer) return
  e.dataTransfer.setData(CATALOG_DRAG_TYPE, item.id)
  e.dataTransfer.effectAllowed = 'copy'
}

/** Sélectionne l'exemplaire suivant de ce modèle dans la scène (un clic de plus passe au suivant). */
function selectInScene(ids: string[]) {
  const current = editor.selectedId ? ids.indexOf(editor.selectedId) : -1
  editor.selectedId = ids[(current + 1) % ids.length] ?? null
}
</script>

<template>
  <section :aria-label="categoryName" class="desk-float flex h-full min-h-0 flex-col overflow-hidden rounded-desk-2xl">
    <div class="flex items-center justify-between py-4 pr-4 pl-6">
      <div class="flex flex-col gap-0.5">
        <h2 class="text-desk-panel-title text-desk-ink">{{ categoryName }}</h2>
        <span class="text-desk-caption text-desk-ink-muted">{{ subtitle }}</span>
      </div>
      <button
        type="button"
        class="grid size-desk-control-md shrink-0 place-items-center rounded-desk-pill bg-desk-surface-muted text-desk-ink"
        aria-label="Fermer le panneau"
        @click="emit('close')"
      >
        <X class="size-4" :stroke-width="2" />
      </button>
    </div>

    <div class="px-4 pb-3">
      <label class="flex h-11 items-center gap-2 rounded-desk-pill bg-desk-surface-sunken px-4 text-desk-ink-muted focus-within:ring-2 focus-within:ring-desk-active">
        <Search class="size-4 shrink-0" aria-hidden="true" />
        <span class="sr-only">Rechercher dans {{ categoryName }}</span>
        <input
          v-model="query"
          type="search"
          :placeholder="`Rechercher dans ${categoryName.toLowerCase()}…`"
          class="min-w-0 flex-1 bg-transparent text-desk-body text-desk-ink placeholder:text-desk-ink-muted focus:outline-none"
        >
      </label>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-4">
      <!-- Catalogue -->
      <template v-if="mode === 'catalog'">
        <div v-if="catalogList.length" class="grid grid-cols-2 gap-2.5">
          <div
            v-for="{ item, variants } in catalogList"
            :key="item.id"
            draggable="true"
            class="flex cursor-grab flex-col gap-2.5 rounded-desk-xl bg-desk-surface p-2 pb-3 ring-1 ring-desk-line transition-shadow hover:ring-desk-line-strong active:cursor-grabbing"
            :title="`Glisse « ${item.name} » dans la scène, ou clique sur +`"
            @dragstart="onDragStart($event, item)"
          >
            <span class="relative block h-[120px] rounded-desk-lg bg-desk-surface-sunken p-3">
              <CatalogThumb :item="item" />
              <span v-if="variants > 1" class="absolute top-2 left-2 rounded-desk-pill bg-desk-surface px-2 py-0.5 text-desk-badge text-desk-ink-soft ring-1 ring-desk-line">
                {{ variants }} variantes
              </span>
            </span>
            <span class="flex items-end justify-between gap-2 px-1">
              <span class="flex min-w-0 flex-col gap-0.5">
                <span class="text-sm leading-tight font-semibold text-desk-ink">{{ item.name }}</span>
                <span class="truncate text-desk-caption text-desk-ink-muted">{{ item.description }}</span>
              </span>
              <button
                type="button"
                class="grid size-desk-control-sm shrink-0 place-items-center rounded-desk-pill bg-desk-surface-muted text-desk-ink hover:bg-desk-line"
                :aria-label="`Ajouter « ${item.name} » à la scène`"
                title="Ajouter à la scène"
                @click="editor.addObject(item.id)"
              >
                <Plus class="size-4" :stroke-width="2" />
              </button>
            </span>
          </div>
        </div>
        <div v-else class="flex flex-col items-center gap-3 rounded-desk-xl bg-desk-surface-sunken p-6 text-center">
          <p class="text-sm text-desk-ink-soft">Aucun objet ne correspond à « {{ query }} ».</p>
          <button type="button" class="h-11 rounded-desk-pill bg-desk-active px-4 text-sm font-semibold text-desk-on-active" @click="query = ''">
            Tout afficher
          </button>
        </div>
      </template>

      <!-- Scène -->
      <template v-else>
        <div v-if="sceneList.length" class="grid grid-cols-2 gap-2.5">
          <div
            v-for="group in sceneList"
            :key="group.item.id"
            class="flex flex-col gap-2.5 rounded-desk-xl bg-desk-surface p-2 pb-3"
            :class="group.ids.includes(editor.selectedId ?? '') ? 'ring-2 ring-desk-active' : 'ring-1 ring-desk-line'"
          >
            <span class="relative block h-[120px] rounded-desk-lg bg-desk-surface-sunken p-3">
              <CatalogThumb :item="group.item" />
              <span class="absolute top-2 left-2 rounded-desk-pill bg-desk-active px-2 py-0.5 text-desk-badge text-desk-on-active">×{{ group.ids.length }}</span>
            </span>
            <span class="flex items-end justify-between gap-2 px-1">
              <span class="flex min-w-0 flex-col gap-0.5">
                <span class="text-sm leading-tight font-semibold text-desk-ink">{{ group.item.name }}</span>
                <span class="truncate text-desk-caption text-desk-ink-muted">{{ group.item.description }}</span>
              </span>
              <button
                type="button"
                class="grid size-desk-control-sm shrink-0 place-items-center rounded-desk-pill bg-desk-surface-muted text-desk-ink hover:bg-desk-line"
                :aria-label="`Sélectionner « ${group.item.name} » dans la scène`"
                title="Sélectionner dans la scène"
                @click="selectInScene(group.ids)"
              >
                <Crosshair class="size-4" :stroke-width="2" />
              </button>
            </span>
          </div>
        </div>
        <div v-else class="flex flex-col items-center gap-3 rounded-desk-xl bg-desk-surface-sunken p-6 text-center">
          <p class="text-sm text-desk-ink-soft">Aucun objet de cette catégorie dans ta scène pour l’instant.</p>
          <button type="button" class="h-11 rounded-desk-pill bg-desk-active px-4 text-sm font-semibold text-desk-on-active" @click="emit('showCatalog')">
            Parcourir le catalogue
          </button>
        </div>
      </template>
    </div>
  </section>
</template>
