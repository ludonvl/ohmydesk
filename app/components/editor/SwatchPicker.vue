<script setup lang="ts">
import { Plus } from 'lucide-vue-next'

/** Rangée de pastilles de couleur + couleur personnalisée. */
const props = defineProps<{
  label: string
  value: string
  palette: readonly { hex: string; name: string }[]
}>()
const emit = defineEmits<{ pick: [hex: string] }>()

const isCurrent = (hex: string) => props.value.toLowerCase() === hex.toLowerCase()
</script>

<template>
  <div role="radiogroup" :aria-label="label" class="flex flex-wrap gap-1">
    <button
      v-for="c in palette"
      :key="c.hex"
      type="button"
      role="radio"
      :aria-checked="isCurrent(c.hex)"
      :aria-label="c.name"
      :title="c.name"
      class="grid size-desk-control-md place-items-center rounded-desk-pill"
      @click="emit('pick', c.hex)"
    >
      <span
        class="size-7 rounded-desk-pill"
        :class="isCurrent(c.hex) ? 'shadow-desk-ring-selected' : 'ring-1 ring-black/10 ring-inset'"
        :style="{ background: c.hex }"
      />
    </button>
    <label class="relative grid size-desk-control-md cursor-pointer place-items-center rounded-desk-pill" title="Couleur personnalisée">
      <span class="grid size-7 place-items-center rounded-desk-pill border border-dashed border-desk-line-strong text-desk-ink-soft">
        <Plus class="size-4" aria-hidden="true" />
      </span>
      <span class="sr-only">Couleur personnalisée : {{ label }}</span>
      <input type="color" class="absolute inset-0 cursor-pointer opacity-0" :value="value" @change="emit('pick', ($event.target as HTMLInputElement).value)">
    </label>
  </div>
</template>
