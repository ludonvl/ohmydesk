<script setup lang="ts">
import { Copy, Plus, Trash2, X } from 'lucide-vue-next'
import { findFamilyVariant, getCategoryName, getFamily } from '#shared/catalog/items'
import type { Finish } from '#shared/types/scene'
import { OBJECT_PALETTE, paletteColorName } from '~/lib/palette'
import { useEditorStore } from '~/stores/editor'

const emit = defineEmits<{ close: [] }>()
const editor = useEditorStore()

const FINISHES: { id: Finish; label: string }[] = [
  { id: 'mat', label: 'Mat' },
  { id: 'satin', label: 'Satiné' },
  { id: 'gloss', label: 'Brillant' },
]
const AXES = [
  { index: 0, label: 'X' },
  { index: 1, label: 'Y' },
  { index: 2, label: 'Z' },
] as const

const obj = computed(() => editor.selected)
const item = computed(() => editor.selectedItem)
const family = computed(() => getFamily(item.value?.family?.id))

function chooseVariant(axis: string, value: string) {
  const current = item.value?.family
  if (!obj.value || !current || current.options[axis] === value) return
  // L'axe modifié passe en premier : il prime si la combinaison exacte n'existe pas.
  const target = findFamilyVariant(current.id, { [axis]: value, ...current.options, [axis]: value })
  if (target) editor.setVariant(obj.value.id, target.id)
}

const slots = computed(() => item.value?.materials.filter((m) => m.customizable) ?? [])

function slotColor(slot: string) {
  return obj.value?.colors[slot] ?? item.value?.materials.find((m) => m.slot === slot)?.default ?? '#ffffff'
}
const isCurrent = (slot: string, hex: string) => slotColor(slot).toLowerCase() === hex.toLowerCase()

function setAxis(index: 0 | 1 | 2, e: Event) {
  if (!obj.value) return
  const value = Number.parseFloat((e.target as HTMLInputElement).value.replace(',', '.'))
  if (Number.isNaN(value)) return
  const position = [...obj.value.position] as [number, number, number]
  position[index] = Math.round(value * 1000) / 1000
  editor.setPosition(obj.value.id, position)
}
function setRotation(e: Event) {
  if (obj.value) editor.updateObject(obj.value.id, { rotation: Number((e.target as HTMLInputElement).value) })
}
function setScale(e: Event) {
  const v = Number.parseFloat((e.target as HTMLInputElement).value)
  if (obj.value && !Number.isNaN(v)) editor.updateObject(obj.value.id, { scale: Math.min(3, Math.max(0.25, v / 100)) })
}

const field =
  'h-10 w-full rounded-desk-md bg-desk-surface-sunken px-3 text-sm font-medium text-desk-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-desk-active'
</script>

<template>
  <section v-if="obj && item" :aria-label="`Réglages : ${item.name}`" class="desk-float flex h-full min-h-0 flex-col overflow-hidden rounded-desk-2xl">
    <div class="flex items-start justify-between gap-3 py-4 pr-4 pl-6">
      <div class="flex min-w-0 flex-col gap-0.5">
        <h2 class="truncate text-desk-panel-title text-desk-ink">{{ item.name }}</h2>
        <span class="text-desk-caption text-desk-ink-muted">
          {{ getCategoryName(item.category) }} ·
          {{ Math.round(item.dimensions.width * obj.scale * 100) }} × {{ Math.round(item.dimensions.depth * obj.scale * 100) }} ×
          {{ Math.round(item.dimensions.height * obj.scale * 100) }} cm
        </span>
      </div>
      <button type="button" class="grid size-desk-control-md shrink-0 place-items-center rounded-desk-pill bg-desk-surface-muted text-desk-ink" aria-label="Fermer le panneau" @click="emit('close')">
        <X class="size-4" :stroke-width="2" />
      </button>
    </div>

    <div class="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pt-2 pb-6">
      <template v-if="family && item.family">
        <div v-for="axis in family.axes" :key="axis.id" class="flex flex-col gap-2.5">
          <h3 class="desk-overline">{{ axis.label }}</h3>
          <div role="radiogroup" :aria-label="axis.label" class="flex flex-wrap gap-1.5">
            <button
              v-for="value in axis.values"
              :key="value.id"
              type="button"
              role="radio"
              :aria-checked="item.family.options[axis.id] === value.id"
              class="h-10 rounded-desk-pill px-4 text-sm font-semibold"
              :class="item.family.options[axis.id] === value.id ? 'bg-desk-active text-desk-on-active' : 'bg-desk-surface-sunken text-desk-ink-soft hover:text-desk-ink'"
              @click="chooseVariant(axis.id, value.id)"
            >
              {{ value.label }}
            </button>
          </div>
        </div>
      </template>

      <div v-for="slot in slots" :key="slot.slot" class="flex flex-col gap-2.5">
        <div class="flex items-baseline justify-between">
          <h3 class="desk-overline">{{ slot.label }}</h3>
          <span class="text-desk-caption text-desk-ink-soft">{{ paletteColorName(slotColor(slot.slot)) }}</span>
        </div>
        <div role="radiogroup" :aria-label="`Couleur : ${slot.label}`" class="flex flex-wrap gap-1">
          <button
            v-for="c in OBJECT_PALETTE"
            :key="c.hex"
            type="button"
            role="radio"
            :aria-checked="isCurrent(slot.slot, c.hex)"
            :aria-label="c.name"
            :title="c.name"
            class="grid size-desk-control-md place-items-center rounded-desk-pill"
            @click="editor.setColor(obj.id, slot.slot, c.hex)"
          >
            <span
              class="size-7 rounded-desk-pill"
              :class="isCurrent(slot.slot, c.hex) ? 'shadow-desk-ring-selected' : 'ring-1 ring-black/10 ring-inset'"
              :style="{ background: c.hex }"
            />
          </button>
          <label class="relative grid size-desk-control-md cursor-pointer place-items-center rounded-desk-pill" title="Couleur personnalisée">
            <span class="grid size-7 place-items-center rounded-desk-pill border border-dashed border-desk-line-strong text-desk-ink-soft">
              <Plus class="size-4" aria-hidden="true" />
            </span>
            <span class="sr-only">Couleur personnalisée pour {{ slot.label }}</span>
            <input
              type="color"
              class="absolute inset-0 cursor-pointer opacity-0"
              :value="slotColor(slot.slot)"
              @change="editor.setColor(obj.id, slot.slot, ($event.target as HTMLInputElement).value)"
            >
          </label>
        </div>
      </div>

      <div class="flex flex-col gap-2.5">
        <h3 class="desk-overline">Finition</h3>
        <div role="radiogroup" aria-label="Finition" class="grid grid-cols-3 gap-1 rounded-desk-pill bg-desk-surface-sunken p-1">
          <button
            v-for="f in FINISHES"
            :key="f.id"
            type="button"
            role="radio"
            :aria-checked="obj.finish === f.id"
            class="h-10 rounded-desk-pill text-sm font-semibold"
            :class="obj.finish === f.id ? 'bg-desk-surface text-desk-ink shadow-desk-control' : 'text-desk-ink-soft'"
            @click="editor.setFinish(obj.id, f.id)"
          >
            {{ f.label }}
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-2.5">
        <h3 class="desk-overline">Position <span class="normal-case">(m)</span></h3>
        <div class="grid grid-cols-3 gap-2">
          <label v-for="axis in AXES" :key="axis.label" class="flex flex-col gap-1 text-desk-caption text-desk-ink-muted">
            {{ axis.label }}
            <input :value="obj.position[axis.index].toFixed(2)" inputmode="decimal" :class="field" @change="setAxis(axis.index, $event)">
          </label>
        </div>
      </div>

      <div class="flex flex-col gap-2.5">
        <div class="flex items-baseline justify-between">
          <label for="inspector-rotation" class="desk-overline">Rotation</label>
          <span class="text-desk-label text-desk-ink">{{ obj.rotation }}°</span>
        </div>
        <input id="inspector-rotation" type="range" min="0" max="345" step="15" :value="obj.rotation" class="w-full accent-desk-active" @change="setRotation">
        <div class="grid grid-cols-2 gap-2">
          <button type="button" class="h-10 rounded-desk-pill bg-desk-surface-sunken text-sm font-semibold text-desk-ink" @click="editor.rotateObject(obj.id, -90)">−90°</button>
          <button type="button" class="h-10 rounded-desk-pill bg-desk-surface-sunken text-sm font-semibold text-desk-ink" @click="editor.rotateObject(obj.id, 90)">+90°</button>
        </div>
      </div>

      <label class="flex items-center justify-between gap-3">
        <span class="desk-overline">Échelle (%)</span>
        <input type="number" min="25" max="300" step="5" :value="Math.round(obj.scale * 100)" :class="[field, '!w-24']" @change="setScale">
      </label>
    </div>

    <div class="flex gap-2 border-t border-desk-line px-6 py-4">
      <button type="button" class="flex h-11 flex-1 items-center justify-center gap-2 rounded-desk-pill bg-desk-surface-sunken text-sm font-semibold text-desk-ink" @click="editor.duplicateObject(obj.id)">
        <Copy class="size-4" />Dupliquer
      </button>
      <button type="button" class="flex h-11 flex-1 items-center justify-center gap-2 rounded-desk-pill bg-desk-surface-sunken text-sm font-semibold text-desk-danger" @click="editor.removeObject(obj.id)">
        <Trash2 class="size-4" />Supprimer
      </button>
    </div>
  </section>
</template>
