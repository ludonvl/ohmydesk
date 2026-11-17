<script setup lang="ts">
/** Champ texte avec libellé visible, aide et erreur reliées pour les lecteurs d'écran. */
const props = withDefaults(
  defineProps<{
    id: string
    label: string
    type?: string
    autocomplete?: string
    placeholder?: string
    hint?: string
    error?: string
  }>(),
  { type: 'text', autocomplete: undefined, placeholder: undefined, hint: undefined, error: '' },
)
const model = defineModel<string>({ default: '' })
const emit = defineEmits<{ blur: [] }>()
const describedBy = computed(() => [props.hint ? `${props.id}-hint` : '', props.error ? `${props.id}-error` : ''].filter(Boolean).join(' ') || undefined)
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div class="flex items-baseline justify-between gap-3">
      <label :for="id" class="text-sm font-semibold">{{ label }}</label>
      <slot name="aside" />
    </div>
    <input
      :id="id"
      v-model="model"
      :type="type"
      :autocomplete="autocomplete"
      :placeholder="placeholder"
      class="h-12 w-full rounded-xl border bg-white px-4 text-[15px] text-ink focus:outline-none focus-visible:border-ink"
      :class="error ? 'border-[#c2412d]' : 'border-line-strong'"
      :aria-invalid="!!error"
      :aria-describedby="describedBy"
      @blur="emit('blur')"
    >
    <p v-if="hint && !error" :id="`${id}-hint`" class="text-[13px] text-muted">{{ hint }}</p>
    <p v-if="error" :id="`${id}-error`" class="text-[13px] text-[#b3361f]">{{ error }}</p>
  </div>
</template>
