<script setup lang="ts">
import { LoaderCircle, MailCheck } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { authClient, authErrorMessage, isEmailNotVerified, verificationCallbackURL } from '~/lib/auth-client'

const props = defineProps<{ mode: 'login' | 'signup' }>()

const route = useRoute()
const config = useRuntimeConfig()
const redirect = computed(() => {
  const r = route.query.redirect
  return typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') ? r : '/dashboard'
})

const name = ref('')
const email = ref('')
const password = ref('')
const touched = reactive({ name: false, email: false, password: false })
const submitting = ref(false)
const formError = ref('')
/** Inscription réussie : en attente du clic sur le lien reçu par email. */
const emailSent = ref(false)
/** Connexion refusée car l'email n'est pas confirmé. */
const needsVerification = ref(false)

const errors = computed(() => ({
  name: props.mode === 'signup' && !name.value.trim() ? 'Indique un nom ou un pseudo.' : '',
  email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()) ? 'Saisis une adresse email valide, par ex. nom@exemple.fr.' : '',
  password: password.value.length < 8 ? 'Au moins 8 caractères.' : '',
}))

async function submit() {
  touched.name = touched.email = touched.password = true
  formError.value = ''
  needsVerification.value = false
  if (errors.value.name || errors.value.email || errors.value.password) return
  submitting.value = true
  try {
    if (props.mode === 'signup') {
      const { error } = await authClient.signUp.email({
        name: name.value.trim(),
        email: email.value.trim(),
        password: password.value,
        callbackURL: verificationCallbackURL(redirect.value),
      })
      if (error) {
        formError.value = authErrorMessage(error)
        return
      }
      emailSent.value = true
      return
    }
    const { error } = await authClient.signIn.email({ email: email.value.trim(), password: password.value })
    if (error) {
      needsVerification.value = isEmailNotVerified(error)
      formError.value = authErrorMessage(error)
      return
    }
    // Recharge l'app pour que la session soit prise en compte partout (SSR compris).
    reloadNuxtApp({ path: redirect.value })
  } finally {
    submitting.value = false
  }
}

async function signInWithGoogle() {
  await authClient.signIn.social({ provider: 'google', callbackURL: redirect.value })
}

const inputClass =
  'h-12 w-full rounded-xl border bg-white px-4 text-[15px] text-ink focus:outline-none focus-visible:border-ink'
</script>

<template>
  <div v-if="emailSent" class="mx-auto flex w-full max-w-[420px] flex-col gap-6 rounded-3xl border border-line bg-white p-8">
    <span class="grid size-14 place-items-center rounded-2xl bg-[#d2f5e8]" aria-hidden="true"><MailCheck class="size-7 text-[#155c44]" /></span>
    <div class="flex flex-col gap-2">
      <h1 class="font-display text-3xl font-extrabold tracking-tight">Vérifie ta boîte mail</h1>
      <p class="text-[15px] leading-relaxed text-subtle">
        On a envoyé un lien de confirmation à <strong class="text-ink">{{ email.trim() }}</strong>.
        Clique dessus pour activer ton compte : tu seras connecté automatiquement. Le lien est valable 1 heure.
      </p>
    </div>
    <ResendVerification :email="email.trim()" :redirect="redirect" />
    <p class="text-center text-sm text-subtle">
      Mauvaise adresse ?
      <button class="font-semibold text-link" @click="emailSent = false">Modifier l’inscription</button>
    </p>
  </div>

  <div v-else class="mx-auto flex w-full max-w-[420px] flex-col gap-6 rounded-3xl border border-line bg-white p-8">
    <div class="flex flex-col gap-2">
      <h1 class="font-display text-3xl font-extrabold tracking-tight">
        {{ mode === 'signup' ? 'Crée ton compte' : 'Content de te revoir' }}
      </h1>
      <p class="text-[15px] text-subtle">
        {{ mode === 'signup' ? 'Pour sauvegarder tes setups et les partager.' : 'Connecte-toi pour retrouver tes setups.' }}
      </p>
    </div>

    <template v-if="config.public.googleAuth">
      <Button variant="outline" size="lg" class="w-full" @click="signInWithGoogle">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6a5.1 5.1 0 0 1-2.2 3.3v2.8h3.6c2.1-1.9 3.2-4.8 3.2-8.1z" /><path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.9A11 11 0 0 0 12 23z" /><path fill="#FBBC05" d="M5.7 14c-.2-.7-.4-1.3-.4-2s.1-1.4.4-2V7.1H2a11 11 0 0 0 0 9.8L5.7 14z" /><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2 7.1L5.7 10c.9-2.7 3.4-4.6 6.3-4.6z" /></svg>
        Continuer avec Google
      </Button>
      <div class="flex items-center gap-3 text-xs text-muted" aria-hidden="true">
        <span class="h-px flex-1 bg-line" />ou<span class="h-px flex-1 bg-line" />
      </div>
    </template>

    <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
      <div v-if="mode === 'signup'" class="flex flex-col gap-1.5">
        <label for="auth-name" class="text-sm font-semibold">Nom ou pseudo</label>
        <input
          id="auth-name"
          v-model="name"
          autocomplete="name"
          :class="[inputClass, touched.name && errors.name ? 'border-[#c2412d]' : 'border-line-strong']"
          :aria-invalid="touched.name && !!errors.name"
          aria-describedby="auth-name-error"
          @blur="touched.name = true"
        >
        <p v-if="touched.name && errors.name" id="auth-name-error" class="text-[13px] text-[#b3361f]">{{ errors.name }}</p>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="auth-email" class="text-sm font-semibold">Email</label>
        <input
          id="auth-email"
          v-model="email"
          type="email"
          autocomplete="email"
          placeholder="nom@exemple.fr"
          :class="[inputClass, touched.email && errors.email ? 'border-[#c2412d]' : 'border-line-strong']"
          :aria-invalid="touched.email && !!errors.email"
          aria-describedby="auth-email-error"
          @blur="touched.email = true"
        >
        <p v-if="touched.email && errors.email" id="auth-email-error" class="text-[13px] text-[#b3361f]">{{ errors.email }}</p>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="auth-password" class="text-sm font-semibold">Mot de passe</label>
        <input
          id="auth-password"
          v-model="password"
          type="password"
          :autocomplete="mode === 'signup' ? 'new-password' : 'current-password'"
          :class="[inputClass, touched.password && errors.password ? 'border-[#c2412d]' : 'border-line-strong']"
          :aria-invalid="touched.password && !!errors.password"
          aria-describedby="auth-password-error"
          @blur="touched.password = true"
        >
        <p v-if="touched.password && errors.password" id="auth-password-error" class="text-[13px] text-[#b3361f]">{{ errors.password }}</p>
      </div>

      <p v-if="formError" role="alert" class="rounded-xl bg-[#fdecea] px-4 py-3 text-sm text-[#8f2a17]">{{ formError }}</p>
      <ResendVerification v-if="needsVerification" :email="email.trim()" :redirect="redirect" />

      <Button type="submit" variant="accent" size="lg" class="mt-1 w-full" :aria-busy="submitting">
        <LoaderCircle v-if="submitting" class="size-4 animate-spin" aria-hidden="true" />
        {{ mode === 'signup' ? 'Créer mon compte' : 'Se connecter' }}
      </Button>
    </form>

    <p class="text-center text-sm text-subtle">
      <template v-if="mode === 'signup'">
        Déjà un compte ?
        <NuxtLink :to="{ path: '/login', query: route.query }" class="font-semibold text-link">Se connecter</NuxtLink>
      </template>
      <template v-else>
        Pas encore de compte ?
        <NuxtLink :to="{ path: '/signup', query: route.query }" class="font-semibold text-link">Créer un compte</NuxtLink>
      </template>
    </p>
  </div>
</template>
