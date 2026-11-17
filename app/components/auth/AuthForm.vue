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
const googleLoading = ref(false)
/** Erreur au retour de Google (?error=…) ou du formulaire. */
const formError = ref(typeof route.query.error === 'string' ? authErrorMessage({ code: route.query.error }) : '')
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
  formError.value = ''
  googleLoading.value = true
  // En cas d'échec, Google renvoie ici avec ?error=… en conservant la destination.
  const errorCallbackURL = `/${props.mode}?redirect=${encodeURIComponent(redirect.value)}`
  const { error } = await authClient.signIn.social({
    provider: 'google',
    callbackURL: redirect.value,
    newUserCallbackURL: redirect.value,
    errorCallbackURL,
  })
  // Sans erreur, le navigateur part chez Google : on laisse le bouton en chargement.
  if (error) {
    googleLoading.value = false
    formError.value = authErrorMessage(error)
  }
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
      <Button variant="outline" size="lg" class="w-full" :disabled="googleLoading" :aria-busy="googleLoading" @click="signInWithGoogle">
        <LoaderCircle v-if="googleLoading" class="size-4 animate-spin" aria-hidden="true" />
        <GoogleIcon v-else />
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
        <div class="flex items-baseline justify-between gap-3">
          <label for="auth-password" class="text-sm font-semibold">Mot de passe</label>
          <NuxtLink
            v-if="mode === 'login'"
            :to="{ path: '/forgot-password', query: email.trim() ? { email: email.trim() } : {} }"
            class="text-[13px] font-semibold text-link"
          >
            Mot de passe oublié ?
          </NuxtLink>
        </div>
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

    <p v-if="mode === 'signup'" class="text-center text-[13px] leading-relaxed text-muted">
      En créant un compte, tu acceptes les
      <NuxtLink to="/conditions-utilisation" target="_blank" class="font-semibold text-link">conditions d’utilisation</NuxtLink>
      et la <NuxtLink to="/confidentialite" target="_blank" class="font-semibold text-link">politique de confidentialité</NuxtLink>.
    </p>

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
