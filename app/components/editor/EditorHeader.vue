<script setup lang="ts">
import { ArrowLeft, Box, Check, Code, Globe, LayoutGrid, Link, Lock, Redo2, Undo2 } from 'lucide-vue-next'
import { authClient } from '~/lib/auth-client'
import { useEditorStore } from '~/stores/editor'

defineProps<{ preview: boolean }>()
/** Mode d'affichage des objets : tout le catalogue, ou seulement ce qui est dans la scène. */
const mode = defineModel<'catalog' | 'scene'>('mode', { required: true })

const editor = useEditorStore()
const session = authClient.useSession()
const config = useRuntimeConfig()
const shareOpen = ref(false)
const copied = ref<'link' | 'embed' | null>(null)

const statusLabel = computed(() => ({
  idle: 'Brouillon',
  saving: 'Enregistrement…',
  saved: 'Enregistré',
  error: 'Échec de l’enregistrement',
})[editor.saveStatus])

const origin = computed(() => (import.meta.client ? window.location.origin : config.public.siteUrl))
const publicUrl = computed(() => `${origin.value}/setup/${editor.slug}`)
const embedCode = computed(
  () => `<iframe src="${origin.value}/embed/${editor.slug}?autorotate=true" width="100%" height="600" frameborder="0" allowfullscreen loading="lazy"></iframe>`,
)

const MODES = [
  { id: 'catalog', label: 'Catalogue', icon: LayoutGrid },
  { id: 'scene', label: 'Scène', icon: Box },
] as const

function onNameChange(e: Event) {
  editor.setMeta({ name: (e.target as HTMLInputElement).value })
}
async function publish(value: boolean) {
  editor.setMeta({ isPublic: value })
  await editor.save()
}
async function copy(text: string, kind: 'link' | 'embed') {
  await navigator.clipboard.writeText(text)
  copied.value = kind
  setTimeout(() => (copied.value = null), 1600)
}

const iconBtn = 'grid size-10 place-items-center rounded-desk-pill text-desk-ink transition-colors hover:bg-desk-surface-muted disabled:pointer-events-none disabled:opacity-35'
const softBtn = 'flex h-10 items-center justify-center gap-2 rounded-desk-pill bg-desk-surface-sunken px-4 text-sm font-semibold text-desk-ink'
</script>

<template>
  <header class="pointer-events-none flex flex-wrap items-center justify-between gap-3">
    <div class="pointer-events-auto flex flex-wrap items-center gap-2.5">
      <NuxtLink to="/dashboard" class="desk-float grid size-desk-control-lg place-items-center rounded-desk-pill text-desk-ink" aria-label="Retour à mes setups" title="Mes setups">
        <ArrowLeft class="size-[18px]" :stroke-width="2" />
      </NuxtLink>

      <div class="desk-float flex h-desk-control-lg items-center gap-2 rounded-desk-pill pr-4 pl-3">
        <AppLogo :size="22" />
        <input
          :value="editor.name"
          aria-label="Nom du setup"
          class="w-40 rounded-lg bg-transparent px-1.5 py-1 text-sm font-semibold text-desk-ink hover:bg-desk-surface-sunken focus:bg-desk-surface-sunken focus:outline-none"
          maxlength="80"
          @change="onNameChange"
        >
        <span class="text-desk-caption whitespace-nowrap" :class="editor.saveStatus === 'error' ? 'text-desk-danger' : 'text-desk-ink-muted'" role="status">
          {{ statusLabel }}
        </span>
      </div>

      <div v-if="!preview" role="tablist" aria-label="Mode d’affichage des objets" class="desk-float flex h-desk-control-lg items-center gap-1 rounded-desk-pill p-1">
        <button
          v-for="m in MODES"
          :key="m.id"
          type="button"
          role="tab"
          :aria-selected="mode === m.id"
          class="flex h-10 items-center gap-2 rounded-desk-pill px-4 text-sm font-semibold transition-colors"
          :class="mode === m.id ? 'bg-desk-active text-desk-on-active' : 'text-desk-ink hover:bg-desk-surface-muted'"
          @click="mode = m.id"
        >
          <component :is="m.icon" class="size-4" :stroke-width="1.8" />
          {{ m.label }}
          <span v-if="m.id === 'scene'" class="text-desk-caption opacity-70">{{ editor.scene.objects.length }}</span>
        </button>
      </div>
    </div>

    <div class="pointer-events-auto flex items-center gap-2.5">
      <div v-if="!preview" class="desk-float flex h-desk-control-lg items-center gap-0.5 rounded-desk-pill p-1">
        <button type="button" :class="iconBtn" aria-label="Annuler" title="Annuler (⌘Z)" :disabled="!editor.canUndo" @click="editor.undo()">
          <Undo2 class="size-[18px]" :stroke-width="1.8" />
        </button>
        <button type="button" :class="iconBtn" aria-label="Rétablir" title="Rétablir (⇧⌘Z)" :disabled="!editor.canRedo" @click="editor.redo()">
          <Redo2 class="size-[18px]" :stroke-width="1.8" />
        </button>
      </div>

      <div class="relative">
        <button
          type="button"
          class="h-desk-control-lg rounded-desk-pill bg-desk-active px-6 text-sm font-semibold text-desk-on-active shadow-desk-float"
          :aria-expanded="shareOpen"
          @click="shareOpen = !shareOpen"
        >
          {{ editor.isPublic ? 'Partager' : 'Publier' }}
        </button>
        <div
          v-if="shareOpen"
          class="desk-float absolute top-14 right-0 z-30 flex w-[360px] flex-col gap-4 rounded-desk-2xl p-5 text-desk-ink"
          role="dialog"
          aria-label="Publication et partage"
          @keydown.esc="shareOpen = false"
        >
          <div class="flex items-start gap-3">
            <span class="grid size-10 shrink-0 place-items-center rounded-desk-pill bg-desk-surface-sunken">
              <Globe v-if="editor.isPublic" class="size-[18px]" />
              <Lock v-else class="size-[18px] text-desk-ink-soft" />
            </span>
            <div class="flex flex-col gap-0.5">
              <span class="text-sm font-semibold">{{ editor.isPublic ? 'Setup public' : 'Setup privé' }}</span>
              <span class="text-[13px] leading-snug text-desk-ink-soft">
                {{ editor.isPublic ? 'Toute personne disposant du lien peut le voir et l’intégrer.' : 'Publie-le pour obtenir un lien public et un code d’intégration.' }}
              </span>
            </div>
          </div>

          <template v-if="editor.isPublic">
            <div class="flex flex-col gap-1.5">
              <span class="desk-overline">Lien public</span>
              <div class="flex gap-2">
                <input :value="publicUrl" readonly aria-label="Lien public" class="h-10 min-w-0 flex-1 rounded-desk-pill bg-desk-surface-sunken px-4 text-[13px] text-desk-ink">
                <button type="button" :class="[iconBtn, 'bg-desk-surface-sunken']" :aria-label="copied === 'link' ? 'Lien copié' : 'Copier le lien'" @click="copy(publicUrl, 'link')">
                  <Check v-if="copied === 'link'" class="size-4" />
                  <Link v-else class="size-4" />
                </button>
              </div>
            </div>
            <div class="flex flex-col gap-1.5">
              <span class="desk-overline">Code d’intégration</span>
              <pre class="max-h-28 overflow-auto rounded-desk-md bg-desk-surface-sunken p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-desk-ink">{{ embedCode }}</pre>
              <button type="button" :class="softBtn" @click="copy(embedCode, 'embed')">
                <Check v-if="copied === 'embed'" class="size-4" />
                <Code v-else class="size-4" />
                {{ copied === 'embed' ? 'Code copié' : 'Copier le code' }}
              </button>
            </div>
            <div class="flex gap-2">
              <a :href="publicUrl" target="_blank" rel="noopener" :class="[softBtn, 'flex-1']">Voir la page</a>
              <button type="button" :class="[softBtn, 'flex-1 bg-transparent text-desk-ink-soft']" @click="publish(false)">Retirer la publication</button>
            </div>
          </template>
          <button v-else type="button" class="h-11 rounded-desk-pill bg-desk-active text-sm font-semibold text-desk-on-active" @click="publish(true)">
            Publier ce setup
          </button>
        </div>
      </div>

      <UserMenu
        v-if="session.data?.user"
        :name="session.data.user.name"
        :email="session.data.user.email"
        :image="session.data.user.image"
      />
    </div>
  </header>
</template>
