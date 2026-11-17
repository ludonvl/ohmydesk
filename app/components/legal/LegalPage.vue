<script setup lang="ts">
import { LEGAL } from '~/lib/legal'

/** Gabarit des pages légales : titre, date de mise à jour, sommaire et texte mis en forme. */
defineProps<{ title: string; intro: string; toc: { id: string; label: string }[] }>()
</script>

<template>
  <main class="mx-auto max-w-[760px] px-6 pt-8 pb-24">
    <header class="flex flex-col gap-3 border-b border-line pb-8">
      <h1 class="font-display text-[40px] leading-tight font-extrabold tracking-tight">{{ title }}</h1>
      <p class="text-[15px] text-muted">Dernière mise à jour : {{ LEGAL.updatedAt }}</p>
      <p class="text-[17px] leading-relaxed text-subtle">{{ intro }}</p>
    </header>

    <nav aria-label="Sommaire" class="my-8 rounded-2xl border border-line bg-white p-5">
      <p class="mb-2 text-sm font-semibold">Sommaire</p>
      <ol class="flex list-decimal flex-col gap-1 pl-5 text-[15px]">
        <li v-for="item in toc" :key="item.id"><a :href="`#${item.id}`" class="text-link hover:underline">{{ item.label }}</a></li>
      </ol>
    </nav>

    <div class="legal">
      <slot />
    </div>
  </main>
</template>

<style>
/* Styles non « scoped » volontairement : ils visent le contenu passé dans le slot, quelle que soit sa profondeur. */
.legal h2 {
  margin: 2.5rem 0 0.75rem;
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.25;
  scroll-margin-top: 1.5rem;
}
.legal h3 {
  margin: 1.5rem 0 0.5rem;
  font-size: 1.0625rem;
  font-weight: 600;
}
.legal p,
.legal li {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--color-subtle);
}
.legal p {
  margin: 0 0 0.875rem;
}
.legal ul {
  margin: 0 0 1rem;
  padding-left: 1.25rem;
  list-style: disc;
}
.legal li {
  margin-bottom: 0.375rem;
}
.legal strong {
  color: var(--color-ink);
}
.legal a {
  color: var(--color-link);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.legal table {
  width: 100%;
  margin: 0 0 1.25rem;
  border-collapse: collapse;
  font-size: 0.9375rem;
}
.legal th,
.legal td {
  border-bottom: 1px solid var(--color-line);
  padding: 0.625rem 0.5rem;
  text-align: left;
  vertical-align: top;
  line-height: 1.5;
  color: var(--color-subtle);
}
.legal th {
  color: var(--color-ink);
  font-weight: 600;
}
</style>
