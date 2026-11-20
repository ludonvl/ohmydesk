import type { MaybeRefOrGetter } from 'vue'
import type { PresenceState } from '#shared/types/presence'
import { PRESENCE_POLL_MS } from '#shared/types/presence'

/**
 * Présence en ligne d'un auteur, revérifiée toutes les 30 s tant que l'onglet est visible.
 * Lue côté client uniquement : les pages de setup sont servies depuis le cache CDN.
 * `username` à null = rien à surveiller (auteur sans avatar, avatar masqué…).
 */
export function useAuthorPresence(username: MaybeRefOrGetter<string | null | undefined>) {
  const online = ref(false)
  let timer: ReturnType<typeof setInterval> | null = null
  let active = false

  async function check() {
    const name = toValue(username)
    if (!name || document.visibilityState !== 'visible') return
    try {
      const state = await $fetch<PresenceState>(`/api/presence/${encodeURIComponent(name)}`)
      if (toValue(username) === name) online.value = state.online
    } catch {
      // Erreur réseau : on garde l'état connu, le prochain passage réessaiera.
    }
  }

  function onVisibility() {
    if (document.visibilityState === 'visible') check()
  }

  onMounted(() => {
    active = true
    document.addEventListener('visibilitychange', onVisibility)
    watch(
      () => toValue(username),
      (name) => {
        if (timer) clearInterval(timer)
        timer = null
        online.value = false
        if (!name || !active) return
        check()
        timer = setInterval(check, PRESENCE_POLL_MS)
      },
      { immediate: true },
    )
  })

  onBeforeUnmount(() => {
    active = false
    if (timer) clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibility)
  })

  return { online: readonly(online) }
}
