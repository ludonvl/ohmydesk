<script setup lang="ts">
import { Copy, Rotate3d, RotateCw, Scan, Trash2, ZoomIn, ZoomOut } from 'lucide-vue-next'

defineProps<{ hasSelection: boolean }>()
const emit = defineEmits<{
  rotateObject: []
  duplicate: []
  remove: []
  zoomIn: []
  zoomOut: []
  reset: []
  rotateCamera: []
}>()

const btn =
  'grid size-11 place-items-center rounded-[11px] text-chrome-text transition-colors hover:bg-chrome-line disabled:pointer-events-none disabled:opacity-35'
</script>

<template>
  <div
    role="toolbar"
    aria-label="Outils de la scène"
    class="flex items-center gap-0.5 rounded-2xl bg-ink p-1.5 text-chrome-text shadow-[0_12px_32px_rgba(22,21,31,0.28)]"
  >
    <button :class="btn" :disabled="!hasSelection" aria-label="Pivoter l’objet (R)" title="Pivoter l’objet (R)" @click="emit('rotateObject')">
      <RotateCw class="size-[19px]" />
    </button>
    <button :class="btn" :disabled="!hasSelection" aria-label="Dupliquer (D)" title="Dupliquer (D)" @click="emit('duplicate')">
      <Copy class="size-[19px]" />
    </button>
    <button :class="btn" :disabled="!hasSelection" aria-label="Supprimer (Suppr)" title="Supprimer (Suppr)" @click="emit('remove')">
      <Trash2 class="size-[19px]" />
    </button>
    <div class="mx-1.5 h-[26px] w-px bg-[#33313f]" aria-hidden="true" />
    <button :class="btn" aria-label="Dézoomer" title="Dézoomer" @click="emit('zoomOut')">
      <ZoomOut class="size-[19px]" />
    </button>
    <button :class="btn" aria-label="Zoomer" title="Zoomer" @click="emit('zoomIn')">
      <ZoomIn class="size-[19px]" />
    </button>
    <button :class="btn" aria-label="Recadrer la vue" title="Recadrer la vue" @click="emit('reset')">
      <Scan class="size-[19px]" />
    </button>
    <button :class="btn" aria-label="Pivoter la caméra de 90°" title="Pivoter la caméra de 90°" @click="emit('rotateCamera')">
      <Rotate3d class="size-[19px]" />
    </button>
  </div>
</template>
