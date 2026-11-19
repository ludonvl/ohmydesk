<script setup lang="ts">
import { ArrowRight, Box, Share2, Square } from 'lucide-vue-next'
import { roomThemes } from '#shared/themes'
import type { RoomThemeId } from '#shared/types/scene'
import type { GalleryPage, GallerySetup, LikeState } from '#shared/types/social'
import { createDefaultScene } from '#shared/utils/defaultScene'
import { Button } from '~/components/ui/button'

useSeoMeta({
  title: 'Oh My Desk — ton bureau, en version miniature',
  description: 'Recrée ton setup objet par objet en 3D isométrique, puis partage-le avec un lien ou intègre-le sur ton site.',
})

const heroScene = useState('hero-scene', () => createDefaultScene('studio'))

// Setups les plus aimés de la communauté (masqué s'il n'y en a pas encore).
const { data: community } = await useFetch<GalleryPage>('/api/gallery', { query: { sort: 'popular', limit: 3 } })
const communitySetups = computed(() => community.value?.items ?? [])
const { liked, set: setLiked } = useMyLikes(() => communitySetups.value.map((s) => s.id))
function onLike(item: GallerySetup, state: LikeState) {
  item.likeCount = state.likeCount
  setLiked(item.id, state.liked)
}
const templates = useState('template-scenes', () =>
  (['studio', 'neon', 'scandi'] as RoomThemeId[]).map((id) => ({ id, scene: createDefaultScene(id) })),
)

const templateStyles: Record<RoomThemeId, { card: string; text: string; sub: string }> = {
  studio: { card: 'bg-lilac border-line', text: 'text-ink', sub: 'text-subtle' },
  neon: { card: 'bg-[#1a1733] border-[#2d2760]', text: 'text-white', sub: 'text-[#c9c3ec]' },
  scandi: { card: 'bg-[#f1ece3] border-[#e5ddcf]', text: 'text-ink', sub: 'text-[#5b5547]' },
}

const steps = [
  { n: '01', icon: Square, bg: 'bg-[#ffe1d4]', title: 'Choisis ta pièce', text: 'Taille, murs, sol et ambiance. Ta base de départ en quelques secondes.' },
  { n: '02', icon: Box, bg: 'bg-[#e4e0ff]', title: 'Pose tes objets', text: 'Glisse écrans, claviers, plantes et figurines depuis le catalogue. Déplace, pivote, recolore.' },
  { n: '03', icon: Share2, bg: 'bg-[#d2f5e8]', title: 'Partage-le partout', text: 'Un lien public pour la galerie, une iframe pour ton blog ou ton portfolio.' },
]
</script>

<template>
  <div>
    <section class="mx-auto grid max-w-[1320px] grid-cols-1 items-center gap-10 px-6 pt-12 pb-18 lg:grid-cols-2">
      <div class="flex flex-col gap-7">
        <span class="flex h-8 items-center gap-2 self-start rounded-full border border-line bg-white px-3 text-[13px] font-semibold text-subtle">
          <span class="size-2 rotate-45 rounded-[2px] bg-tangerine" aria-hidden="true" />Éditeur 3D isométrique, dans le navigateur
        </span>
        <h1 class="font-display text-[clamp(48px,6vw,80px)] leading-[0.98] font-extrabold tracking-[-0.035em]">
          Ton bureau,<br>en version miniature.
        </h1>
        <p class="max-w-[520px] text-[19px] leading-relaxed text-subtle">
          Recrée ton setup objet par objet, ou invente celui dont tu rêves. Puis partage-le avec un simple lien, ou intègre-le directement sur ton site.
        </p>
        <div class="flex flex-wrap gap-3">
          <Button variant="accent" size="lg" as-child>
            <NuxtLink to="/editor/new">Créer mon setup<ArrowRight class="size-[18px]" /></NuxtLink>
          </Button>
          <Button variant="outline" size="lg" as-child>
            <NuxtLink to="/gallery">Explorer la galerie</NuxtLink>
          </Button>
        </div>
        <p class="text-sm text-muted">Aucune installation · Sauvegarde automatique · Lien public en un clic</p>
      </div>
      <div class="relative aspect-[6/5] w-full">
        <ClientOnly>
          <SceneCanvas :scene="heroScene" :options="{ mode: 'viewer', transparent: true, controls: true, zoom: false }" label="Exemple de setup en 3D">
            <template #loading><IsoPreview :scene="heroScene" /></template>
          </SceneCanvas>
          <template #fallback><IsoPreview :scene="heroScene" /></template>
        </ClientOnly>
      </div>
    </section>

    <section v-if="communitySetups.length" aria-labelledby="community-title" class="mx-auto max-w-[1320px] px-6 pt-6 pb-20">
      <div class="mb-7 flex flex-wrap items-end justify-between gap-6">
        <div class="flex max-w-[620px] flex-col gap-2.5">
          <h2 id="community-title" class="font-display text-[44px] leading-[1.05] font-extrabold tracking-[-0.025em]">Les coups de cœur de la galerie.</h2>
          <p class="text-[17px] leading-relaxed text-subtle">Les setups les plus aimés de la communauté. Remixe celui qui te ressemble.</p>
        </div>
        <NuxtLink to="/gallery?tri=populaires" class="text-[15px] font-semibold text-link">Voir toute la galerie →</NuxtLink>
      </div>
      <ul class="grid grid-cols-1 gap-5 md:grid-cols-3">
        <li v-for="item in communitySetups" :key="item.id">
          <SetupCard :setup="item" :liked="liked.has(item.id)" class="h-full" @like="onLike(item, $event)" />
        </li>
      </ul>
    </section>

    <section id="modeles" class="mx-auto max-w-[1320px] px-6 pt-6 pb-20">
      <div class="mb-7 flex flex-wrap items-end justify-between gap-6">
        <div class="flex max-w-[620px] flex-col gap-2.5">
          <h2 class="font-display text-[44px] leading-[1.05] font-extrabold tracking-[-0.025em]">Une pièce, trois ambiances.</h2>
          <p class="text-[17px] leading-relaxed text-subtle">
            Pars d’un modèle et change tout : murs, sol, couleurs, matières. Chaque objet garde sa place, seule l’ambiance bascule.
          </p>
        </div>
      </div>
      <div class="grid grid-cols-1 gap-5 md:grid-cols-3">
        <NuxtLink
          v-for="t in templates"
          :key="t.id"
          :to="`/editor/new?template=${t.id}`"
          class="flex flex-col gap-4 rounded-3xl border p-4 pb-5 transition-transform hover:-translate-y-0.5"
          :class="templateStyles[t.id].card"
        >
          <div class="aspect-[4/3] w-full p-2"><IsoPreview :scene="t.scene" :label="`Modèle ${roomThemes[t.id].label}`" /></div>
          <div class="flex items-center justify-between px-1.5">
            <span class="flex flex-col gap-0.5">
              <span class="font-display text-[22px] font-bold" :class="templateStyles[t.id].text">{{ roomThemes[t.id].label }}</span>
              <span class="text-sm" :class="templateStyles[t.id].sub">{{ roomThemes[t.id].description }}</span>
            </span>
            <span class="text-sm font-semibold" :class="templateStyles[t.id].text">Utiliser →</span>
          </div>
        </NuxtLink>
      </div>
    </section>

    <section class="mx-auto max-w-[1320px] px-6 pt-6 pb-22">
      <h2 class="mb-8 font-display text-[44px] leading-[1.05] font-extrabold tracking-[-0.025em]">Comme décorer sa base dans un jeu.</h2>
      <div class="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div v-for="s in steps" :key="s.n" class="flex flex-col gap-3.5 rounded-3xl border border-line bg-white p-7">
          <span class="grid size-[52px] place-items-center rounded-2xl" :class="s.bg"><component :is="s.icon" class="size-6" aria-hidden="true" /></span>
          <span class="text-[13px] font-bold text-muted">{{ s.n }}</span>
          <h3 class="font-display text-2xl leading-tight font-bold">{{ s.title }}</h3>
          <p class="leading-relaxed text-subtle">{{ s.text }}</p>
        </div>
      </div>
    </section>

    <section id="integrer" class="mx-auto max-w-[1320px] px-6 pb-22">
      <div class="grid grid-cols-1 items-center gap-12 rounded-[32px] bg-ink p-8 text-white md:p-14 lg:grid-cols-2">
        <div class="flex flex-col gap-5">
          <span class="self-start rounded-full bg-mint px-3 py-1 text-[13px] font-bold text-ink">Viewer embarqué</span>
          <h2 class="font-display text-[44px] leading-[1.05] font-extrabold tracking-[-0.025em]">Ton setup, vivant, sur ton propre site.</h2>
          <p class="text-[17px] leading-relaxed text-[#c8c4d8]">
            Une ligne de code. Fond transparent, rotation automatique, caméra verrouillée : tout se règle dans l’URL.
          </p>
          <pre class="overflow-x-auto rounded-2xl border border-chrome-line bg-[#0e0d15] p-5 font-mono text-sm leading-7 whitespace-pre-wrap text-chrome-text"><span class="text-lavender">&lt;iframe</span>
  <span class="text-mint">src</span>=<span class="text-sun">"/embed/mon-bureau?transparent=true&amp;autorotate=true"</span>
  <span class="text-mint">width</span>=<span class="text-sun">"100%"</span> <span class="text-mint">height</span>=<span class="text-sun">"600"</span>
  <span class="text-mint">loading</span>=<span class="text-sun">"lazy"</span><span class="text-lavender">&gt;&lt;/iframe&gt;</span></pre>
          <div class="flex flex-wrap gap-2">
            <code v-for="p in ['transparent', 'autorotate', 'controls', 'zoom', 'angle']" :key="p" class="rounded-lg border border-[#3a3848] px-2.5 py-1.5 font-mono text-[13px] text-chrome-text">{{ p }}</code>
          </div>
        </div>
        <div class="aspect-[5/4] w-full">
          <IsoPreview :scene="templates[1]!.scene" label="Aperçu du viewer embarqué" />
        </div>
      </div>
    </section>
  </div>
</template>
