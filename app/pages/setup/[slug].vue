<script setup lang="ts">
import { Check, ChevronRight, Code, Copy, Flag, Hand, Link, Maximize, Rotate3d, ZoomIn, ZoomOut } from 'lucide-vue-next'
import { getCatalogItem, getCategoryName } from '#shared/catalog/items'
import type { SetupWithScene } from '#shared/types/scene'
import type { LikeState } from '#shared/types/social'
import { Button } from '~/components/ui/button'

interface CanvasApi {
  rotateCamera: (deg: number) => void
  zoomBy: (factor: number) => void
}

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const { data: setup, error } = await useFetch<SetupWithScene>(() => `/api/public/setups/${slug.value}`)
if (error.value || !setup.value) {
  throw createError({ statusCode: 404, statusMessage: 'Setup introuvable', fatal: true })
}

const config = useRuntimeConfig()
const requestUrl = useRequestURL()
const origin = computed(() => (import.meta.client ? window.location.origin : requestUrl.origin || config.public.siteUrl))

// Les réseaux sociaux exigent une URL absolue (le stockage local de développement renvoie un chemin `/blob/…`).
const ogImage = computed(() => {
  const url = setup.value?.previewUrl
  if (!url) return undefined
  return url.startsWith('/') ? `${requestUrl.origin || config.public.siteUrl}${url}` : url
})

useSeoMeta({
  title: () => `${setup.value?.name} · Oh My Desk`,
  description: () => setup.value?.description || 'Un setup de bureau en 3D isométrique.',
  ogTitle: () => setup.value?.name,
  ogDescription: () => setup.value?.description,
  ogImage,
  ogImageWidth: () => (ogImage.value ? 1200 : undefined),
  ogImageHeight: () => (ogImage.value ? 900 : undefined),
  ogImageAlt: () => (ogImage.value ? `Aperçu 3D du setup ${setup.value?.name}` : undefined),
  twitterCard: () => (ogImage.value ? 'summary_large_image' : 'summary'),
})

const canvas = ref<CanvasApi | null>(null)
const stage = ref<HTMLElement | null>(null)
const autoRotate = ref(false)
const highlighted = ref<string | null>(null)
const embedOpen = ref(false)
const reportOpen = ref(false)
const copied = ref<'link' | 'embed' | null>(null)

const items = computed(() => {
  const groups = new Map<string, { catalogId: string; firstId: string; count: number; color: string }>()
  for (const obj of setup.value?.scene.objects ?? []) {
    const existing = groups.get(obj.catalogId)
    if (existing) {
      existing.count++
      continue
    }
    const item = getCatalogItem(obj.catalogId)
    const mainSlot = item?.materials.find((m) => m.customizable)
    const color = (mainSlot && (obj.colors[mainSlot.slot] ?? mainSlot.default)) ?? '#cccccc'
    groups.set(obj.catalogId, { catalogId: obj.catalogId, firstId: obj.id, count: 1, color })
  }
  return [...groups.values()].map((g) => {
    const item = getCatalogItem(g.catalogId)
    return { ...g, name: item?.name ?? g.catalogId, category: item ? getCategoryName(item.category) : '' }
  })
})

const embedCode = computed(
  () => `<iframe src="${origin.value}/embed/${slug.value}?autorotate=true" width="100%" height="600" frameborder="0" allowfullscreen loading="lazy"></iframe>`,
)

async function copy(text: string, kind: 'link' | 'embed') {
  await navigator.clipboard.writeText(text)
  copied.value = kind
  setTimeout(() => (copied.value = null), 1600)
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen()
  else stage.value?.requestFullscreen()
}

const publishedLabel = computed(() =>
  setup.value?.publishedAt
    ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(setup.value.publishedAt))
    : '',
)
// Les likes de la personne connectée sont lus côté client : la page reste en cache pour tout le monde.
const { liked, set: setLiked } = useMyLikes(() => (setup.value ? [setup.value.id] : []))
function onLike(state: LikeState) {
  if (!setup.value) return
  setup.value.likeCount = state.likeCount
  setLiked(setup.value.id, state.liked)
}
</script>

<template>
  <main v-if="setup" class="mx-auto flex max-w-[1320px] flex-wrap gap-6 px-6 pt-2 pb-12">
    <section
      ref="stage"
      aria-label="Scène 3D"
      class="relative min-h-[560px] min-w-0 flex-[999_1_640px] overflow-hidden rounded-3xl border border-line bg-lilac"
    >
      <ClientOnly>
        <SceneCanvas
          ref="canvas"
          :scene="setup.scene"
          :selected-id="highlighted"
          :options="{ mode: 'viewer', autoRotate, controls: true, zoom: true }"
          :label="`Scène 3D du setup ${setup.name}`"
          @object-click="highlighted = $event"
        >
          <template #loading>
            <div class="h-[78%] w-[78%]"><IsoPreview :scene="setup.scene" /></div>
          </template>
        </SceneCanvas>
        <template #fallback>
          <div class="absolute inset-0 grid place-items-center">
            <div class="h-[78%] w-[78%]"><IsoPreview :scene="setup.scene" /></div>
          </div>
        </template>
      </ClientOnly>

      <span class="pointer-events-none absolute top-4 left-4 flex h-[34px] items-center gap-2 rounded-full border border-line bg-white px-3 text-[13px] font-medium text-subtle">
        <Hand class="size-[15px]" aria-hidden="true" />Glisse pour tourner, molette pour zoomer
      </span>

      <div class="absolute bottom-4 left-4 flex h-11 items-center gap-2.5 rounded-[14px] border border-line bg-white pr-3.5 pl-2">
        <button
          role="switch"
          :aria-checked="autoRotate"
          aria-label="Rotation automatique"
          class="relative h-[26px] w-11 rounded-full transition-colors"
          :class="autoRotate ? 'bg-ink' : 'bg-[#c9c3d8]'"
          @click="autoRotate = !autoRotate"
        >
          <span class="absolute top-[3px] size-5 rounded-full bg-white shadow transition-[left]" :class="autoRotate ? 'left-[21px]' : 'left-[3px]'" />
        </button>
        <span class="text-[13px] font-medium">Rotation auto</span>
      </div>

      <div role="toolbar" aria-label="Contrôles de la caméra" class="absolute right-4 bottom-4 flex gap-0.5 rounded-[14px] border border-line bg-white p-1">
        <Button variant="ghost" size="icon" aria-label="Pivoter la caméra" title="Pivoter la caméra" @click="canvas?.rotateCamera(90)"><Rotate3d class="size-[19px]" /></Button>
        <Button variant="ghost" size="icon" aria-label="Dézoomer" title="Dézoomer" @click="canvas?.zoomBy(1 / 1.2)"><ZoomOut class="size-[19px]" /></Button>
        <Button variant="ghost" size="icon" aria-label="Zoomer" title="Zoomer" @click="canvas?.zoomBy(1.2)"><ZoomIn class="size-[19px]" /></Button>
        <Button variant="ghost" size="icon" aria-label="Plein écran" title="Plein écran" @click="toggleFullscreen"><Maximize class="size-[19px]" /></Button>
      </div>
    </section>

    <aside class="flex max-w-[460px] min-w-0 flex-[1_1_360px] flex-col gap-5">
      <div class="flex items-center gap-3">
        <UserAvatar :name="setup.authorName" :image="setup.authorImage" :size="44" />
        <div class="flex flex-col">
          <NuxtLink v-if="setup.authorUsername" :to="`/u/${setup.authorUsername}`" class="font-semibold hover:text-link">{{ setup.authorName }}</NuxtLink>
          <span v-else class="font-semibold">{{ setup.authorName }}</span>
          <span v-if="publishedLabel" class="text-[13px] text-muted">Publié le {{ publishedLabel }}</span>
        </div>
      </div>
      <div class="flex flex-col gap-2.5">
        <h1 class="font-display text-[44px] leading-[1.02] font-extrabold tracking-tight">{{ setup.name }}</h1>
        <p v-if="setup.description" class="leading-relaxed text-subtle">{{ setup.description }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button as-child size="default" class="h-[46px]">
          <NuxtLink :to="`/editor/new?from=${setup.slug}`"><Copy class="size-[17px]" />Remixer ce setup</NuxtLink>
        </Button>
        <LikeButton :setup-id="setup.id" :setup-name="setup.name" :liked="liked.has(setup.id)" :count="setup.likeCount" size="lg" @change="onLike" />
        <Button variant="outline" size="icon" class="size-[46px]" :aria-label="copied === 'link' ? 'Lien copié' : 'Copier le lien'" :title="copied === 'link' ? 'Lien copié' : 'Copier le lien'" @click="copy(`${origin}/setup/${setup.slug}`, 'link')">
          <Check v-if="copied === 'link'" class="size-[19px] text-[#2f9e78]" />
          <Link v-else class="size-[19px]" />
        </Button>
        <Button variant="outline" size="icon" class="size-[46px]" aria-label="Obtenir le code d’intégration" title="Intégrer" :aria-expanded="embedOpen" @click="embedOpen = !embedOpen">
          <Code class="size-[19px]" />
        </Button>
      </div>

      <div v-if="embedOpen" class="flex flex-col gap-2 rounded-2xl border border-line bg-white p-4">
        <span class="text-sm font-semibold">Intégrer sur ton site</span>
        <pre class="overflow-auto rounded-xl bg-ink p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-chrome-text">{{ embedCode }}</pre>
        <p class="text-xs text-muted">Paramètres : <code>transparent</code>, <code>autorotate</code>, <code>controls</code>, <code>zoom</code>.</p>
        <Button variant="outline" size="sm" @click="copy(embedCode, 'embed')">
          <Check v-if="copied === 'embed'" class="size-4" />
          {{ copied === 'embed' ? 'Code copié' : 'Copier le code' }}
        </Button>
      </div>

      <section class="rounded-[20px] border border-line bg-white p-2">
        <div class="flex items-baseline justify-between px-3 pt-3 pb-2">
          <h2 class="font-display text-lg font-bold">Dans ce setup</h2>
          <span class="text-[13px] text-muted">{{ setup.scene.objects.length }} objets</span>
        </div>
        <ul>
          <li v-for="item in items" :key="item.catalogId">
            <button
              class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-[#f4f1fa]"
              :class="highlighted === item.firstId ? 'bg-[#f4f1fa]' : ''"
              :aria-pressed="highlighted === item.firstId"
              @click="highlighted = highlighted === item.firstId ? null : item.firstId"
            >
              <span class="grid size-9 place-items-center rounded-[10px] bg-[#f4f1ea]" aria-hidden="true">
                <span class="size-3.5 rotate-45 rounded" :style="{ background: item.color }" />
              </span>
              <span class="flex flex-1 flex-col">
                <span class="text-sm font-semibold">{{ item.name }}<span v-if="item.count > 1" class="font-normal text-muted"> × {{ item.count }}</span></span>
                <span class="text-[12.5px] text-muted">{{ item.category }}</span>
              </span>
              <ChevronRight class="size-4 text-[#8c88a0]" aria-hidden="true" />
            </button>
          </li>
        </ul>
      </section>
      <ReportPanel v-if="reportOpen" :setup-id="setup.id" :setup-name="setup.name" @close="reportOpen = false" />
      <button
        v-else
        type="button"
        class="flex items-center gap-1.5 self-start rounded-lg px-1 py-1 text-[13px] font-medium text-muted hover:text-ink"
        @click="reportOpen = true"
      >
        <Flag class="size-3.5" aria-hidden="true" />Signaler ce setup
      </button>
    </aside>
  </main>
</template>
