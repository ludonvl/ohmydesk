<script setup lang="ts">
import { LoaderCircle, Plus } from 'lucide-vue-next'
import type { GalleryPage, GallerySetup, GallerySort, LikeState } from '#shared/types/social'
import { Button } from '~/components/ui/button'

useSeoMeta({
  title: 'Galerie · Oh My Desk',
  description: 'Les setups de bureau en 3D partagés par la communauté Oh My Desk. Inspire-toi, aime, remixe.',
  ogTitle: 'Galerie Oh My Desk',
})

const route = useRoute()

/** Tri dans l'URL (`?tri=populaires`) pour que la vue se partage et survive au rechargement. */
const sort = computed<GallerySort>(() => (route.query.tri === 'populaires' ? 'popular' : 'recent'))
const tabs: { id: GallerySort; label: string; query: Record<string, string> }[] = [
  { id: 'recent', label: 'Récents', query: {} },
  { id: 'popular', label: 'Populaires', query: { tri: 'populaires' } },
]

const { data, status, error, refresh } = await useFetch<GalleryPage>('/api/gallery', {
  query: { sort },
  watch: [sort],
})

const items = ref<GallerySetup[]>([])
const page = ref(1)
const hasMore = ref(false)
watch(
  data,
  (value) => {
    items.value = value ? [...value.items] : []
    page.value = value?.page ?? 1
    hasMore.value = value?.hasMore ?? false
  },
  { immediate: true },
)

const loadingMore = ref(false)
const loadMoreError = ref('')
async function loadMore() {
  loadingMore.value = true
  loadMoreError.value = ''
  try {
    const next = await $fetch<GalleryPage>('/api/gallery', { query: { sort: sort.value, page: page.value + 1 } })
    const seen = new Set(items.value.map((i) => i.id))
    items.value.push(...next.items.filter((i) => !seen.has(i.id)))
    page.value = next.page
    hasMore.value = next.hasMore
  } catch {
    loadMoreError.value = 'Impossible de charger la suite. Réessaie.'
  } finally {
    loadingMore.value = false
  }
}

const { liked, set: setLiked } = useMyLikes(() => items.value.map((i) => i.id))
function onLike(item: GallerySetup, state: LikeState) {
  item.likeCount = state.likeCount
  setLiked(item.id, state.liked)
}
</script>

<template>
  <main class="mx-auto max-w-[1320px] px-6 pt-6 pb-24">
    <div class="mb-8 flex flex-wrap items-end justify-between gap-6">
      <div class="flex max-w-[640px] flex-col gap-2">
        <h1 class="font-display text-[44px] leading-[1.05] font-extrabold tracking-[-0.025em]">Galerie</h1>
        <p class="text-[17px] leading-relaxed text-subtle">Les setups partagés par la communauté. Aime ceux qui t’inspirent, remixe-les pour en faire le tien.</p>
      </div>
      <nav aria-label="Trier les setups" class="flex gap-1 rounded-[14px] border border-line bg-white p-1">
        <NuxtLink
          v-for="tab in tabs"
          :key="tab.id"
          :to="{ query: tab.query }"
          replace
          :aria-current="sort === tab.id ? 'page' : undefined"
          class="flex h-9 items-center rounded-[10px] px-4 text-sm font-semibold transition-colors"
          :class="sort === tab.id ? 'bg-ink text-white' : 'text-subtle hover:bg-lilac hover:text-ink'"
        >
          {{ tab.label }}
        </NuxtLink>
      </nav>
    </div>

    <div v-if="error" class="rounded-3xl border border-line bg-white p-8 text-center">
      <p class="font-semibold">La galerie n’a pas pu être chargée.</p>
      <Button variant="outline" class="mt-4" @click="refresh()">Réessayer</Button>
    </div>

    <div
      v-else-if="status !== 'pending' && items.length === 0"
      class="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-line-strong bg-white px-8 py-16 text-center"
    >
      <h2 class="font-display text-2xl font-bold">Aucun setup publié pour l’instant</h2>
      <p class="max-w-md text-subtle">Sois la première personne à partager le sien : crée ta pièce, puis clique sur « Publier » dans l’éditeur.</p>
      <Button variant="accent" size="lg" as-child>
        <NuxtLink to="/editor/new"><Plus class="size-[18px]" />Créer mon setup</NuxtLink>
      </Button>
    </div>

    <template v-else>
      <ul class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" :aria-busy="status === 'pending'">
        <li v-for="item in items" :key="item.id">
          <SetupCard :setup="item" :liked="liked.has(item.id)" class="h-full" @like="onLike(item, $event)" />
        </li>
      </ul>
      <div v-if="hasMore || loadMoreError" class="mt-10 flex flex-col items-center gap-3">
        <p v-if="loadMoreError" role="alert" class="text-sm text-[#b3361f]">{{ loadMoreError }}</p>
        <Button variant="outline" size="lg" :disabled="loadingMore" :aria-busy="loadingMore" @click="loadMore">
          <LoaderCircle v-if="loadingMore" class="size-4 animate-spin" aria-hidden="true" />
          Afficher plus de setups
        </Button>
      </div>
    </template>
  </main>
</template>
