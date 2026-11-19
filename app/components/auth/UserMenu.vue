<script setup lang="ts">
import { LayoutGrid, LogOut, Settings, ShieldCheck, UserRound } from 'lucide-vue-next'
import { authClient } from '~/lib/auth-client'

const props = withDefaults(defineProps<{ name: string; email: string; image?: string | null; dark?: boolean }>(), { image: null, dark: false })

const open = ref(false)
/** Lien « Modération » : vérifié à la première ouverture du menu seulement. */
const isAdmin = ref(false)
let adminChecked = false
watch(open, async (value) => {
  if (!value || adminChecked) return
  adminChecked = true
  try {
    isAdmin.value = (await $fetch<{ admin: boolean }>('/api/admin/status')).admin
  } catch {
    isAdmin.value = false
  }
})
const root = ref<HTMLElement | null>(null)
const initials = computed(() =>
  props.name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?',
)

async function signOut() {
  await authClient.signOut()
  reloadNuxtApp({ path: '/' })
}

function onClickOutside(e: MouseEvent) {
  if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <div ref="root" class="relative" @keydown.esc="open = false">
    <button
      class="grid size-10 place-items-center overflow-hidden rounded-full border font-display text-[13px] font-bold"
      :class="dark ? 'border-chrome-line bg-chrome-raised text-chrome-text' : 'border-line-strong bg-lavender text-ink'"
      :aria-expanded="open"
      aria-haspopup="menu"
      :aria-label="`Compte de ${name}`"
      @click="open = !open"
    >
      <img v-if="image" :src="image" alt="" referrerpolicy="no-referrer" class="size-full object-cover">
      <span v-else aria-hidden="true">{{ initials }}</span>
    </button>
    <div
      v-if="open"
      role="menu"
      class="absolute top-12 right-0 z-40 w-60 rounded-2xl border p-1.5 shadow-xl"
      :class="dark ? 'border-chrome-line bg-chrome-panel text-chrome-text' : 'border-line bg-white text-ink'"
    >
      <div class="px-3 pt-2 pb-2.5">
        <p class="truncate text-sm font-semibold">{{ name }}</p>
        <p class="truncate text-xs" :class="dark ? 'text-chrome-muted' : 'text-muted'">{{ email }}</p>
      </div>
      <NuxtLink
        to="/dashboard"
        role="menuitem"
        class="flex h-10 items-center gap-2.5 rounded-xl px-3 text-sm font-medium"
        :class="dark ? 'hover:bg-chrome-raised' : 'hover:bg-lilac'"
        @click="open = false"
      >
        <LayoutGrid class="size-4" aria-hidden="true" />Mes setups
      </NuxtLink>
      <NuxtLink
        to="/u/me"
        role="menuitem"
        class="flex h-10 items-center gap-2.5 rounded-xl px-3 text-sm font-medium"
        :class="dark ? 'hover:bg-chrome-raised' : 'hover:bg-lilac'"
        @click="open = false"
      >
        <UserRound class="size-4" aria-hidden="true" />Mon profil
      </NuxtLink>
      <NuxtLink
        to="/settings"
        role="menuitem"
        class="flex h-10 items-center gap-2.5 rounded-xl px-3 text-sm font-medium"
        :class="dark ? 'hover:bg-chrome-raised' : 'hover:bg-lilac'"
        @click="open = false"
      >
        <Settings class="size-4" aria-hidden="true" />Paramètres
      </NuxtLink>
      <NuxtLink
        v-if="isAdmin"
        to="/admin/moderation"
        role="menuitem"
        class="flex h-10 items-center gap-2.5 rounded-xl px-3 text-sm font-medium"
        :class="dark ? 'hover:bg-chrome-raised' : 'hover:bg-lilac'"
        @click="open = false"
      >
        <ShieldCheck class="size-4" aria-hidden="true" />Modération
      </NuxtLink>
      <button
        role="menuitem"
        class="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium"
        :class="dark ? 'hover:bg-chrome-raised' : 'hover:bg-lilac'"
        @click="signOut"
      >
        <LogOut class="size-4" aria-hidden="true" />Se déconnecter
      </button>
    </div>
  </div>
</template>
