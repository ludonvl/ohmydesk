<script setup lang="ts">
import { Heart } from 'lucide-vue-next'
import type { LikeState } from '#shared/types/social'

/**
 * Bouton « J'aime » avec mise à jour optimiste. Sans session, renvoie vers la connexion
 * puis revient sur la page en cours.
 */
const props = withDefaults(
  defineProps<{ setupId: string; setupName: string; liked: boolean; count: number; size?: 'sm' | 'lg' }>(),
  { size: 'sm' },
)
const emit = defineEmits<{ change: [state: LikeState] }>()

const route = useRoute()
const pending = ref(false)
const error = ref('')

async function toggle() {
  if (pending.value) return
  const previous: LikeState = { liked: props.liked, likeCount: props.count }
  const next = !props.liked
  error.value = ''
  pending.value = true
  emit('change', { liked: next, likeCount: Math.max(0, props.count + (next ? 1 : -1)) })
  try {
    const state = await $fetch<LikeState>(`/api/setups/${props.setupId}/like`, { method: next ? 'POST' : 'DELETE' })
    emit('change', state)
  } catch (e) {
    emit('change', previous)
    const status = (e as { statusCode?: number }).statusCode
    if (status === 401) await navigateTo({ path: '/login', query: { redirect: route.fullPath } })
    else error.value = 'Ton « j’aime » n’a pas été enregistré. Réessaie.'
  } finally {
    pending.value = false
  }
}

const label = computed(() => `${props.liked ? 'Retirer mon j’aime de' : 'Aimer'} ${props.setupName} (${props.count} j’aime)`)
</script>

<template>
  <span class="inline-flex flex-col items-start gap-1">
    <button
      type="button"
      :aria-pressed="liked"
      :aria-label="label"
      :title="liked ? 'Retirer mon j’aime' : 'J’aime'"
      class="inline-flex items-center justify-center gap-1.5 rounded-xl border font-semibold tabular-nums transition-colors"
      :class="[
        size === 'lg' ? 'h-[46px] min-w-[46px] px-3.5 text-[15px]' : 'h-9 min-w-9 px-2.5 text-[13px]',
        liked ? 'border-[#f6c9b8] bg-[#fff1eb] text-[#b8380f] hover:bg-[#ffe6db]' : 'border-line-strong bg-white text-ink hover:bg-lilac',
      ]"
      @click.prevent.stop="toggle"
    >
      <Heart :class="size === 'lg' ? 'size-[19px]' : 'size-4'" :fill="liked ? 'currentColor' : 'none'" aria-hidden="true" />
      <span>{{ count }}</span>
    </button>
    <span v-if="error" role="alert" class="text-xs text-[#b3361f]">{{ error }}</span>
  </span>
</template>
