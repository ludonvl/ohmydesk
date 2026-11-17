<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { authClient, authErrorMessage, verificationCallbackURL } from '~/lib/auth-client'

/** Renvoi de l'email de confirmation, avec délai d'attente pour éviter les envois en rafale. */
const props = withDefaults(defineProps<{ email?: string; redirect?: string; askEmail?: boolean }>(), {
  email: '',
  redirect: '/dashboard',
  askEmail: false,
})

const COOLDOWN = 60
const address = ref(props.email)
const sending = ref(false)
const status = ref<{ kind: 'ok' | 'error'; text: string } | null>(null)
const remaining = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

watch(() => props.email, (v) => (address.value = v))

function startCooldown() {
  remaining.value = COOLDOWN
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    remaining.value -= 1
    if (remaining.value <= 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}
onBeforeUnmount(() => timer && clearInterval(timer))

async function resend() {
  status.value = null
  const email = address.value.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    status.value = { kind: 'error', text: 'Saisis l’adresse email utilisée à l’inscription.' }
    return
  }
  sending.value = true
  try {
    const { error } = await authClient.sendVerificationEmail({ email, callbackURL: verificationCallbackURL(props.redirect) })
    if (error) {
      status.value = { kind: 'error', text: authErrorMessage(error) }
      return
    }
    status.value = { kind: 'ok', text: `Email envoyé à ${email}. Pense à vérifier tes spams.` }
    startCooldown()
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-if="askEmail" class="flex flex-col gap-1.5">
      <label for="resend-email" class="text-sm font-semibold">Email</label>
      <input
        id="resend-email"
        v-model="address"
        type="email"
        autocomplete="email"
        placeholder="nom@exemple.fr"
        class="h-12 w-full rounded-xl border border-line-strong bg-white px-4 text-[15px] text-ink focus:outline-none focus-visible:border-ink"
      >
    </div>
    <Button type="button" variant="outline" class="w-full" :disabled="remaining > 0" :aria-busy="sending" @click="resend">
      <LoaderCircle v-if="sending" class="size-4 animate-spin" aria-hidden="true" />
      {{ remaining > 0 ? `Renvoyer l’email (${remaining} s)` : 'Renvoyer l’email de confirmation' }}
    </Button>
    <p
      v-if="status"
      role="status"
      class="rounded-xl px-4 py-3 text-sm"
      :class="status.kind === 'ok' ? 'bg-[#d2f5e8] text-[#155c44]' : 'bg-[#fdecea] text-[#8f2a17]'"
    >
      {{ status.text }}
    </p>
  </div>
</template>
