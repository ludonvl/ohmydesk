<script setup lang="ts">
import { Button } from '~/components/ui/button'

useSeoMeta({ title: 'Compte supprimé · Oh My Desk', robots: 'noindex' })
</script>

<template>
  <main class="mx-auto flex max-w-[560px] flex-col gap-5 px-6 pt-16 pb-24 text-center">
    <h1 class="font-display text-[36px] leading-tight font-extrabold tracking-tight">Ton compte a été supprimé</h1>
    <p class="leading-relaxed text-subtle">
      Ton profil, tes setups et tes « j’aime » ont été effacés. Un email de confirmation t’a été envoyé.
      Merci d’avoir utilisé Oh My Desk.
    </p>
    <div class="flex justify-center"><Button variant="outline" as-child><NuxtLink to="/">Revenir à l’accueil</NuxtLink></Button></div>
  </main>
</template>
