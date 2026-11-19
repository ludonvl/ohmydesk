<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { authClient } from '~/lib/auth-client'

const { data: session } = await authClient.useSession(useFetch)
</script>

<template>
  <div class="min-h-screen bg-paper text-ink">
    <header class="mx-auto flex max-w-[1320px] flex-wrap items-center gap-7 px-6 py-5">
      <NuxtLink to="/" class="flex items-center gap-2.5 text-ink no-underline">
        <AppLogo :size="30" />
        <span class="font-display text-xl font-extrabold tracking-tight">Oh My Desk</span>
      </NuxtLink>
      <nav aria-label="Navigation principale" class="flex flex-wrap gap-6 text-[15px] font-medium">
        <NuxtLink to="/gallery" class="text-subtle hover:text-ink" active-class="!text-ink">Galerie</NuxtLink>
        <NuxtLink to="/#modeles" class="text-subtle hover:text-ink">Modèles</NuxtLink>
        <NuxtLink to="/#integrer" class="text-subtle hover:text-ink">Intégrer</NuxtLink>
      </nav>
      <div class="flex-1" />
      <template v-if="session?.user">
        <NuxtLink to="/dashboard" class="text-[15px] font-medium text-ink hover:text-link">Mes setups</NuxtLink>
        <UserMenu :name="session.user.name" :email="session.user.email" :image="session.user.image" />
      </template>
      <template v-else>
        <NuxtLink to="/login" class="text-[15px] font-medium text-ink hover:text-link">Se connecter</NuxtLink>
        <Button as-child>
          <NuxtLink to="/signup">Créer mon setup</NuxtLink>
        </Button>
      </template>
    </header>
    <slot />
    <footer class="border-t border-line">
      <div class="mx-auto flex max-w-[1320px] flex-wrap items-center gap-6 px-6 pt-7 pb-10 text-sm">
        <span class="flex items-center gap-2 font-display text-base font-extrabold">
          <AppLogo :size="20" />Oh My Desk
        </span>
        <span class="text-muted">Fait pour celles et ceux qui soignent leur setup.</span>
        <div class="flex-1" />
        <nav aria-label="Informations légales" class="flex flex-wrap gap-5">
          <NuxtLink to="/confidentialite" class="text-subtle hover:text-ink">Confidentialité</NuxtLink>
          <NuxtLink to="/conditions-utilisation" class="text-subtle hover:text-ink">Conditions d’utilisation</NuxtLink>
        </nav>
      </div>
    </footer>
  </div>
</template>
