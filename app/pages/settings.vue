<script setup lang="ts">
import { BadgeCheck, CircleAlert, LoaderCircle } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import type { OwnProfile } from '#shared/types/social'
import { BIO_MAX, usernameSchema } from '#shared/types/social'
import { authClient, authErrorMessage, isValidEmail, PASSWORD_MIN } from '~/lib/auth-client'

definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Paramètres · Oh My Desk', robots: 'noindex' })

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const { data: session } = await authClient.useSession(useFetch)
const user = computed(() => session.value?.user ?? null)

/* ---------------- Profil public ---------------- */

const { data: ownProfile } = await useFetch<OwnProfile>('/api/profile', { headers: useRequestHeaders(['cookie']) })
const profileForm = reactive({ name: '', username: '', bio: '' })
watch(
  ownProfile,
  (p) => {
    if (p) Object.assign(profileForm, { name: p.name, username: p.username, bio: p.bio })
  },
  { immediate: true },
)
const profileTouched = reactive({ name: false, username: false })
const profileSubmitting = ref(false)
const profileError = ref('')
const profileServerField = ref<{ field: string; message: string } | null>(null)
const profileDone = ref(false)

const profileErrors = computed(() => {
  const server = profileServerField.value
  const usernameCheck = usernameSchema.safeParse(profileForm.username)
  return {
    name: server?.field === 'name' ? server.message : profileTouched.name && !profileForm.name.trim() ? 'Indique un nom.' : '',
    username:
      server?.field === 'username'
        ? server.message
        : profileTouched.username && !usernameCheck.success
          ? (usernameCheck.error.issues[0]?.message ?? 'Identifiant invalide.')
          : '',
    bio: profileForm.bio.length > BIO_MAX ? `${BIO_MAX} caractères au maximum.` : '',
  }
})
const host = useRequestURL().host
const profileUrl = computed(() => `${host}/u/${profileForm.username.trim().toLowerCase() || '…'}`)

async function saveProfile() {
  profileTouched.name = profileTouched.username = true
  profileServerField.value = null
  profileError.value = ''
  profileDone.value = false
  if (profileErrors.value.name || profileErrors.value.username || profileErrors.value.bio) return
  profileSubmitting.value = true
  try {
    ownProfile.value = await $fetch<OwnProfile>('/api/profile', {
      method: 'PUT',
      body: { name: profileForm.name, username: profileForm.username, bio: profileForm.bio },
    })
    profileDone.value = true
  } catch (e) {
    const err = e as { statusCode?: number; data?: { statusMessage?: string; data?: { field?: string } } }
    const message = err.data?.statusMessage ?? 'Ton profil n’a pas pu être enregistré. Réessaie.'
    if (err.statusCode === 409) profileServerField.value = { field: 'username', message }
    else if (err.data?.data?.field) profileServerField.value = { field: err.data.data.field, message }
    else profileError.value = message
  } finally {
    profileSubmitting.value = false
  }
}

/* ---------------- Suppression du compte ---------------- */

const deletePassword = ref('')
const deleteTouched = ref(false)
const deleteSubmitting = ref(false)
const deleteError = ref('')
const deleteSentTo = ref('')
const deletePasswordError = computed(() => (deleteTouched.value && hasPassword.value && !deletePassword.value ? 'Saisis ton mot de passe pour confirmer.' : ''))

async function requestAccountDeletion() {
  deleteTouched.value = true
  deleteError.value = ''
  deleteSentTo.value = ''
  if (deletePasswordError.value || !user.value) return
  deleteSubmitting.value = true
  try {
    const { error } = await authClient.deleteUser(hasPassword.value ? { password: deletePassword.value } : {})
    if (error) {
      deleteError.value = authErrorMessage(error)
      return
    }
    deleteSentTo.value = user.value.email
    deletePassword.value = ''
    deleteTouched.value = false
  } finally {
    deleteSubmitting.value = false
  }
}

/* ---------------- Comptes associés (mot de passe, Google) ---------------- */

const providers = ref<string[] | null>(null)
const hasPassword = computed(() => providers.value?.includes('credential') ?? true)
const hasGoogle = computed(() => providers.value?.includes('google') ?? false)
const linkingGoogle = ref(false)
const linkError = ref('')

async function loadAccounts() {
  const { data } = await authClient.listAccounts()
  providers.value = (data ?? []).map((a) => a.providerId)
}

async function linkGoogle() {
  linkError.value = ''
  linkingGoogle.value = true
  const { error } = await authClient.linkSocial({ provider: 'google', callbackURL: '/settings?linked=google' })
  if (error) {
    linkingGoogle.value = false
    linkError.value = authErrorMessage(error)
  }
}

/** Compte créé avec Google : on envoie un lien pour définir un mot de passe (parcours « mot de passe oublié »). */
const setPasswordSent = ref(false)
const setPasswordLoading = ref(false)
async function sendSetPasswordLink() {
  if (!user.value) return
  setPasswordLoading.value = true
  try {
    const { error } = await authClient.requestPasswordReset({ email: user.value.email, redirectTo: '/reset-password' })
    if (error) pwError.value = authErrorMessage(error)
    else setPasswordSent.value = true
  } finally {
    setPasswordLoading.value = false
  }
}

/* ---------------- Adresse email ---------------- */

const PENDING_KEY = 'omd:pending-email'
const newEmail = ref('')
const emailTouched = ref(false)
const emailSubmitting = ref(false)
const emailError = ref('')
const emailSentTo = ref<{ current: string; next: string } | null>(null)
/** Retour depuis un lien reçu par email (?email=… ou ?error=…). */
const emailReturn = ref<{ kind: 'success' | 'info' | 'error'; text: string } | null>(null)

const emailFieldError = computed(() => {
  if (!emailTouched.value) return ''
  if (!isValidEmail(newEmail.value)) return 'Saisis une adresse email valide, par ex. nom@exemple.fr.'
  if (user.value && newEmail.value.trim().toLowerCase() === user.value.email.toLowerCase()) return 'C’est déjà l’adresse de ton compte.'
  return ''
})

async function changeEmail() {
  emailTouched.value = true
  emailError.value = ''
  emailSentTo.value = null
  if (emailFieldError.value || !user.value) return
  emailSubmitting.value = true
  try {
    const next = newEmail.value.trim()
    const { error } = await authClient.changeEmail({ newEmail: next, callbackURL: '/settings?email=link' })
    if (error) {
      emailError.value = authErrorMessage(error)
      return
    }
    try {
      localStorage.setItem(PENDING_KEY, next)
    } catch {
      // Stockage indisponible (navigation privée stricte) : le message de retour restera générique.
    }
    emailSentTo.value = { current: user.value.email, next }
    newEmail.value = ''
    emailTouched.value = false
  } finally {
    emailSubmitting.value = false
  }
}

/** Messages au retour d'un lien email ou de Google (?email, ?linked, ?error). */
const pageNotice = ref<{ kind: 'success' | 'info' | 'error'; text: string } | null>(null)

onMounted(() => {
  loadAccounts()
  const { email, linked, error } = route.query
  if (email === undefined && linked === undefined && error === undefined) return
  if (typeof error === 'string') {
    pageNotice.value = { kind: 'error', text: authErrorMessage({ code: error }) }
  } else if (linked === 'google') {
    pageNotice.value = { kind: 'success', text: 'Ton compte Google est associé : tu peux maintenant te connecter avec Google.' }
  } else if (email !== undefined) {
    let pending: string | null = null
    try {
      pending = localStorage.getItem(PENDING_KEY)
    } catch {
      pending = null
    }
    if (pending && user.value && pending.toLowerCase() === user.value.email.toLowerCase()) {
      emailReturn.value = { kind: 'success', text: `C’est fait : ton adresse est maintenant ${user.value.email}.` }
      try {
        localStorage.removeItem(PENDING_KEY)
      } catch {
        // ignoré
      }
    } else {
      emailReturn.value = {
        kind: 'info',
        text: pending
          ? `Changement approuvé. Dernière étape : clique sur le lien envoyé à ${pending}.`
          : 'Lien validé. Si tu viens d’approuver un changement, termine-le depuis le lien envoyé à ta nouvelle adresse.',
      }
    }
  }
  // Nettoie l'URL pour qu'un rechargement ne réaffiche pas le message.
  router.replace({ query: {} })
})

/* ---------------- Mot de passe ---------------- */

const currentPassword = ref('')
const nextPassword = ref('')
const confirmPassword = ref('')
const revokeOthers = ref(true)
const pwTouched = reactive({ current: false, next: false, confirm: false })
const pwSubmitting = ref(false)
const pwError = ref('')
const pwDone = ref(false)

const pwErrors = computed(() => ({
  current: pwTouched.current && !currentPassword.value ? 'Saisis ton mot de passe actuel.' : '',
  next:
    pwTouched.next && nextPassword.value.length < PASSWORD_MIN
      ? `Au moins ${PASSWORD_MIN} caractères.`
      : pwTouched.next && nextPassword.value === currentPassword.value && nextPassword.value
        ? 'Choisis un mot de passe différent de l’actuel.'
        : '',
  confirm: pwTouched.confirm && confirmPassword.value !== nextPassword.value ? 'Les deux mots de passe ne correspondent pas.' : '',
}))

async function changePassword() {
  pwTouched.current = pwTouched.next = pwTouched.confirm = true
  pwError.value = ''
  pwDone.value = false
  if (pwErrors.value.current || pwErrors.value.next || pwErrors.value.confirm) return
  pwSubmitting.value = true
  try {
    const { error } = await authClient.changePassword({
      currentPassword: currentPassword.value,
      newPassword: nextPassword.value,
      revokeOtherSessions: revokeOthers.value,
    })
    if (error) {
      pwError.value = authErrorMessage(error)
      return
    }
    pwDone.value = true
    currentPassword.value = nextPassword.value = confirmPassword.value = ''
    pwTouched.current = pwTouched.next = pwTouched.confirm = false
  } finally {
    pwSubmitting.value = false
  }
}
</script>

<template>
  <main class="mx-auto flex max-w-[720px] flex-col gap-6 px-6 pt-6 pb-24">
    <div class="flex flex-col gap-1.5">
      <h1 class="font-display text-[40px] leading-tight font-extrabold tracking-tight">Paramètres</h1>
      <p class="text-subtle">Ton profil public, ton avatar, ton adresse email, ton mot de passe, tes moyens de connexion et la suppression de ton compte.</p>
    </div>

    <FormNotice v-if="pageNotice" :kind="pageNotice.kind">{{ pageNotice.text }}</FormNotice>

    <!-- Profil public -->
    <section id="profil" aria-labelledby="profile-title" class="flex scroll-mt-6 flex-col gap-5 rounded-3xl border border-line bg-white p-7">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex flex-col gap-1.5">
          <h2 id="profile-title" class="font-display text-2xl font-bold">Profil public</h2>
          <p class="text-[15px] text-subtle">Visible par tout le monde, avec tes setups publiés.</p>
        </div>
        <NuxtLink v-if="ownProfile" :to="`/u/${ownProfile.username}`" class="text-sm font-semibold text-link">Voir mon profil</NuxtLink>
      </div>

      <form class="flex flex-col gap-4" novalidate @submit.prevent="saveProfile">
        <TextField
          id="profile-name"
          v-model="profileForm.name"
          label="Nom affiché"
          autocomplete="nickname"
          :error="profileErrors.name"
          @blur="profileTouched.name = true"
        />
        <TextField
          id="profile-username"
          v-model="profileForm.username"
          label="Identifiant"
          autocomplete="username"
          :hint="`Adresse de ton profil : ${profileUrl}`"
          :error="profileErrors.username"
          @blur="profileTouched.username = true"
          @update:model-value="profileServerField = null"
        />
        <div class="flex flex-col gap-1.5">
          <div class="flex items-baseline justify-between gap-3">
            <label for="profile-bio" class="text-sm font-semibold">Bio</label>
            <span class="text-[13px] tabular-nums" :class="profileErrors.bio ? 'text-[#b3361f]' : 'text-muted'">{{ profileForm.bio.length }} / {{ BIO_MAX }}</span>
          </div>
          <textarea
            id="profile-bio"
            v-model="profileForm.bio"
            rows="3"
            class="w-full resize-y rounded-xl border bg-white px-4 py-3 text-[15px] leading-relaxed text-ink focus:outline-none focus-visible:border-ink"
            :class="profileErrors.bio ? 'border-[#c2412d]' : 'border-line-strong'"
            :aria-invalid="!!profileErrors.bio"
            aria-describedby="profile-bio-hint"
          />
          <p id="profile-bio-hint" class="text-[13px]" :class="profileErrors.bio ? 'text-[#b3361f]' : 'text-muted'">
            {{ profileErrors.bio || 'Quelques mots sur toi ou ton setup.' }}
          </p>
        </div>
        <FormNotice v-if="profileError" kind="error">{{ profileError }}</FormNotice>
        <FormNotice v-if="profileDone" kind="success">Profil enregistré.</FormNotice>
        <div>
          <Button type="submit" :aria-busy="profileSubmitting">
            <LoaderCircle v-if="profileSubmitting" class="size-4 animate-spin" aria-hidden="true" />
            Enregistrer le profil
          </Button>
        </div>
      </form>
    </section>

    <!-- Avatar 3D -->
    <ClientOnly>
      <AvatarEditor v-if="ownProfile" :avatar="ownProfile.avatar" :show-presence="ownProfile.showPresence" @saved="ownProfile = $event" />
    </ClientOnly>

    <!-- Adresse email -->
    <section aria-labelledby="email-title" class="flex flex-col gap-5 rounded-3xl border border-line bg-white p-7">
      <div class="flex flex-col gap-2">
        <h2 id="email-title" class="font-display text-2xl font-bold">Adresse email</h2>
        <div v-if="user" class="flex flex-wrap items-center gap-2 text-[15px]">
          <span class="font-semibold break-all">{{ user.email }}</span>
          <span
            class="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
            :class="user.emailVerified ? 'bg-[#d2f5e8] text-[#155c44]' : 'bg-[#fdecea] text-[#8f2a17]'"
          >
            <BadgeCheck v-if="user.emailVerified" class="size-3.5" aria-hidden="true" />
            <CircleAlert v-else class="size-3.5" aria-hidden="true" />
            {{ user.emailVerified ? 'Confirmée' : 'Non confirmée' }}
          </span>
        </div>
      </div>

      <FormNotice v-if="emailReturn" :kind="emailReturn.kind">{{ emailReturn.text }}</FormNotice>

      <form class="flex flex-col gap-4" novalidate @submit.prevent="changeEmail">
        <TextField
          id="new-email"
          v-model="newEmail"
          label="Nouvelle adresse email"
          type="email"
          autocomplete="email"
          placeholder="nom@exemple.fr"
          hint="Pour ta sécurité, tu devras approuver le changement depuis ton adresse actuelle, puis confirmer la nouvelle."
          :error="emailFieldError"
          @blur="emailTouched = true"
        />
        <FormNotice v-if="emailError" kind="error">{{ emailError }}</FormNotice>
        <FormNotice v-if="emailSentTo" kind="success">
          <template v-if="user?.emailVerified">
            Email envoyé à <strong>{{ emailSentTo.current }}</strong>. Clique sur le lien pour approuver le changement : un dernier lien sera
            ensuite envoyé à <strong>{{ emailSentTo.next }}</strong>.
          </template>
          <template v-else>
            Email envoyé à <strong>{{ emailSentTo.next }}</strong>. Clique sur le lien pour confirmer ta nouvelle adresse.
          </template>
        </FormNotice>
        <div>
          <Button type="submit" :aria-busy="emailSubmitting">
            <LoaderCircle v-if="emailSubmitting" class="size-4 animate-spin" aria-hidden="true" />
            Changer d’adresse email
          </Button>
        </div>
      </form>
    </section>

    <!-- Mot de passe -->
    <section aria-labelledby="password-title" class="flex flex-col gap-5 rounded-3xl border border-line bg-white p-7">
      <div class="flex flex-col gap-1.5">
        <h2 id="password-title" class="font-display text-2xl font-bold">Mot de passe</h2>
        <p class="text-[15px] text-subtle">Un email de confirmation est envoyé après chaque changement.</p>
      </div>

      <div v-if="!hasPassword" class="flex flex-col gap-4">
        <FormNotice kind="info">
          Tu te connectes avec Google : ton compte n’a pas encore de mot de passe. Tu peux en créer un pour te connecter aussi avec ton email.
        </FormNotice>
        <FormNotice v-if="setPasswordSent" kind="success">
          Lien envoyé à <strong>{{ user?.email }}</strong>. Clique dessus pour choisir ton mot de passe.
        </FormNotice>
        <FormNotice v-if="pwError" kind="error">{{ pwError }}</FormNotice>
        <div>
          <Button :aria-busy="setPasswordLoading" @click="sendSetPasswordLink">
            <LoaderCircle v-if="setPasswordLoading" class="size-4 animate-spin" aria-hidden="true" />
            Recevoir un lien pour créer un mot de passe
          </Button>
        </div>
      </div>

      <form v-else class="flex flex-col gap-4" novalidate @submit.prevent="changePassword">
        <!-- Aide les gestionnaires de mots de passe à associer le bon compte. -->
        <input v-if="user" type="email" :value="user.email" autocomplete="username" class="sr-only" tabindex="-1" aria-hidden="true" readonly>
        <TextField
          id="current-password"
          v-model="currentPassword"
          label="Mot de passe actuel"
          type="password"
          autocomplete="current-password"
          :error="pwErrors.current"
          @blur="pwTouched.current = true"
        >
          <template #aside>
            <NuxtLink to="/forgot-password" class="text-[13px] font-semibold text-link">Mot de passe oublié ?</NuxtLink>
          </template>
        </TextField>
        <TextField
          id="next-password"
          v-model="nextPassword"
          label="Nouveau mot de passe"
          type="password"
          autocomplete="new-password"
          :hint="`Au moins ${PASSWORD_MIN} caractères.`"
          :error="pwErrors.next"
          @blur="pwTouched.next = true"
        />
        <TextField
          id="confirm-password"
          v-model="confirmPassword"
          label="Confirme le nouveau mot de passe"
          type="password"
          autocomplete="new-password"
          :error="pwErrors.confirm"
          @blur="pwTouched.confirm = true"
        />
        <label class="flex items-start gap-3 text-[15px]">
          <input v-model="revokeOthers" type="checkbox" class="mt-1 size-4 accent-tangerine">
          <span>
            Déconnecter mes autres appareils
            <span class="block text-[13px] text-muted">Recommandé si tu penses que ton mot de passe a été vu par quelqu’un.</span>
          </span>
        </label>
        <FormNotice v-if="pwError" kind="error">{{ pwError }}</FormNotice>
        <FormNotice v-if="pwDone" kind="success">
          Mot de passe modifié. Un email de confirmation a été envoyé à <strong>{{ user?.email }}</strong>.
        </FormNotice>
        <div>
          <Button type="submit" :aria-busy="pwSubmitting">
            <LoaderCircle v-if="pwSubmitting" class="size-4 animate-spin" aria-hidden="true" />
            Changer le mot de passe
          </Button>
        </div>
      </form>
    </section>

    <!-- Connexion avec Google -->
    <section v-if="config.public.googleAuth" aria-labelledby="google-title" class="flex flex-col gap-5 rounded-3xl border border-line bg-white p-7">
      <div class="flex flex-col gap-1.5">
        <h2 id="google-title" class="font-display text-2xl font-bold">Connexion avec Google</h2>
        <p class="text-[15px] text-subtle">Connecte-toi en un clic avec ton compte Google, en plus de ton mot de passe.</p>
      </div>
      <div v-if="providers === null" class="flex items-center gap-2 text-sm text-muted">
        <LoaderCircle class="size-4 animate-spin" aria-hidden="true" />Chargement…
      </div>
      <div v-else-if="hasGoogle" class="flex items-center gap-3 text-[15px]">
        <GoogleIcon />
        <span class="font-semibold">Compte Google associé</span>
        <BadgeCheck class="size-4 text-[#155c44]" aria-hidden="true" />
      </div>
      <template v-else>
        <FormNotice v-if="linkError" kind="error">{{ linkError }}</FormNotice>
        <div>
          <Button variant="outline" :disabled="linkingGoogle" :aria-busy="linkingGoogle" @click="linkGoogle">
            <LoaderCircle v-if="linkingGoogle" class="size-4 animate-spin" aria-hidden="true" />
            <GoogleIcon v-else />
            Associer mon compte Google
          </Button>
        </div>
        <p class="text-[13px] text-muted">Le compte Google doit utiliser la même adresse email ({{ user?.email }}).</p>
      </template>
    </section>

    <!-- Suppression du compte -->
    <section id="suppression" aria-labelledby="delete-title" class="flex scroll-mt-6 flex-col gap-5 rounded-3xl border border-[#f2c7bd] bg-white p-7">
      <div class="flex flex-col gap-1.5">
        <h2 id="delete-title" class="font-display text-2xl font-bold">Supprimer mon compte</h2>
        <p class="text-[15px] leading-relaxed text-subtle">
          Ton profil, tous tes setups (publiés ou non), leurs aperçus et tes « j’aime » seront effacés définitivement.
          Les copies que d’autres personnes ont remixées à partir de tes setups publics restent dans leur compte.
        </p>
      </div>
      <form class="flex flex-col gap-4" novalidate @submit.prevent="requestAccountDeletion">
        <input v-if="user && hasPassword" type="email" :value="user.email" autocomplete="username" class="sr-only" tabindex="-1" aria-hidden="true" readonly>
        <TextField
          v-if="hasPassword"
          id="delete-password"
          v-model="deletePassword"
          label="Mot de passe"
          type="password"
          autocomplete="current-password"
          :error="deletePasswordError"
          @blur="deleteTouched = true"
        />
        <p class="text-[13px] text-muted">
          Pour ta sécurité, tu recevras un lien de confirmation par email{{ user ? ` (${user.email})` : '' }}, valable 1 heure.
          Rien n’est supprimé avant que tu cliques dessus.
        </p>
        <FormNotice v-if="deleteError" kind="error">{{ deleteError }}</FormNotice>
        <FormNotice v-if="deleteSentTo" kind="success">
          Email envoyé à <strong>{{ deleteSentTo }}</strong>. Ouvre le lien dans ce navigateur pour confirmer la suppression.
        </FormNotice>
        <div>
          <Button type="submit" class="bg-[#b3361f] text-white hover:bg-[#9a2e1a]" :aria-busy="deleteSubmitting">
            <LoaderCircle v-if="deleteSubmitting" class="size-4 animate-spin" aria-hidden="true" />
            Recevoir le lien de suppression
          </Button>
        </div>
      </form>
    </section>
  </main>
</template>
