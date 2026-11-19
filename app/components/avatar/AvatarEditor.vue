<script setup lang="ts">
import { Hand, LoaderCircle, RotateCcw } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { OBJECT_PALETTE } from '~/lib/palette'
import type { Avatar, AvatarColorSlot } from '#shared/avatar/schema'
import { AVATAR_AXES, AVATAR_COLOR_LABELS, avatarColorSlots, defaultAvatar, HAIR_PALETTE, SKIN_PALETTE } from '#shared/avatar/schema'
import type { OwnProfile } from '#shared/types/social'

/** Section « Avatar » des paramètres : figurine 3D reprise dans tous les setups de la personne. */
const props = defineProps<{ avatar: Avatar | null }>()
const emit = defineEmits<{ saved: [profile: OwnProfile] }>()

const clone = (a: Avatar): Avatar => JSON.parse(JSON.stringify(a))
const draft = ref<Avatar>(clone(props.avatar ?? defaultAvatar()))
const saved = ref<string>(props.avatar ? JSON.stringify(props.avatar) : '')
watch(
  () => props.avatar,
  (a) => {
    if (!a) return
    draft.value = clone(a)
    saved.value = JSON.stringify(a)
  },
)

const dirty = computed(() => JSON.stringify(draft.value) !== saved.value)
const submitting = ref(false)
const error = ref('')
const done = ref(false)
watch(draft, () => (done.value = false), { deep: true })

type AxisId = (typeof AVATAR_AXES)[number]['id']
function pick(axis: AxisId, value: string) {
  ;(draft.value as Record<AxisId, string>)[axis] = value
}

const PALETTES: Record<AvatarColorSlot, readonly { hex: string; name: string }[]> = {
  skin: SKIN_PALETTE,
  hair: HAIR_PALETTE,
  top: OBJECT_PALETTE,
  bottom: OBJECT_PALETTE,
  shoes: OBJECT_PALETTE,
  accessory: OBJECT_PALETTE,
}
/** La couleur d'accessoire n'est proposée que si un accessoire est porté. */
const colorSlots = computed(() => avatarColorSlots.filter((s) => s !== 'accessory' || draft.value.accessory !== 'aucun'))

const preview = ref<{ wave: () => void } | null>(null)

async function save() {
  error.value = ''
  done.value = false
  submitting.value = true
  try {
    const profile = await $fetch<OwnProfile>('/api/profile/avatar', { method: 'PUT', body: draft.value })
    saved.value = JSON.stringify(profile.avatar)
    done.value = true
    emit('saved', profile)
    preview.value?.wave()
  } catch {
    error.value = 'Ton avatar n’a pas pu être enregistré. Réessaie.'
  } finally {
    submitting.value = false
  }
}

function reset() {
  draft.value = saved.value ? JSON.parse(saved.value) : defaultAvatar()
}
</script>

<template>
  <section id="avatar" aria-labelledby="avatar-title" class="flex scroll-mt-6 flex-col gap-5 rounded-3xl border border-line bg-white p-7">
    <div class="flex flex-col gap-1.5">
      <h2 id="avatar-title" class="font-display text-2xl font-bold">Avatar</h2>
      <p class="text-[15px] text-subtle">
        Ta figurine 3D. Elle est la même dans tous tes setups.
      </p>
    </div>

    <div class="grid gap-6 md:grid-cols-[240px_1fr]">
      <div class="flex flex-col gap-2">
        <div class="h-[320px] rounded-2xl bg-[#f7f4ef]">
          <AvatarPreview ref="preview" :avatar="draft" />
        </div>
        <div class="flex items-center justify-between gap-2">
          <p class="text-[13px] text-muted">Glisse pour la faire tourner.</p>
          <Button variant="outline" size="sm" @click="preview?.wave()">
            <Hand class="size-4" aria-hidden="true" />
            Saluer
          </Button>
        </div>
      </div>

      <form class="flex min-w-0 flex-col gap-5" novalidate @submit.prevent="save">
        <fieldset v-for="axis in AVATAR_AXES" :key="axis.id" class="flex flex-col gap-2">
          <legend class="mb-2 text-sm font-semibold">{{ axis.label }}</legend>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="v in axis.values"
              :key="v.id"
              type="button"
              :aria-pressed="draft[axis.id] === v.id"
              class="min-h-9 rounded-full border px-3.5 text-sm font-medium transition-colors"
              :class="draft[axis.id] === v.id ? 'border-ink bg-ink text-white' : 'border-line-strong bg-white text-ink hover:border-ink'"
              @click="pick(axis.id, v.id)"
            >
              {{ v.label }}
            </button>
          </div>
        </fieldset>

        <fieldset class="flex flex-col gap-3">
          <legend class="mb-2 text-sm font-semibold">Couleurs</legend>
          <div v-for="slot in colorSlots" :key="slot" class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <span class="w-24 shrink-0 text-[13px] text-muted">{{ AVATAR_COLOR_LABELS[slot] }}</span>
            <SwatchPicker :label="AVATAR_COLOR_LABELS[slot]" :value="draft.colors[slot]" :palette="PALETTES[slot]" @pick="draft.colors[slot] = $event" />
          </div>
        </fieldset>

        <FormNotice v-if="error" kind="error">{{ error }}</FormNotice>
        <FormNotice v-if="done" kind="success">Avatar enregistré.</FormNotice>
        <div class="flex flex-wrap gap-2">
          <Button type="submit" :disabled="submitting || (!dirty && !!saved)" :aria-busy="submitting">
            <LoaderCircle v-if="submitting" class="size-4 animate-spin" aria-hidden="true" />
            {{ saved ? 'Enregistrer l’avatar' : 'Créer mon avatar' }}
          </Button>
          <Button v-if="dirty && saved" type="button" variant="ghost" @click="reset">
            <RotateCcw class="size-4" aria-hidden="true" />
            Annuler les modifications
          </Button>
        </div>
      </form>
    </div>
  </section>
</template>
