<script setup lang="ts">
import { Camera, Eye, EyeOff, Minus, Plus, RotateCw, Scan } from 'lucide-vue-next'

defineProps<{ zoomLabel: string; preview: boolean }>()
const emit = defineEmits<{
  rotateCamera: []
  reset: []
  capture: []
  zoomIn: []
  zoomOut: []
  togglePreview: []
}>()

const btn = 'grid size-desk-control-md place-items-center rounded-desk-pill text-desk-ink transition-colors hover:bg-desk-surface-muted'
</script>

<template>
  <div class="flex flex-wrap items-center justify-center gap-2.5">
    <div role="toolbar" aria-label="Vue" class="desk-float flex items-center gap-0.5 rounded-desk-pill p-1">
      <button type="button" :class="btn" aria-label="Pivoter la pièce de 90° dans le sens horaire" title="Pivoter de 90°" @click="emit('rotateCamera')">
        <RotateCw class="size-[18px]" :stroke-width="1.8" />
      </button>
      <button type="button" :class="btn" aria-label="Recentrer la vue" title="Recentrer" @click="emit('reset')">
        <Scan class="size-[18px]" :stroke-width="1.8" />
      </button>
      <button type="button" :class="btn" aria-label="Télécharger une capture de la scène" title="Capture" @click="emit('capture')">
        <Camera class="size-[18px]" :stroke-width="1.8" />
      </button>
      <button
        type="button"
        :class="[btn, preview ? '!bg-desk-active !text-desk-on-active' : '']"
        :aria-label="preview ? 'Quitter l’aperçu' : 'Aperçu'"
        :title="preview ? 'Quitter l’aperçu' : 'Aperçu'"
        :aria-pressed="preview"
        @click="emit('togglePreview')"
      >
        <EyeOff v-if="preview" class="size-[18px]" :stroke-width="1.8" />
        <Eye v-else class="size-[18px]" :stroke-width="1.8" />
      </button>
    </div>
    <div class="desk-float flex items-center gap-0.5 rounded-desk-pill p-1">
      <button type="button" :class="btn" aria-label="Dézoomer" title="Dézoomer" @click="emit('zoomOut')">
        <Minus class="size-[18px]" :stroke-width="1.8" />
      </button>
      <span class="min-w-12 text-center text-desk-label text-desk-ink" aria-live="polite">{{ zoomLabel }}</span>
      <button type="button" :class="btn" aria-label="Zoomer" title="Zoomer" @click="emit('zoomIn')">
        <Plus class="size-[18px]" :stroke-width="1.8" />
      </button>
    </div>
  </div>
</template>
