<script setup lang="ts">
import type { GallerySetup, LikeState } from '#shared/types/social'

/** Carte d'un setup public (galerie, profil, accueil). */
const props = withDefaults(defineProps<{ setup: GallerySetup; liked?: boolean; showAuthor?: boolean }>(), { liked: false, showAuthor: true })
const emit = defineEmits<{ like: [state: LikeState] }>()

const authorLink = computed(() => (props.setup.authorUsername ? `/u/${props.setup.authorUsername}` : null))
</script>

<template>
  <article class="group flex flex-col overflow-hidden rounded-3xl border border-line bg-white">
    <NuxtLink :to="`/setup/${setup.slug}`" class="block aspect-[4/3] overflow-hidden bg-lilac" :class="setup.previewUrl ? '' : 'p-4'" tabindex="-1" aria-hidden="true">
      <img
        v-if="setup.previewUrl"
        :src="setup.previewUrl"
        alt=""
        width="1200"
        height="900"
        loading="lazy"
        decoding="async"
        class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      >
      <IsoPreview v-else-if="setup.scene" :scene="setup.scene" />
    </NuxtLink>
    <div class="flex flex-1 flex-col gap-3 p-5">
      <h3 class="font-display text-xl leading-tight font-bold">
        <NuxtLink :to="`/setup/${setup.slug}`" class="hover:text-link">{{ setup.name }}</NuxtLink>
      </h3>
      <div class="mt-auto flex items-center justify-between gap-3">
        <component
          :is="authorLink ? resolveComponent('NuxtLink') : 'span'"
          v-if="showAuthor"
          :to="authorLink ?? undefined"
          class="flex min-w-0 items-center gap-2 text-sm"
          :class="authorLink ? 'hover:text-link' : ''"
        >
          <UserAvatar :name="setup.authorName" :image="setup.authorImage" :size="28" />
          <span class="truncate font-medium">{{ setup.authorName }}</span>
        </component>
        <span v-else class="text-[13px] text-muted">{{ setup.objectCount }} objets</span>
        <LikeButton :setup-id="setup.id" :setup-name="setup.name" :liked="liked" :count="setup.likeCount" @change="emit('like', $event)" />
      </div>
    </div>
  </article>
</template>
