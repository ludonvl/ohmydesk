<!--
  Pièce + catégories dans une seule pastille verticale, sans défilement : la taille des boutons
  suit la hauteur du conteneur parent (unités cqh, parent en `container-type: size`), de 24 à 44px.
-->
<script setup lang="ts">
import { Archive, Armchair, Cpu, DoorOpen, Keyboard, LampDesk, Monitor, Sparkles, Speaker, Sprout } from 'lucide-vue-next'
import type { Component } from 'vue'
import { catalogCategories } from '#shared/catalog/items'
import type { CategorySlug } from '#shared/catalog/types'
import DeskIcon from './DeskIcon.vue'

defineProps<{
  /** Catégorie ouverte, `room` pour le panneau Pièce, null si rien d'ouvert. */
  active: CategorySlug | 'room' | null
  /** Nombre d'objets présents par catégorie (mode Scène) ; absent en mode Catalogue. */
  counts?: Partial<Record<CategorySlug, number>>
}>()
const emit = defineEmits<{ toggle: [target: CategorySlug | 'room'] }>()

const ICONS: Record<CategorySlug, Component> = {
  desks: DeskIcon,
  screens: Monitor,
  peripherals: Keyboard,
  seating: Armchair,
  computers: Cpu,
  audio: Speaker,
  lighting: LampDesk,
  plants: Sprout,
  decor: Sparkles,
  storage: Archive,
}
</script>

<template>
  <nav aria-label="Pièce et catégories d’objets" class="desk-float flex flex-col gap-1 overflow-hidden rounded-desk-pill p-1.5">
    <button
      type="button"
      class="grid size-[clamp(24px,calc((100cqh-64px)/11),var(--spacing-desk-control-md))] shrink-0 place-items-center rounded-desk-pill transition-colors"
      :class="active === 'room' ? 'bg-desk-active text-desk-on-active' : 'text-desk-ink hover:bg-desk-surface-muted'"
      aria-label="Configurer la pièce"
      title="Pièce"
      :aria-pressed="active === 'room'"
      @click="emit('toggle', 'room')"
    >
      <DoorOpen class="size-5" :stroke-width="1.8" />
    </button>
    <span class="mx-auto my-1 h-px w-6 shrink-0 bg-desk-line" aria-hidden="true" />
    <button
      v-for="c in catalogCategories"
      :key="c.slug"
      type="button"
      class="relative grid size-[clamp(24px,calc((100cqh-64px)/11),var(--spacing-desk-control-md))] shrink-0 place-items-center rounded-desk-pill transition-colors"
      :class="active === c.slug ? 'bg-desk-active text-desk-on-active' : 'text-desk-ink hover:bg-desk-surface-muted'"
      :aria-label="c.name"
      :title="c.name"
      :aria-pressed="active === c.slug"
      @click="emit('toggle', c.slug)"
    >
      <component :is="ICONS[c.slug]" class="size-5" :stroke-width="1.8" />
      <span
        v-if="counts?.[c.slug]"
        class="absolute top-0 right-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-desk-pill border-2 border-desk-surface bg-desk-active px-1 text-[10px] font-bold text-desk-on-active"
      >
        {{ counts[c.slug] }}
      </span>
    </button>
  </nav>
</template>
