<script setup lang="ts">
import { CalendarDays, Heart, LayoutGrid, Pencil } from 'lucide-vue-next'
import type { GallerySetup, LikeState, OwnProfile, PublicProfile } from '#shared/types/social'
import { Button } from '~/components/ui/button'
import { authClient } from '~/lib/auth-client'

const route = useRoute()
const username = computed(() => String(route.params.username).toLowerCase())

// `/u/me` : raccourci vers son propre profil (menu du compte).
if (username.value === 'me') {
  const own = await useFetch<OwnProfile>('/api/profile', { headers: useRequestHeaders(['cookie']) })
  if (own.data.value) await navigateTo(`/u/${own.data.value.username}`, { replace: true })
  else await navigateTo({ path: '/login', query: { redirect: '/u/me' } }, { replace: true })
}

const { data: profile, error } = await useFetch<PublicProfile>(() => `/api/users/${username.value}`)
if (username.value !== 'me' && (error.value || !profile.value)) {
  throw createError({ statusCode: 404, statusMessage: 'Profil introuvable', fatal: true })
}

const { data: session } = await authClient.useSession(useFetch)
const isOwner = ref(false)
// L'identifiant n'est pas dans la session : on compare côté client avec /api/profile, sans bloquer le rendu.
onMounted(async () => {
  if (!session.value?.user) return
  try {
    const own = await $fetch<OwnProfile>('/api/profile')
    isOwner.value = own.username === profile.value?.username
  } catch {
    isOwner.value = false
  }
})

const origin = useRequestURL().origin || useRuntimeConfig().public.siteUrl
useSeoMeta({
  title: () => `${profile.value?.name} (@${profile.value?.username}) · Oh My Desk`,
  description: () => profile.value?.bio || `Les setups de bureau en 3D de ${profile.value?.name} sur Oh My Desk.`,
  ogTitle: () => profile.value?.name,
  ogImage: () => {
    const url = profile.value?.setups.find((s) => s.previewUrl)?.previewUrl
    return url?.startsWith('/') ? `${origin}${url}` : url
  },
})

const setups = computed<GallerySetup[]>(() => profile.value?.setups ?? [])
const { liked, set: setLiked } = useMyLikes(() => setups.value.map((s) => s.id))
function onLike(item: GallerySetup, state: LikeState) {
  if (profile.value) profile.value.likesReceived += state.likeCount - item.likeCount
  item.likeCount = state.likeCount
  setLiked(item.id, state.liked)
}

const joined = computed(() =>
  profile.value ? new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(profile.value.joinedAt)) : '',
)
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`
</script>

<template>
  <main v-if="profile" class="mx-auto max-w-[1320px] px-6 pt-6 pb-24">
    <section class="mb-10 flex flex-wrap items-start gap-6 rounded-3xl border border-line bg-white p-7 md:p-9">
      <UserAvatar :name="profile.name" :image="profile.image" :size="88" />
      <div class="flex min-w-0 flex-[1_1_320px] flex-col gap-3">
        <div class="flex flex-col gap-0.5">
          <h1 class="font-display text-[36px] leading-tight font-extrabold tracking-tight break-words">{{ profile.name }}</h1>
          <p class="text-[15px] text-muted">@{{ profile.username }}</p>
        </div>
        <p v-if="profile.bio" class="max-w-[640px] leading-relaxed text-subtle">{{ profile.bio }}</p>
        <p v-else-if="isOwner" class="text-[15px] text-muted">Ajoute une bio pour te présenter aux visiteurs.</p>
        <ul class="flex flex-wrap gap-x-5 gap-y-2 text-sm text-subtle">
          <li class="flex items-center gap-1.5"><LayoutGrid class="size-4" aria-hidden="true" />{{ plural(profile.setupCount, 'setup public', 'setups publics') }}</li>
          <li class="flex items-center gap-1.5"><Heart class="size-4" aria-hidden="true" />{{ plural(profile.likesReceived, 'j’aime reçu', 'j’aime reçus') }}</li>
          <li class="flex items-center gap-1.5"><CalendarDays class="size-4" aria-hidden="true" />Membre depuis {{ joined }}</li>
        </ul>
      </div>
      <Button v-if="isOwner" variant="outline" as-child>
        <NuxtLink to="/settings#profil"><Pencil class="size-4" />Modifier mon profil</NuxtLink>
      </Button>
    </section>

    <h2 class="mb-5 font-display text-2xl font-bold">Setups publiés</h2>
    <div v-if="setups.length === 0" class="rounded-3xl border border-dashed border-line-strong bg-white px-8 py-14 text-center">
      <p class="font-semibold">{{ isOwner ? 'Tu n’as encore rien publié.' : `${profile.name} n’a encore rien publié.` }}</p>
      <p v-if="isOwner" class="mt-2 text-subtle">
        Ouvre un setup depuis <NuxtLink to="/dashboard" class="font-semibold text-link">Mes setups</NuxtLink> et clique sur « Publier ».
      </p>
    </div>
    <ul v-else class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="item in setups" :key="item.id">
        <SetupCard :setup="item" :liked="liked.has(item.id)" :show-author="false" class="h-full" @like="onLike(item, $event)" />
      </li>
    </ul>
  </main>
</template>
