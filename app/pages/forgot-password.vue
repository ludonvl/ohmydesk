<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { authClient, authErrorMessage, isValidEmail } from '~/lib/auth-client'

useSeoMeta({ title: 'Mot de passe oublié · Oh My Desk', robots: 'noindex' })

const route = useRoute()
const { data: session } = await authClient.useSession(useFetch)
const email = ref(typeof route.query.email === 'string' ? route.query.email : session.value?.user.email ?? '')
const touched = ref(false)
const submitting = ref(false)
const error = ref('')
const sentTo = ref('')

const fieldError = computed(() => (touched.value && !isValidEmail(email.value) ? 'Saisis une adresse email valide, par ex. nom@exemple.fr.' : ''))

async function submit() {
  touched.value = true
  error.value = ''
  if (fieldError.value) return
  submitting.value = true
  try {
    const address = email.value.trim()
    const { error: err } = await authClient.requestPasswordReset({ email: address, redirectTo: '/reset-password' })
    if (err) {
      error.value = authErrorMessage(err)
      return
    }
    sentTo.value = address
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="px-6 pt-10 pb-24">
    <div class="mx-auto flex w-full max-w-[420px] flex-col gap-6 rounded-3xl border border-line bg-white p-8">
      <div class="flex flex-col gap-2">
        <h1 class="font-display text-3xl font-extrabold tracking-tight">Mot de passe oublié</h1>
        <p class="text-[15px] leading-relaxed text-subtle">Indique l’adresse de ton compte : on t’envoie un lien pour choisir un nouveau mot de passe.</p>
      </div>

      <FormNotice v-if="sentTo" kind="success">
        Si un compte existe pour <strong>{{ sentTo }}</strong>, un email avec un lien vient d’être envoyé. Il est valable 1 heure. Pense à vérifier tes spams.
      </FormNotice>

      <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
        <TextField
          id="forgot-email"
          v-model="email"
          label="Email"
          type="email"
          autocomplete="email"
          placeholder="nom@exemple.fr"
          :error="fieldError"
          @blur="touched = true"
        />
        <FormNotice v-if="error" kind="error">{{ error }}</FormNotice>
        <Button type="submit" variant="accent" size="lg" class="w-full" :aria-busy="submitting">
          <LoaderCircle v-if="submitting" class="size-4 animate-spin" aria-hidden="true" />
          {{ sentTo ? 'Renvoyer le lien' : 'Envoyer le lien' }}
        </Button>
      </form>

      <p class="text-center text-sm text-subtle">
        <NuxtLink :to="session?.user ? '/settings' : '/login'" class="font-semibold text-link">
          {{ session?.user ? 'Retour aux paramètres' : 'Retour à la connexion' }}
        </NuxtLink>
      </p>
    </div>
  </main>
</template>
