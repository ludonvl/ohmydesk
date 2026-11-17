<script setup lang="ts">
import { Check, Code, Eye, EyeOff, Globe, Link, Lock, Redo2, Share2, Undo2 } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { authClient } from '~/lib/auth-client'
import { useEditorStore } from '~/stores/editor'

defineProps<{ preview: boolean }>()
const emit = defineEmits<{ togglePreview: [] }>()

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
const statusColor = computed(() => ({ idle: '#A9A5BD', saving: '#FFCF5A', saved: '#4CC9A0', error: '#FF7A7A' })[editor.saveStatus])

const origin = computed(() => (import.meta.client ? window.location.origin : config.public.siteUrl))
const publicUrl = computed(() => `${origin.value}/setup/${editor.slug}`)
const embedCode = computed(
  () => `<iframe src="${origin.value}/embed/${editor.slug}?autorotate=true" width="100%" height="600" frameborder="0" allowfullscreen loading="lazy"></iframe>`,
)

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
</script>

<template>
  <header class="relative flex min-h-14 flex-wrap items-center gap-3 border-b border-chrome-line px-4 py-2">
    <NuxtLink to="/" class="flex items-center gap-2.5 text-chrome-text">
      <AppLogo :size="26" dark />
      <span class="font-display text-[17px] font-extrabold tracking-tight">Oh My Desk</span>
    </NuxtLink>
    <div class="h-6 w-px bg-chrome-line" aria-hidden="true" />
    <input
      :value="editor.name"
      aria-label="Nom du setup"
      class="w-56 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-[15px] font-semibold text-chrome-text hover:border-chrome-line focus:border-chrome-line focus:outline-none"
      maxlength="80"
      @change="onNameChange"
    >
    <span class="flex items-center gap-1.5 text-[13px] text-chrome-muted" role="status">
      <span class="size-[7px] rounded-full" :style="{ background: statusColor }" aria-hidden="true" />
      {{ statusLabel }}
    </span>

    <div class="flex-1" />

    <div class="flex items-center gap-1">
      <Button variant="chrome-ghost" size="icon-sm" aria-label="Annuler" title="Annuler (⌘Z)" :disabled="!editor.canUndo" @click="editor.undo()">
        <Undo2 class="size-[18px]" />
      </Button>
      <Button variant="chrome-ghost" size="icon-sm" aria-label="Rétablir" title="Rétablir (⇧⌘Z)" :disabled="!editor.canRedo" @click="editor.redo()">
        <Redo2 class="size-[18px]" />
      </Button>
    </div>

    <Button variant="chrome" size="sm" class="h-10 px-3.5" :aria-pressed="preview" @click="emit('togglePreview')">
      <EyeOff v-if="preview" class="size-4" />
      <Eye v-else class="size-4" />
      {{ preview ? 'Quitter l’aperçu' : 'Aperçu' }}
    </Button>

    <div class="relative">
      <Button variant="accent" size="sm" class="h-10 px-4" :aria-expanded="shareOpen" @click="shareOpen = !shareOpen">
        <Share2 class="size-4" />
        {{ editor.isPublic ? 'Partager' : 'Publier' }}
      </Button>
      <div
        v-if="shareOpen"
        class="absolute top-12 right-0 z-30 flex w-[360px] flex-col gap-4 rounded-2xl border border-chrome-line bg-chrome-panel p-4 text-chrome-text shadow-2xl"
        role="dialog"
        aria-label="Publication et partage"
        @keydown.esc="shareOpen = false"
      >
        <div class="flex items-start gap-3">
          <span class="grid size-9 shrink-0 place-items-center rounded-xl bg-chrome-raised">
            <Globe v-if="editor.isPublic" class="size-[18px] text-mint" />
            <Lock v-else class="size-[18px] text-chrome-muted" />
          </span>
          <div class="flex flex-col gap-0.5">
            <span class="text-sm font-semibold">{{ editor.isPublic ? 'Setup public' : 'Setup privé' }}</span>
            <span class="text-[13px] leading-snug text-chrome-muted">
              {{ editor.isPublic ? 'Toute personne disposant du lien peut le voir et l’intégrer.' : 'Publie-le pour obtenir un lien public et un code d’intégration.' }}
            </span>
          </div>
        </div>

        <template v-if="editor.isPublic">
          <div class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-chrome-muted">Lien public</span>
            <div class="flex gap-2">
              <input :value="publicUrl" readonly aria-label="Lien public" class="h-10 min-w-0 flex-1 rounded-lg border border-chrome-line bg-chrome-raised px-3 text-[13px] text-chrome-text">
              <Button variant="chrome" size="icon-sm" :aria-label="copied === 'link' ? 'Lien copié' : 'Copier le lien'" @click="copy(publicUrl, 'link')">
                <Check v-if="copied === 'link'" class="size-4 text-mint" />
                <Link v-else class="size-4" />
              </Button>
            </div>
          </div>
          <div class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-chrome-muted">Code d’intégration</span>
            <pre class="max-h-28 overflow-auto rounded-lg border border-chrome-line bg-[#0e0d15] p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-chrome-text">{{ embedCode }}</pre>
            <Button variant="chrome" size="sm" @click="copy(embedCode, 'embed')">
              <Check v-if="copied === 'embed'" class="size-4 text-mint" />
              <Code v-else class="size-4" />
              {{ copied === 'embed' ? 'Code copié' : 'Copier le code' }}
            </Button>
          </div>
          <div class="flex gap-2">
            <Button variant="chrome" size="sm" class="flex-1" as-child>
              <a :href="publicUrl" target="_blank" rel="noopener">Voir la page</a>
            </Button>
            <Button variant="chrome-ghost" size="sm" class="flex-1" @click="publish(false)">Retirer la publication</Button>
          </div>
        </template>
        <Button v-else variant="accent" @click="publish(true)">Publier ce setup</Button>
      </div>
    </div>

    <UserMenu
      v-if="session.data?.user"
      :name="session.data.user.name"
      :email="session.data.user.email"
      :image="session.data.user.image"
      dark
    />
  </header>
</template>
