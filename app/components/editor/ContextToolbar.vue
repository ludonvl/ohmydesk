<script setup lang="ts">
import { Copy, RotateCw, SlidersHorizontal, Trash2 } from 'lucide-vue-next'
import { OBJECT_PALETTE } from '~/lib/palette'
import { useEditorStore } from '~/stores/editor'

defineProps<{ settingsOpen: boolean }>()
const emit = defineEmits<{ openSettings: [] }>()
const editor = useEditorStore()

/** Couleurs rapides : la première zone personnalisable de l'objet, 4 teintes de la palette. */
const QUICK = OBJECT_PALETTE.slice(0, 4)
const slot = computed(() => editor.selectedItem?.materials.find((m) => m.customizable) ?? null)
const current = computed(() => {
  if (!editor.selected || !slot.value) return null
  return (editor.selected.colors[slot.value.slot] ?? slot.value.default).toLowerCase()
})

const btn = 'grid size-10 place-items-center rounded-desk-pill text-desk-ink transition-colors hover:bg-desk-surface-muted'
</script>

<template>
  <div
    v-if="editor.selected && editor.selectedItem"
    role="toolbar"
    :aria-label="`Objet sélectionné : ${editor.selectedItem.name}`"
    class="desk-float flex items-center gap-1 rounded-desk-pill p-1.5 whitespace-nowrap"
  >
    <span class="max-w-44 truncate pr-2.5 pl-3 text-desk-label text-desk-ink">{{ editor.selectedItem.name }}</span>
    <template v-if="slot">
      <span class="h-6 w-px bg-desk-line" aria-hidden="true" />
      <div role="radiogroup" :aria-label="`Couleur : ${slot.label}`" class="flex gap-0.5 px-1">
        <button
          v-for="c in QUICK"
          :key="c.hex"
          type="button"
          role="radio"
          :aria-checked="current === c.hex.toLowerCase()"
          :aria-label="c.name"
          :title="c.name"
          class="grid size-desk-control-sm place-items-center rounded-desk-pill"
          @click="editor.setColor(editor.selected.id, slot.slot, c.hex)"
        >
          <span
            class="size-5 rounded-desk-pill"
            :class="current === c.hex.toLowerCase() ? 'shadow-desk-ring-selected' : 'ring-1 ring-black/10 ring-inset'"
            :style="{ background: c.hex }"
          />
        </button>
      </div>
    </template>
    <span class="h-6 w-px bg-desk-line" aria-hidden="true" />
    <button type="button" :class="btn" aria-label="Pivoter l’objet" title="Pivoter (R)" @click="editor.rotateObject(editor.selected.id, 90)">
      <RotateCw class="size-[18px]" :stroke-width="1.8" />
    </button>
    <button type="button" :class="btn" aria-label="Dupliquer" title="Dupliquer (D)" @click="editor.duplicateObject(editor.selected.id)">
      <Copy class="size-[18px]" :stroke-width="1.8" />
    </button>
    <button
      type="button"
      :class="[btn, settingsOpen ? '!bg-desk-active !text-desk-on-active' : '']"
      aria-label="Tous les réglages"
      title="Tous les réglages"
      :aria-pressed="settingsOpen"
      @click="emit('openSettings')"
    >
      <SlidersHorizontal class="size-[18px]" :stroke-width="1.8" />
    </button>
    <button type="button" :class="[btn, '!text-desk-danger']" aria-label="Supprimer" title="Supprimer (Suppr)" @click="editor.removeObject(editor.selected.id)">
      <Trash2 class="size-[18px]" :stroke-width="1.8" />
    </button>
  </div>
</template>
