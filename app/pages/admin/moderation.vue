<script setup lang="ts">
import { EyeOff, LoaderCircle } from 'lucide-vue-next'
import type { MissingPreview, ModerationAction, ModerationItem, ReportReason } from '#shared/types/moderation'
import { REPORT_REASON_LABELS, reportReasons } from '#shared/types/moderation'
import { Button } from '~/components/ui/button'

definePageMeta({ middleware: ['auth', 'admin'] })
useSeoMeta({ title: 'Modération · Oh My Desk', robots: 'noindex' })

const route = useRoute()
const filter = computed<'open' | 'hidden'>(() => (route.query.filtre === 'masques' ? 'hidden' : 'open'))
const tabs = [
  { id: 'open', label: 'À examiner', query: {} },
  { id: 'hidden', label: 'Masqués', query: { filtre: 'masques' } },
] as const

const headers = useRequestHeaders(['cookie'])
const { data: items, status, error, refresh } = await useFetch<ModerationItem[]>('/api/admin/reports', {
  headers,
  query: { filter },
  watch: [filter],
  default: () => [],
})
const { data: missing, refresh: refreshMissing } = await useFetch<MissingPreview[]>('/api/admin/previews', { headers, default: () => [] })

/** Motif proposé pour masquer : le plus fréquent parmi les signalements ouverts. */
const hideReasons = reactive<Record<string, ReportReason>>({})
watch(
  items,
  (list) => {
    for (const item of list) {
      const counts = new Map<ReportReason, number>()
      for (const r of item.reports.filter((r) => r.status === 'open')) counts.set(r.reason, (counts.get(r.reason) ?? 0) + 1)
      hideReasons[item.setup.id] ??= [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'other'
    }
  },
  { immediate: true },
)

const busy = ref<string | null>(null)
const actionError = ref('')
async function moderate(item: ModerationItem, action: ModerationAction) {
  busy.value = `${item.setup.id}:${action}`
  actionError.value = ''
  try {
    await $fetch(`/api/admin/setups/${item.setup.id}/moderate`, {
      method: 'POST',
      body: { action, reason: action === 'hide' ? hideReasons[item.setup.id] : undefined },
    })
    await refresh()
  } catch {
    actionError.value = `L’action sur « ${item.setup.name} » a échoué. Réessaie.`
  } finally {
    busy.value = null
  }
}

const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const statusLabel = { open: 'En attente', dismissed: 'Classé', actioned: 'Retenu' } as const
</script>

<template>
  <main class="mx-auto flex max-w-[1100px] flex-col gap-8 px-6 pt-6 pb-24">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div class="flex flex-col gap-1.5">
        <h1 class="font-display text-[40px] leading-tight font-extrabold tracking-tight">Modération</h1>
        <p class="text-subtle">Setups signalés et masqués. Masquer un setup prévient son auteur par email.</p>
      </div>
      <nav aria-label="Filtrer" class="flex gap-1 rounded-[14px] border border-line bg-white p-1">
        <NuxtLink
          v-for="tab in tabs"
          :key="tab.id"
          :to="{ query: tab.query }"
          replace
          :aria-current="filter === tab.id ? 'page' : undefined"
          class="flex h-9 items-center rounded-[10px] px-4 text-sm font-semibold transition-colors"
          :class="filter === tab.id ? 'bg-ink text-white' : 'text-subtle hover:bg-lilac hover:text-ink'"
        >
          {{ tab.label }}
        </NuxtLink>
      </nav>
    </div>

    <p v-if="actionError" role="alert" class="rounded-xl bg-[#fdecea] px-4 py-3 text-sm text-[#8f2a17]">{{ actionError }}</p>

    <div v-if="error" class="rounded-3xl border border-line bg-white p-8 text-center">
      <p class="font-semibold">La liste n’a pas pu être chargée.</p>
      <Button variant="outline" class="mt-4" @click="refresh()">Réessayer</Button>
    </div>
    <p v-else-if="status !== 'pending' && items.length === 0" class="rounded-3xl border border-dashed border-line-strong bg-white px-8 py-12 text-center text-subtle">
      {{ filter === 'open' ? 'Aucun signalement en attente.' : 'Aucun setup masqué.' }}
    </p>

    <ul v-else class="flex flex-col gap-5">
      <li v-for="item in items" :key="item.setup.id" class="flex flex-col gap-4 rounded-3xl border border-line bg-white p-6 md:flex-row">
        <div class="aspect-[4/3] w-full shrink-0 overflow-hidden rounded-2xl bg-lilac md:w-56">
          <img v-if="item.setup.previewUrl" :src="item.setup.previewUrl" alt="" class="h-full w-full object-cover" loading="lazy">
        </div>
        <div class="flex min-w-0 flex-1 flex-col gap-3">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="flex flex-col gap-0.5">
              <h2 class="font-display text-xl font-bold">
                <NuxtLink v-if="!item.hiddenAt" :to="`/setup/${item.setup.slug}`" class="hover:text-link">{{ item.setup.name }}</NuxtLink>
                <template v-else>{{ item.setup.name }}</template>
              </h2>
              <p class="text-sm text-muted">
                par
                <NuxtLink v-if="item.setup.authorUsername" :to="`/u/${item.setup.authorUsername}`" class="font-medium text-ink hover:text-link">{{ item.setup.authorName }}</NuxtLink>
                <template v-else>{{ item.setup.authorName }}</template>
                · {{ item.openCount }} signalement{{ item.openCount > 1 ? 's' : '' }} en attente
              </p>
            </div>
            <span v-if="item.hiddenAt" class="flex items-center gap-1 rounded-full bg-[#fdecea] px-2.5 py-1 text-xs font-semibold text-[#8f2a17]">
              <EyeOff class="size-3.5" aria-hidden="true" />
              {{ item.hiddenReason === 'auto' ? 'Masqué automatiquement' : `Masqué : ${REPORT_REASON_LABELS[item.hiddenReason as ReportReason] ?? item.hiddenReason}` }}
            </span>
          </div>

          <ul v-if="item.reports.length" class="flex flex-col divide-y divide-line rounded-2xl border border-line">
            <li v-for="r in item.reports" :key="r.id" class="flex flex-col gap-1 px-4 py-3 text-sm">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="font-semibold">{{ REPORT_REASON_LABELS[r.reason] }}</span>
                <span class="text-xs text-muted">{{ r.reporterName }} · {{ dateFormat.format(new Date(r.createdAt)) }} · {{ statusLabel[r.status] }}</span>
              </div>
              <p v-if="r.details" class="leading-relaxed whitespace-pre-line text-subtle">{{ r.details }}</p>
            </li>
          </ul>

          <div class="mt-auto flex flex-wrap items-end gap-2 pt-1">
            <template v-if="!item.hiddenAt || item.hiddenReason === 'auto'">
              <div class="flex flex-col gap-1">
                <label :for="`reason-${item.setup.id}`" class="text-xs font-semibold text-subtle">Motif communiqué à l’auteur</label>
                <select
                  :id="`reason-${item.setup.id}`"
                  v-model="hideReasons[item.setup.id]"
                  class="h-9 rounded-xl border border-line-strong bg-white px-3 text-[13px]"
                >
                  <option v-for="r in reportReasons" :key="r" :value="r">{{ REPORT_REASON_LABELS[r] }}</option>
                </select>
              </div>
              <Button size="sm" class="bg-[#b3361f] text-white hover:bg-[#9a2e1a]" :disabled="!!busy" @click="moderate(item, 'hide')">
                <LoaderCircle v-if="busy === `${item.setup.id}:hide`" class="size-4 animate-spin" aria-hidden="true" />
                Masquer et prévenir l’auteur
              </Button>
            </template>
            <Button variant="outline" size="sm" :disabled="!!busy" @click="moderate(item, item.hiddenAt ? 'restore' : 'dismiss')">
              <LoaderCircle v-if="busy === `${item.setup.id}:restore` || busy === `${item.setup.id}:dismiss`" class="size-4 animate-spin" aria-hidden="true" />
              {{ item.hiddenAt ? 'Rétablir le setup' : 'Classer sans suite' }}
            </Button>
          </div>
        </div>
      </li>
    </ul>

    <section aria-labelledby="previews-title" class="flex flex-col gap-3 rounded-3xl border border-line bg-white p-6">
      <h2 id="previews-title" class="font-display text-xl font-bold">Aperçus manquants</h2>
      <p class="text-sm text-subtle">
        Setups publics sans aperçu PNG (démos, setups publiés avant leur premier passage dans l’éditeur).
        Ils sont rendus dans ce navigateur puis enregistrés ; garde l’onglet ouvert pendant la génération.
      </p>
      <ul v-if="missing.length" class="flex flex-wrap gap-2 text-sm">
        <li v-for="m in missing" :key="m.id" class="rounded-full bg-lilac px-3 py-1">{{ m.name }}</li>
      </ul>
      <PreviewGenerator :items="missing" @done="refreshMissing()" />
    </section>
  </main>
</template>
