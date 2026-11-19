<script setup lang="ts">
import { LoaderCircle, TriangleAlert } from 'lucide-vue-next'
import type { SetupWithScene } from '#shared/types/scene'
import { Button } from '~/components/ui/button'
import { authClient, authErrorMessage } from '~/lib/auth-client'

/**
 * Dernière étape de la suppression de compte, ouverte depuis le lien reçu par email.
 * Rien n'est supprimé à l'ouverture : il faut cliquer sur le bouton (les clients mail préchargent parfois les liens).
 */
definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Supprimer mon compte · Oh My Desk', robots: 'noindex' })

const route = useRoute()
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const { data: session } = await authClient.useSession(useFetch)
const { data: setups } = await useFetch<SetupWithScene[]>('/api/setups', { headers: useRequestHeaders(['cookie']), default: () => [] })

const publicCount = computed(() => setups.value.filter((s) => s.isPublic && !s.hidden).length)
const deleting = ref(false)
const error = ref('')

async function confirmDeletion() {
  if (!token.value) return
  deleting.value = true
  error.value = ''
  const { error: failure } = await authClient.deleteUser({ token: token.value })
  if (failure) {
    deleting.value = false
    error.value = authErrorMessage(failure)
    return
  }
  // Session supprimée : rechargement complet pour repartir d'un état non connecté.
  reloadNuxtApp({ path: '/compte-supprime' })
}
</script>

<template>
  <main class="mx-auto flex max-w-[560px] flex-col gap-6 px-6 pt-10 pb-24">
    <div class="flex flex-col gap-5 rounded-3xl border border-[#f2c7bd] bg-white p-8">
      <span class="grid size-12 place-items-center rounded-2xl bg-[#fdecea] text-[#b3361f]"><TriangleAlert class="size-6" aria-hidden="true" /></span>
      <h1 class="font-display text-[32px] leading-tight font-extrabold tracking-tight">Supprimer ton compte ?</h1>

      <template v-if="token">
        <p class="leading-relaxed text-subtle">
          Le compte <strong class="text-ink">{{ session?.user.email }}</strong> sera supprimé définitivement, avec :
        </p>
        <ul class="flex list-disc flex-col gap-1.5 pl-5 text-[15px] text-subtle">
          <li>ton profil public ;</li>
          <li>{{ setups.length }} setup{{ setups.length > 1 ? 's' : '' }}<template v-if="publicCount">, dont {{ publicCount }} publié{{ publicCount > 1 ? 's' : '' }} dans la galerie</template>, et leurs aperçus ;</li>
          <li>tes « j’aime ».</li>
        </ul>
        <p class="text-[15px] text-subtle">Cette action est irréversible.</p>
        <FormNotice v-if="error" kind="error">
          {{ error }} <NuxtLink to="/settings#suppression" class="font-semibold underline">Refaire la demande</NuxtLink>
        </FormNotice>
        <div class="flex flex-wrap gap-2">
          <Button class="bg-[#b3361f] text-white hover:bg-[#9a2e1a]" :disabled="deleting" :aria-busy="deleting" @click="confirmDeletion">
            <LoaderCircle v-if="deleting" class="size-4 animate-spin" aria-hidden="true" />
            Supprimer définitivement mon compte
          </Button>
          <Button variant="ghost" as-child><NuxtLink to="/dashboard">Garder mon compte</NuxtLink></Button>
        </div>
      </template>

      <template v-else>
        <p class="leading-relaxed text-subtle">Ce lien est incomplet. Fais la demande depuis tes paramètres pour recevoir un nouveau lien par email.</p>
        <div><Button as-child><NuxtLink to="/settings#suppression">Aller aux paramètres</NuxtLink></Button></div>
      </template>
    </div>
  </main>
</template>
