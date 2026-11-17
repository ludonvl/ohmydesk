<script setup lang="ts">
import { CircleAlert, CircleCheck } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { authClient, authErrorMessage } from '~/lib/auth-client'

/**
 * Arrivée depuis le lien de l'email de confirmation.
 * Better Auth a déjà validé le jeton et ouvert la session, ou renvoie ici avec ?error=TOKEN_EXPIRED / INVALID_TOKEN.
 */
useSeoMeta({ title: 'Confirmation de l’email · Oh My Desk', robots: 'noindex' })

const route = useRoute()
const redirect = computed(() => {
  const r = route.query.redirect
  return typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') ? r : '/dashboard'
})
const errorCode = computed(() => (typeof route.query.error === 'string' ? route.query.error : null))
const { data: session } = await authClient.useSession(useFetch)

function continueToApp() {
  reloadNuxtApp({ path: redirect.value })
}
</script>

<template>
  <main class="px-6 pt-10 pb-24">
    <div class="mx-auto flex w-full max-w-[420px] flex-col gap-6 rounded-3xl border border-line bg-white p-8">
      <template v-if="errorCode">
        <span class="grid size-14 place-items-center rounded-2xl bg-[#fdecea]" aria-hidden="true"><CircleAlert class="size-7 text-[#8f2a17]" /></span>
        <div class="flex flex-col gap-2">
          <h1 class="font-display text-3xl font-extrabold tracking-tight">Lien non valide</h1>
          <p class="text-[15px] leading-relaxed text-subtle">{{ authErrorMessage({ code: errorCode }) }}</p>
        </div>
        <ResendVerification ask-email :redirect="redirect" />
      </template>

      <template v-else-if="session?.user">
        <span class="grid size-14 place-items-center rounded-2xl bg-[#d2f5e8]" aria-hidden="true"><CircleCheck class="size-7 text-[#155c44]" /></span>
        <div class="flex flex-col gap-2">
          <h1 class="font-display text-3xl font-extrabold tracking-tight">Email confirmé</h1>
          <p class="text-[15px] leading-relaxed text-subtle">Bienvenue {{ session.user.name }} ! Ton compte est actif.</p>
        </div>
        <Button variant="accent" size="lg" class="w-full" @click="continueToApp">Continuer</Button>
      </template>

      <template v-else>
        <div class="flex flex-col gap-2">
          <h1 class="font-display text-3xl font-extrabold tracking-tight">Confirme ton email</h1>
          <p class="text-[15px] leading-relaxed text-subtle">
            Ouvre le lien reçu par email pour activer ton compte. Tu ne le trouves pas ? Demande-en un nouveau.
          </p>
        </div>
        <ResendVerification ask-email :redirect="redirect" />
        <p class="text-center text-sm text-subtle">
          Déjà confirmé ?
          <NuxtLink :to="{ path: '/login', query: { redirect } }" class="font-semibold text-link">Se connecter</NuxtLink>
        </p>
      </template>
    </div>
  </main>
</template>
