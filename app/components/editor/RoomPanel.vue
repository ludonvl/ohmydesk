<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { roomThemes } from '#shared/themes'
import type { Room, RoomThemeId } from '#shared/types/scene'
import { useEditorStore } from '~/stores/editor'

const emit = defineEmits<{ close: [] }>()
const editor = useEditorStore()
const room = computed(() => editor.scene.room)

const fmt = (v: number) => `${v.toFixed(1).replace('.', ',')} m`
const surface = computed(() => `${fmt(room.value.width).replace(' m', '')} × ${fmt(room.value.depth)} · ${(Math.round(room.value.width * room.value.depth * 10) / 10).toString().replace('.', ',')} m²`)

const DIMS: { key: 'width' | 'depth' | 'height'; label: string; min: number; max: number; step: number }[] = [
  { key: 'width', label: 'Largeur', min: 2, max: 8, step: 0.5 },
  { key: 'depth', label: 'Profondeur', min: 2, max: 8, step: 0.5 },
  { key: 'height', label: 'Hauteur', min: 2, max: 4, step: 0.1 },
]

function step(key: 'width' | 'depth' | 'height', delta: number) {
  const d = DIMS.find((x) => x.key === key)!
  const next = Math.round(Math.min(d.max, Math.max(d.min, room.value[key] + delta)) * 10) / 10
  if (next !== room.value[key]) editor.setRoom({ [key]: next } as Partial<Room>)
}
</script>

<template>
  <section aria-label="Options de la pièce" class="desk-float flex h-full min-h-0 flex-col overflow-hidden rounded-desk-2xl">
    <div class="flex items-center justify-between py-4 pr-4 pl-6">
      <div class="flex flex-col gap-0.5">
        <h2 class="text-desk-panel-title text-desk-ink">Pièce</h2>
        <span class="text-desk-caption text-desk-ink-muted">{{ surface }}</span>
      </div>
      <button type="button" class="grid size-desk-control-md place-items-center rounded-desk-pill bg-desk-surface-muted text-desk-ink" aria-label="Fermer le panneau" @click="emit('close')">
        <X class="size-4" :stroke-width="2" />
      </button>
    </div>

    <div class="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pt-2 pb-6">
      <div class="flex flex-col gap-2.5">
        <h3 class="desk-overline">Dimensions</h3>
        <div v-for="d in DIMS" :key="d.key" class="flex items-center justify-between gap-3">
          <span class="text-desk-body text-desk-ink">{{ d.label }}</span>
          <div class="flex items-center gap-1 rounded-desk-pill bg-desk-surface-sunken p-0.5">
            <button
              type="button"
              class="grid size-10 place-items-center rounded-desk-pill bg-desk-surface text-lg text-desk-ink shadow-desk-control disabled:opacity-40"
              :aria-label="`Réduire la ${d.label.toLowerCase()}`"
              :disabled="room[d.key] <= d.min"
              @click="step(d.key, -d.step)"
            >
              −
            </button>
            <output class="min-w-16 text-center text-sm font-semibold text-desk-ink">{{ fmt(room[d.key]) }}</output>
            <button
              type="button"
              class="grid size-10 place-items-center rounded-desk-pill bg-desk-surface text-lg text-desk-ink shadow-desk-control disabled:opacity-40"
              :aria-label="`Augmenter la ${d.label.toLowerCase()}`"
              :disabled="room[d.key] >= d.max"
              @click="step(d.key, d.step)"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-2.5">
        <h3 class="desk-overline">Ambiance</h3>
        <div role="radiogroup" aria-label="Ambiance de la pièce" class="flex flex-col gap-2">
          <button
            v-for="theme in Object.values(roomThemes)"
            :key="theme.id"
            type="button"
            role="radio"
            :aria-checked="room.theme === theme.id"
            class="flex items-center gap-3 rounded-desk-md bg-desk-surface p-2.5 text-left"
            :class="room.theme === theme.id ? 'ring-2 ring-desk-active' : 'ring-1 ring-desk-line hover:ring-desk-line-strong'"
            @click="editor.setRoom({ theme: theme.id as RoomThemeId })"
          >
            <span class="flex h-8 w-12 shrink-0 overflow-hidden rounded-lg" aria-hidden="true">
              <span class="flex-1" :style="{ background: theme.wall }" />
              <span class="flex-1" :style="{ background: theme.floor }" />
              <span class="w-3" :style="{ background: theme.swatch }" />
            </span>
            <span class="flex flex-col">
              <span class="text-desk-label text-desk-ink">{{ theme.label }}</span>
              <span class="text-desk-caption text-desk-ink-muted">{{ theme.description }}</span>
            </span>
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <h3 class="desk-overline mb-1.5">Affichage</h3>
        <div class="flex min-h-11 items-center justify-between">
          <span class="text-desk-body text-desk-ink">Murs</span>
          <button
            type="button"
            role="switch"
            :aria-checked="room.walls"
            aria-label="Murs"
            class="flex h-7 w-12 rounded-desk-pill p-[3px] transition-colors"
            :class="room.walls ? 'justify-end bg-desk-active' : 'justify-start bg-desk-line-strong'"
            @click="editor.setRoom({ walls: !room.walls })"
          >
            <span class="size-[22px] rounded-desk-pill bg-desk-surface shadow-sm" />
          </button>
        </div>
        <div class="flex min-h-11 items-center justify-between">
          <span class="text-desk-body text-desk-ink">Grille au sol</span>
          <button
            type="button"
            role="switch"
            :aria-checked="editor.showGrid"
            aria-label="Grille au sol"
            class="flex h-7 w-12 rounded-desk-pill p-[3px] transition-colors"
            :class="editor.showGrid ? 'justify-end bg-desk-active' : 'justify-start bg-desk-line-strong'"
            @click="editor.showGrid = !editor.showGrid"
          >
            <span class="size-[22px] rounded-desk-pill bg-desk-surface shadow-sm" />
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
