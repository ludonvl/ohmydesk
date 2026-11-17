<script setup lang="ts">
/**
 * Symbole Oh My Desk (logo provisoire) : cube isométrique à bandeau.
 * Source unique des formes et couleurs : public/brand/logo.svg reprend exactement le même dessin.
 * `dark` est conservé pour compatibilité : le symbole reste identique sur fond sombre.
 */
withDefaults(defineProps<{ size?: number; dark?: boolean }>(), { size: 28, dark: false })

// Identifiant unique par instance (plusieurs logos par page), stable entre serveur et client.
const clipId = `omd-cube-${useId()}`

const HEXAGON =
  'M47.92,5.01Q50.00,3.81 52.08,5.01L87.92,25.71Q90.00,26.91 90.00,29.31L90.00,70.69Q90.00,73.09 87.92,74.29L52.08,94.99Q50.00,96.19 47.92,94.99L12.08,74.29Q10.00,73.09 10.00,70.69L10.00,29.31Q10.00,26.91 12.08,25.71Z'

const FACES = [
  { fill: '#FBA121', points: '50,3.81 90,26.91 50,50 10,26.91' },
  { fill: '#6C4D90', points: '10,26.91 50,50 50,83.99 10,60.9' },
  { fill: '#363264', points: '10,60.9 50,83.99 50,96.19 10,73.09' },
  { fill: '#F3AE94', points: '50,50 90,26.91 90,60.9 50,83.99' },
  { fill: '#8F7BAF', points: '50,83.99 90,60.9 90,73.09 50,96.19' },
]
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 100 100" aria-hidden="true">
    <defs>
      <clipPath :id="clipId"><path :d="HEXAGON" /></clipPath>
    </defs>
    <g :clip-path="`url(#${clipId})`">
      <polygon v-for="face in FACES" :key="face.fill" :points="face.points" :fill="face.fill" />
    </g>
  </svg>
</template>
