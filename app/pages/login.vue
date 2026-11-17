<script setup lang="ts">
definePageMeta({ middleware: 'guest' })
useSeoMeta({ title: 'Se connecter · Oh My Desk', robots: 'noindex' })
</script>

<template>
  <main class="px-6 pt-10 pb-24">
    <AuthForm mode="login" />
  </main>
</template>
