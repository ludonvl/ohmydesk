<script setup lang="ts">
import { Eye, Globe, Lock, Plus, Trash2 } from 'lucide-vue-next'
import { roomThemes } from '#shared/themes'
import type { RoomThemeId, SetupWithScene } from '#shared/types/scene'
import { Button } from '~/components/ui/button'

definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Mes setups · Oh My Desk', robots: 'noindex' })

// En SSR, on transmet le cookie de session à l'API.
const { data: setups, status, error, refresh } = await useFetch<SetupWithScene[]>('/api/setups', {
  headers: useRequestHeaders(['cookie']),
  default: () => [],
})

const confirmingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const deleteError = ref('')

const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

async function remove(setup: SetupWithScene) {
  deletingId.value = setup.id
  deleteError.value = ''
  try {
    await $fetch(`/api/setups/${setup.id}`, { method: 'DELETE' })
    confirmingId.value = null
    await refresh()
  } catch {
    deleteError.value = `« ${setup.name} » n’a pas pu être supprimé. Réessaie dans un instant.`
  } finally {
    deletingId.value = null
  }
}

const templates = Object.values(roomThemes).map((t) => ({ id: t.id as RoomThemeId, label: t.label, swatch: t.swatch, wall: t.wall, floor: t.floor }))
</script>

<template>
  <main class="mx-auto max-w-[1320px] px-6 pt-6 pb-24">
    <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div class="flex flex-col gap-1.5">
        <h1 class="font-display text-[40px] leading-tight font-extrabold tracking-tight">Mes setups</h1>
        <p class="text-subtle">Tes pièces, brouillons et setups publiés.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button v-for="t in templates" :key="t.id" variant="outline" as-child>
          <NuxtLink :to="`/editor/new?template=${t.id}`">
            <span class="flex h-4 w-6 overflow-hidden rounded-sm" aria-hidden="true">
              <span class="flex-1" :style="{ background: t.wall }" /><span class="flex-1" :style="{ background: t.floor }" /><span class="w-1.5" :style="{ background: t.swatch }" />
            </span>
            {{ t.label }}
          </NuxtLink>
        </Button>
      </div>
    </div>

    <p v-if="deleteError" role="alert" class="mb-4 rounded-xl bg-[#fdecea] px-4 py-3 text-sm text-[#8f2a17]">{{ deleteError }}</p>

    <div v-if="error" class="rounded-3xl border border-line bg-white p-8 text-center">
      <p class="font-semibold">Impossible de charger tes setups.</p>
      <Button variant="outline" class="mt-4" @click="refresh()">Réessayer</Button>
    </div>

    <div v-else-if="status !== 'pending' && setups.length === 0" class="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-line-strong bg-white px-8 py-16 text-center">
      <h2 class="font-display text-2xl font-bold">Ta première pièce t’attend</h2>
      <p class="max-w-md text-subtle">Choisis une ambiance pour commencer avec un bureau déjà meublé, puis personnalise chaque objet.</p>
      <Button variant="accent" size="lg" as-child>
        <NuxtLink to="/editor/new?template=studio"><Plus class="size-[18px]" />Créer mon premier setup</NuxtLink>
      </Button>
    </div>

    <ul v-else class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="s in setups" :key="s.id" class="flex flex-col overflow-hidden rounded-3xl border border-line bg-white">
        <NuxtLink
          :to="`/editor/${s.id}`"
          class="block aspect-[4/3] overflow-hidden bg-lilac"
          :class="s.previewUrl ? '' : 'p-4'"
          :aria-label="`Ouvrir ${s.name} dans l’éditeur`"
        >
          <img
            v-if="s.previewUrl"
            :src="s.previewUrl"
            :alt="`Aperçu de ${s.name}`"
            width="1200"
            height="900"
            loading="lazy"
            decoding="async"
            class="h-full w-full object-cover"
          >
          <IsoPreview v-else :scene="s.scene" :label="`Aperçu de ${s.name}`" />
        </NuxtLink>
        <div class="flex flex-1 flex-col gap-3 p-5">
          <div class="flex items-start justify-between gap-3">
            <NuxtLink :to="`/editor/${s.id}`" class="font-display text-xl leading-tight font-bold hover:text-link">{{ s.name }}</NuxtLink>
            <span
              class="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
              :class="s.isPublic ? 'bg-[#d2f5e8] text-[#155c44]' : 'bg-lilac text-subtle'"
            >
              <Globe v-if="s.isPublic" class="size-3.5" aria-hidden="true" />
              <Lock v-else class="size-3.5" aria-hidden="true" />
              {{ s.isPublic ? 'Public' : 'Privé' }}
            </span>
          </div>
          <p class="text-[13px] text-muted">Modifié le {{ dateFormat.format(new Date(s.updatedAt)) }} · {{ s.scene.objects.length }} objets</p>
          <div class="mt-auto flex flex-wrap gap-2 pt-1">
            <template v-if="confirmingId === s.id">
              <Button
                size="sm"
                class="bg-[#b3361f] text-white hover:bg-[#9a2e1a]"
                :disabled="deletingId === s.id"
                @click="remove(s)"
              >
                Supprimer « {{ s.name }} »
              </Button>
              <Button variant="ghost" size="sm" @click="confirmingId = null">Garder</Button>
            </template>
            <template v-else>
              <Button size="sm" as-child><NuxtLink :to="`/editor/${s.id}`">Ouvrir l’éditeur</NuxtLink></Button>
              <Button v-if="s.isPublic" variant="outline" size="sm" as-child>
                <NuxtLink :to="`/setup/${s.slug}`"><Eye class="size-4" />Voir</NuxtLink>
              </Button>
              <Button variant="ghost" size="sm" class="ml-auto" :aria-label="`Supprimer ${s.name}`" @click="confirmingId = s.id">
                <Trash2 class="size-4" />
              </Button>
            </template>
          </div>
        </div>
      </li>
    </ul>
  </main>
</template>
