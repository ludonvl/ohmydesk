<script setup lang="ts">
import { Search, Trash2 } from 'lucide-vue-next'
import { catalogCategories, catalogItems, getCatalogItem, getCategoryName } from '#shared/catalog/items'
import type { CatalogItem } from '#shared/catalog/types'
import { CATALOG_DRAG_TYPE } from '~/lib/dnd'
import { useEditorStore } from '~/stores/editor'

const editor = useEditorStore()
const tab = ref<'catalog' | 'scene'>('catalog')
const query = ref('')
const category = ref<string>('all')

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const items = computed(() => {
  const q = normalize(query.value.trim())
  return catalogItems.filter((item) => {
    if (category.value !== 'all' && item.category !== category.value) return false
    if (!q) return true
    return [item.name, item.description, ...item.tags].some((t) => normalize(t).includes(q))
  })
})

const categories = computed(() => [{ slug: 'all', name: 'Tout' }, ...catalogCategories])

function onDragStart(e: DragEvent, item: CatalogItem) {
  if (!e.dataTransfer) return
  e.dataTransfer.setData(CATALOG_DRAG_TYPE, item.id)
  e.dataTransfer.effectAllowed = 'copy'
}

function sceneLabel(catalogId: string) {
  return getCatalogItem(catalogId)?.name ?? catalogId
}
</script>

<template>
  <aside aria-label="Catalogue d'objets" class="flex min-h-0 w-full flex-col border-chrome-line bg-chrome-panel md:w-[300px] md:border-r">
    <div class="flex gap-1 px-3 pt-3" role="tablist">
      <button
        role="tab"
        :aria-selected="tab === 'catalog'"
        class="h-[38px] flex-1 rounded-[10px] text-[13px] font-semibold"
        :class="tab === 'catalog' ? 'bg-chrome-line text-chrome-text' : 'text-chrome-muted hover:bg-chrome-raised'"
        @click="tab = 'catalog'"
      >
        Catalogue
      </button>
      <button
        role="tab"
        :aria-selected="tab === 'scene'"
        class="h-[38px] flex-1 rounded-[10px] text-[13px] font-semibold"
        :class="tab === 'scene' ? 'bg-chrome-line text-chrome-text' : 'text-chrome-muted hover:bg-chrome-raised'"
        @click="tab = 'scene'"
      >
        Scène · {{ editor.scene.objects.length }}
      </button>
    </div>

    <template v-if="tab === 'catalog'">
      <div class="flex flex-col gap-1.5 px-4 pt-3.5 pb-1.5">
        <label for="catalog-search" class="text-xs font-medium text-chrome-muted">Rechercher un objet</label>
        <div class="relative">
          <Search class="pointer-events-none absolute top-3 left-3 size-4 text-chrome-muted" aria-hidden="true" />
          <input
            id="catalog-search"
            v-model="query"
            type="search"
            placeholder="Écran, plante, lampe…"
            class="h-10 w-full rounded-[10px] border border-chrome-line bg-chrome-raised pr-3 pl-9 text-sm text-chrome-text placeholder:text-chrome-muted/70 focus:outline-none focus-visible:border-tangerine"
          >
        </div>
      </div>
      <div class="flex flex-wrap gap-1.5 px-4 pt-2 pb-3">
        <button
          v-for="c in categories"
          :key="c.slug"
          class="h-8 rounded-full border px-3 text-[12.5px] font-medium"
          :class="category === c.slug ? 'border-chrome-text bg-chrome-text text-ink' : 'border-[#3a3848] text-chrome-text hover:bg-chrome-raised'"
          :aria-pressed="category === c.slug"
          @click="category = c.slug"
        >
          {{ c.name }}
        </button>
      </div>
      <div class="min-h-0 flex-1 overflow-auto px-4 pb-4">
        <div class="mt-1 mb-2.5 flex items-baseline justify-between">
          <h2 class="text-[13px] font-semibold text-chrome-text">{{ items.length }} objets</h2>
          <span class="text-xs text-chrome-muted">Glisse dans la scène</span>
        </div>
        <div v-if="items.length" class="grid grid-cols-2 gap-2.5">
          <button
            v-for="item in items"
            :key="item.id"
            draggable="true"
            class="flex cursor-grab flex-col gap-2 rounded-[14px] border border-chrome-line bg-chrome-raised p-2 text-left text-chrome-text hover:border-[#4a4760] active:cursor-grabbing"
            :title="`Ajouter « ${item.name} » (ou glisser dans la scène)`"
            @dragstart="onDragStart($event, item)"
            @click="editor.addObject(item.id)"
          >
            <span class="block h-[84px] rounded-[9px] bg-[#2b2938] p-2">
              <CatalogThumb :item="item" />
            </span>
            <span class="flex flex-col gap-0.5 px-0.5 pb-0.5">
              <span class="text-[13px] font-semibold">{{ item.name }}</span>
              <span class="text-xs text-chrome-muted">{{ getCategoryName(item.category) }}</span>
            </span>
          </button>
        </div>
        <p v-else class="rounded-xl border border-dashed border-chrome-line p-4 text-[13px] text-chrome-muted">
          Aucun objet ne correspond à « {{ query }} ».
          <button class="font-semibold text-chrome-text underline" @click="query = ''; category = 'all'">Tout afficher</button>
        </p>
      </div>
    </template>

    <div v-else class="min-h-0 flex-1 overflow-auto p-3">
      <ul v-if="editor.scene.objects.length" class="flex flex-col gap-1">
        <li v-for="obj in editor.scene.objects" :key="obj.id" class="flex items-center gap-1">
          <button
            class="flex h-10 flex-1 items-center rounded-[10px] px-3 text-left text-[13px] font-medium"
            :class="editor.selectedId === obj.id ? 'bg-chrome-line text-chrome-text' : 'text-chrome-text hover:bg-chrome-raised'"
            :aria-pressed="editor.selectedId === obj.id"
            @click="editor.selectedId = obj.id"
          >
            {{ sceneLabel(obj.catalogId) }}
          </button>
          <button
            class="grid size-10 place-items-center rounded-[10px] text-chrome-muted hover:bg-chrome-raised hover:text-chrome-text"
            :aria-label="`Supprimer ${sceneLabel(obj.catalogId)}`"
            :title="`Supprimer ${sceneLabel(obj.catalogId)}`"
            @click="editor.removeObject(obj.id)"
          >
            <Trash2 class="size-4" />
          </button>
        </li>
      </ul>
      <p v-else class="rounded-xl border border-dashed border-chrome-line p-4 text-[13px] text-chrome-muted">
        La pièce est vide. Ajoute des objets depuis le catalogue.
        <button class="font-semibold text-chrome-text underline" @click="tab = 'catalog'">Ouvrir le catalogue</button>
      </p>
    </div>
  </aside>
</template>
