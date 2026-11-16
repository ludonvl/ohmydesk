<script setup lang="ts">
import { Copy, Plus, Trash2 } from 'lucide-vue-next'
import { getCategoryName } from '#shared/catalog/items'
import { roomThemes } from '#shared/themes'
import type { Finish, RoomThemeId } from '#shared/types/scene'
import { Button } from '~/components/ui/button'
import { useEditorStore } from '~/stores/editor'

const editor = useEditorStore()

const PALETTE = [
  { hex: '#FF6B35', name: 'Orange brûlé' },
  { hex: '#A497FF', name: 'Lavande' },
  { hex: '#4CC9A0', name: 'Menthe' },
  { hex: '#FFCF5A', name: 'Moutarde' },
  { hex: '#7E9C8F', name: 'Sauge' },
  { hex: '#FF4FD8', name: 'Rose néon' },
  { hex: '#24E1FF', name: 'Cyan' },
  { hex: '#2E2C3D', name: 'Encre' },
  { hex: '#F5F2EC', name: 'Coquille' },
]
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
const slots = computed(() => item.value?.materials.filter((m) => m.customizable) ?? [])

function slotColor(slot: string) {
  return obj.value?.colors[slot] ?? item.value?.materials.find((m) => m.slot === slot)?.default ?? '#ffffff'
}
function colorName(hex: string) {
  return PALETTE.find((p) => p.hex.toLowerCase() === hex.toLowerCase())?.name ?? hex.toUpperCase()
}

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
function setRoomSize(key: 'width' | 'depth' | 'height', e: Event) {
  const v = Number.parseFloat((e.target as HTMLInputElement).value)
  if (!Number.isNaN(v)) editor.setRoom({ [key]: v })
}
</script>

<template>
  <aside aria-label="Propriétés" class="flex min-h-0 w-full flex-col overflow-auto border-chrome-line bg-chrome-panel text-chrome-text md:w-[300px] md:border-l">
    <!-- Objet sélectionné -->
    <template v-if="obj && item">
      <div class="flex items-start gap-3 border-b border-chrome-line px-[18px] pt-[18px] pb-4">
        <div class="flex flex-1 flex-col gap-1.5">
          <span class="text-xs text-chrome-muted">Objet sélectionné</span>
          <h2 class="font-display text-xl leading-tight font-bold tracking-tight">{{ item.name }}</h2>
          <span class="self-start rounded-full bg-chrome-line px-2.5 py-0.5 text-xs font-medium">{{ getCategoryName(item.category) }}</span>
        </div>
      </div>

      <section v-for="slot in slots" :key="slot.slot" class="flex flex-col gap-3 border-b border-chrome-line p-[18px]">
        <div class="flex items-baseline justify-between">
          <h3 class="text-[13px] font-semibold">{{ slot.label }}</h3>
          <span class="text-xs text-chrome-muted">{{ colorName(slotColor(slot.slot)) }}</span>
        </div>
        <div class="flex flex-wrap gap-2.5">
          <button
            v-for="c in PALETTE"
            :key="c.hex"
            class="size-8 rounded-full border border-white/15"
            :style="{
              background: c.hex,
              boxShadow: slotColor(slot.slot).toLowerCase() === c.hex.toLowerCase() ? '0 0 0 3px #1B1A25, 0 0 0 5px #ECEAF5' : undefined,
            }"
            :aria-label="c.name"
            :title="c.name"
            :aria-pressed="slotColor(slot.slot).toLowerCase() === c.hex.toLowerCase()"
            @click="editor.setColor(obj.id, slot.slot, c.hex)"
          />
          <label class="relative grid size-8 cursor-pointer place-items-center rounded-full border border-dashed border-[#5a5670]" title="Couleur personnalisée">
            <Plus class="size-4" aria-hidden="true" />
            <span class="sr-only">Couleur personnalisée pour {{ slot.label }}</span>
            <input
              type="color"
              class="absolute inset-0 cursor-pointer opacity-0"
              :value="slotColor(slot.slot)"
              @change="editor.setColor(obj.id, slot.slot, ($event.target as HTMLInputElement).value)"
            >
          </label>
        </div>
      </section>

      <section class="flex flex-col gap-3 border-b border-chrome-line p-[18px]">
        <h3 class="text-[13px] font-semibold">Finition</h3>
        <div class="flex gap-0.5 rounded-[10px] bg-chrome-raised p-[3px]" role="group" aria-label="Finition">
          <button
            v-for="f in FINISHES"
            :key="f.id"
            class="h-[34px] flex-1 rounded-lg text-[13px] font-medium"
            :class="obj.finish === f.id ? 'bg-[#3a3848] text-white' : 'text-chrome-muted hover:text-chrome-text'"
            :aria-pressed="obj.finish === f.id"
            @click="editor.setFinish(obj.id, f.id)"
          >
            {{ f.label }}
          </button>
        </div>
      </section>

      <section class="flex flex-col gap-3 border-b border-chrome-line p-[18px]">
        <h3 class="text-[13px] font-semibold">Position <span class="font-normal text-chrome-muted">(m)</span></h3>
        <div class="grid grid-cols-3 gap-2">
          <label v-for="axis in AXES" :key="axis.label" class="flex flex-col gap-1 text-xs text-chrome-muted">
            {{ axis.label }}
            <input
              :value="obj.position[axis.index].toFixed(2)"
              inputmode="decimal"
              class="h-9 w-full rounded-lg border border-chrome-line bg-chrome-raised px-2.5 text-[13px] font-medium text-chrome-text focus:outline-none focus-visible:border-tangerine"
              @change="setAxis(axis.index, $event)"
            >
          </label>
        </div>
        <div class="mt-1 flex items-baseline justify-between">
          <label for="inspector-rotation" class="text-[13px] font-semibold">Rotation</label>
          <span class="text-[13px] font-semibold">{{ obj.rotation }}°</span>
        </div>
        <input id="inspector-rotation" type="range" min="0" max="345" step="15" :value="obj.rotation" class="w-full accent-tangerine" @change="setRotation">
        <div class="flex gap-2">
          <Button variant="chrome" size="sm" class="flex-1" @click="editor.rotateObject(obj.id, -90)">−90°</Button>
          <Button variant="chrome" size="sm" class="flex-1" @click="editor.rotateObject(obj.id, 90)">+90°</Button>
        </div>
        <label class="mt-1 flex items-center justify-between gap-3 text-[13px] font-semibold">
          Échelle (%)
          <input
            type="number"
            min="25"
            max="300"
            step="5"
            :value="Math.round(obj.scale * 100)"
            class="h-9 w-24 rounded-lg border border-chrome-line bg-chrome-raised px-2.5 text-[13px] font-medium text-chrome-text"
            @change="setScale"
          >
        </label>
      </section>

      <section class="flex flex-col gap-1.5 p-[18px]">
        <h3 class="text-[13px] font-semibold">Dimensions</h3>
        <p class="text-[13px] text-chrome-muted">
          {{ Math.round(item.dimensions.width * obj.scale * 100) }} × {{ Math.round(item.dimensions.depth * obj.scale * 100) }} ×
          {{ Math.round(item.dimensions.height * obj.scale * 100) }} cm
        </p>
      </section>

      <div class="flex-1" />
      <div class="flex gap-2 border-t border-chrome-line px-[18px] py-4">
        <Button variant="chrome" size="sm" class="h-10 flex-1" @click="editor.duplicateObject(obj.id)">
          <Copy class="size-4" />Dupliquer
        </Button>
        <Button variant="destructive" size="sm" class="h-10 flex-1" @click="editor.removeObject(obj.id)">
          <Trash2 class="size-4" />Supprimer
        </Button>
      </div>
    </template>

    <!-- Rien de sélectionné : réglages de la pièce -->
    <template v-else>
      <div class="border-b border-chrome-line px-[18px] pt-[18px] pb-4">
        <span class="text-xs text-chrome-muted">Aucun objet sélectionné</span>
        <h2 class="font-display text-xl font-bold tracking-tight">La pièce</h2>
      </div>
      <section class="flex flex-col gap-3 border-b border-chrome-line p-[18px]">
        <h3 class="text-[13px] font-semibold">Ambiance</h3>
        <div class="flex flex-col gap-2">
          <button
            v-for="theme in Object.values(roomThemes)"
            :key="theme.id"
            class="flex items-center gap-3 rounded-xl border p-3 text-left"
            :class="editor.scene.room.theme === theme.id ? 'border-tangerine bg-chrome-raised' : 'border-chrome-line hover:bg-chrome-raised'"
            :aria-pressed="editor.scene.room.theme === theme.id"
            @click="editor.setRoom({ theme: theme.id as RoomThemeId })"
          >
            <span class="flex h-8 w-12 overflow-hidden rounded-md" aria-hidden="true">
              <span class="flex-1" :style="{ background: theme.wall }" />
              <span class="flex-1" :style="{ background: theme.floor }" />
              <span class="w-3" :style="{ background: theme.swatch }" />
            </span>
            <span class="flex flex-col">
              <span class="text-[13px] font-semibold">{{ theme.label }}</span>
              <span class="text-xs text-chrome-muted">{{ theme.description }}</span>
            </span>
          </button>
        </div>
      </section>
      <section class="flex flex-col gap-3 p-[18px]">
        <h3 class="text-[13px] font-semibold">Dimensions <span class="font-normal text-chrome-muted">(m)</span></h3>
        <label class="flex flex-col gap-1 text-xs text-chrome-muted">
          Largeur · {{ editor.scene.room.width.toFixed(1) }} m
          <input type="range" min="2" max="6" step="0.5" :value="editor.scene.room.width" class="accent-tangerine" @change="setRoomSize('width', $event)">
        </label>
        <label class="flex flex-col gap-1 text-xs text-chrome-muted">
          Profondeur · {{ editor.scene.room.depth.toFixed(1) }} m
          <input type="range" min="2" max="6" step="0.5" :value="editor.scene.room.depth" class="accent-tangerine" @change="setRoomSize('depth', $event)">
        </label>
        <label class="flex flex-col gap-1 text-xs text-chrome-muted">
          Hauteur sous plafond · {{ editor.scene.room.height.toFixed(1) }} m
          <input type="range" min="2" max="3.5" step="0.1" :value="editor.scene.room.height" class="accent-tangerine" @change="setRoomSize('height', $event)">
        </label>
        <label class="mt-1 flex items-center justify-between text-[13px] font-semibold">
          Afficher les murs
          <input type="checkbox" class="size-4 accent-tangerine" :checked="editor.scene.room.walls" @change="editor.setRoom({ walls: ($event.target as HTMLInputElement).checked })">
        </label>
      </section>
    </template>
  </aside>
</template>
