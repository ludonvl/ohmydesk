<script setup lang="ts">
import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { authClient, authErrorMessage, PASSWORD_MIN } from '~/lib/auth-client'

/** Arrivée depuis le lien « Réinitialiser » : ?token=… si valide, ?error=INVALID_TOKEN sinon. */
useSeoMeta({ title: 'Nouveau mot de passe · Oh My Desk', robots: 'noindex' })

const route = useRoute()
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const linkError = computed(() => (typeof route.query.error === 'string' ? route.query.error : token.value ? '' : 'INVALID_TOKEN'))

const password = ref('')
const confirm = ref('')
const touched = reactive({ password: false, confirm: false })
const submitting = ref(false)
const error = ref('')
const done = ref(false)

const errors = computed(() => ({
  password: touched.password && password.value.length < PASSWORD_MIN ? `Au moins ${PASSWORD_MIN} caractères.` : '',
  confirm: touched.confirm && confirm.value !== password.value ? 'Les deux mots de passe ne correspondent pas.' : '',
}))

async function submit() {
  touched.password = touched.confirm = true
  error.value = ''
  if (errors.value.password || errors.value.confirm) return
  submitting.value = true
  try {
    const { error: err } = await authClient.resetPassword({ newPassword: password.value, token: token.value })
    if (err) {
      error.value = authErrorMessage(err)
      return
    }
    done.value = true
  } finally {
    submitting.value = false
  }
}

function goToLogin() {
  // Toutes les sessions ont été révoquées : on recharge pour repartir d'un état propre.
  reloadNuxtApp({ path: '/login' })
}
</script>

<template>
  <main class="px-6 pt-10 pb-24">
    <div class="mx-auto flex w-full max-w-[420px] flex-col gap-6 rounded-3xl border border-line bg-white p-8">
      <template v-if="done">
        <span class="grid size-14 place-items-center rounded-2xl bg-[#d2f5e8]" aria-hidden="true"><CircleCheck class="size-7 text-[#155c44]" /></span>
        <div class="flex flex-col gap-2">
          <h1 class="font-display text-3xl font-extrabold tracking-tight">Mot de passe modifié</h1>
          <p class="text-[15px] leading-relaxed text-subtle">Tous tes appareils ont été déconnectés. Reconnecte-toi avec ton nouveau mot de passe.</p>
        </div>
        <Button variant="accent" size="lg" class="w-full" @click="goToLogin">Se connecter</Button>
      </template>

      <template v-else-if="linkError">
        <span class="grid size-14 place-items-center rounded-2xl bg-[#fdecea]" aria-hidden="true"><CircleAlert class="size-7 text-[#8f2a17]" /></span>
        <div class="flex flex-col gap-2">
          <h1 class="font-display text-3xl font-extrabold tracking-tight">Lien non valide</h1>
          <p class="text-[15px] leading-relaxed text-subtle">{{ authErrorMessage({ code: linkError }) }}</p>
        </div>
        <Button variant="accent" size="lg" class="w-full" as-child>
          <NuxtLink to="/forgot-password">Demander un nouveau lien</NuxtLink>
        </Button>
      </template>

      <template v-else>
        <div class="flex flex-col gap-2">
          <h1 class="font-display text-3xl font-extrabold tracking-tight">Nouveau mot de passe</h1>
          <p class="text-[15px] leading-relaxed text-subtle">Choisis ton nouveau mot de passe. Tes autres appareils seront déconnectés.</p>
        </div>
        <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
          <TextField
            id="reset-password"
            v-model="password"
            label="Nouveau mot de passe"
            type="password"
            autocomplete="new-password"
            :hint="`Au moins ${PASSWORD_MIN} caractères.`"
            :error="errors.password"
            @blur="touched.password = true"
          />
          <TextField
            id="reset-confirm"
            v-model="confirm"
            label="Confirme le mot de passe"
            type="password"
            autocomplete="new-password"
            :error="errors.confirm"
            @blur="touched.confirm = true"
          />
          <FormNotice v-if="error" kind="error">{{ error }}</FormNotice>
          <Button type="submit" variant="accent" size="lg" class="w-full" :aria-busy="submitting">
            <LoaderCircle v-if="submitting" class="size-4 animate-spin" aria-hidden="true" />
            Enregistrer le mot de passe
          </Button>
        </form>
      </template>
    </div>
  </main>
</template>
