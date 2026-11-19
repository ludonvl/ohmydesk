<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next'
import type { ReportReason } from '#shared/types/moderation'
import { REPORT_DETAILS_MAX, REPORT_REASON_LABELS, reportReasons } from '#shared/types/moderation'
import { Button } from '~/components/ui/button'

/** Formulaire de signalement d'un setup public, affiché sous les actions du viewer. */
const props = defineProps<{ setupId: string; setupName: string }>()
const emit = defineEmits<{ close: [] }>()

const route = useRoute()
const reason = ref<ReportReason | null>(null)
const details = ref('')
const touched = ref(false)
const submitting = ref(false)
const error = ref('')
const done = ref<'sent' | 'already' | null>(null)

const reasonError = computed(() => (touched.value && !reason.value ? 'Choisis un motif.' : ''))

async function submit() {
  touched.value = true
  error.value = ''
  if (!reason.value) return
  submitting.value = true
  try {
    await $fetch(`/api/setups/${props.setupId}/report`, { method: 'POST', body: { reason: reason.value, details: details.value } })
    done.value = 'sent'
  } catch (e) {
    const err = e as { statusCode?: number; data?: { statusMessage?: string } }
    if (err.statusCode === 401) await navigateTo({ path: '/login', query: { redirect: route.fullPath } })
    else if (err.statusCode === 409) done.value = 'already'
    else error.value = err.data?.statusMessage ?? 'Le signalement n’a pas pu être envoyé. Réessaie dans un instant.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section aria-labelledby="report-title" class="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
    <h2 id="report-title" class="font-display text-lg font-bold">Signaler « {{ setupName }} »</h2>

    <template v-if="done">
      <FormNotice kind="success">
        {{ done === 'sent' ? 'Merci, ton signalement a été envoyé. Il sera examiné rapidement.' : 'Tu as déjà signalé ce setup. Merci, il sera examiné.' }}
      </FormNotice>
      <div><Button variant="outline" size="sm" @click="emit('close')">Fermer</Button></div>
    </template>

    <form v-else class="flex flex-col gap-4" novalidate @submit.prevent="submit">
      <fieldset class="flex flex-col gap-2" :aria-describedby="reasonError ? 'report-reason-error' : undefined">
        <legend class="mb-1 text-sm font-semibold">Motif</legend>
        <label v-for="r in reportReasons" :key="r" class="flex items-start gap-2.5 text-[15px]">
          <input v-model="reason" type="radio" name="report-reason" :value="r" class="mt-1 size-4 accent-tangerine">
          <span>{{ REPORT_REASON_LABELS[r] }}</span>
        </label>
        <p v-if="reasonError" id="report-reason-error" class="text-[13px] text-[#b3361f]">{{ reasonError }}</p>
      </fieldset>
      <div class="flex flex-col gap-1.5">
        <div class="flex items-baseline justify-between gap-3">
          <label for="report-details" class="text-sm font-semibold">Précisions <span class="font-normal text-muted">(facultatif)</span></label>
          <span class="text-[13px] text-muted tabular-nums">{{ details.length }} / {{ REPORT_DETAILS_MAX }}</span>
        </div>
        <textarea
          id="report-details"
          v-model="details"
          rows="3"
          :maxlength="REPORT_DETAILS_MAX"
          class="w-full resize-y rounded-xl border border-line-strong bg-white px-4 py-3 text-[15px] leading-relaxed text-ink focus:outline-none focus-visible:border-ink"
        />
      </div>
      <p class="text-[13px] text-muted">L’auteur ne saura pas qui a signalé son setup.</p>
      <FormNotice v-if="error" kind="error">{{ error }}</FormNotice>
      <div class="flex flex-wrap gap-2">
        <Button type="submit" size="sm" :aria-busy="submitting">
          <LoaderCircle v-if="submitting" class="size-4 animate-spin" aria-hidden="true" />
          Envoyer le signalement
        </Button>
        <Button type="button" variant="ghost" size="sm" @click="emit('close')">Annuler</Button>
      </div>
    </form>
  </section>
</template>
