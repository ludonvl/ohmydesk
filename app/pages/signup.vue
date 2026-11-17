<script setup lang="ts">
definePageMeta({ middleware: 'guest' })
useSeoMeta({ title: 'Créer un compte · Oh My Desk', robots: 'noindex' })
</script>

<template>
  <main class="px-6 pt-10 pb-24">
    <AuthForm mode="signup" />
  </main>
</template>
