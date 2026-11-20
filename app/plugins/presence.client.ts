import { PRESENCE_HEARTBEAT_MS } from '#shared/types/presence'
import { authClient } from '~/lib/auth-client'

/**
 * Battement de cœur de présence : tant qu'une personne connectée a un onglet visible sur le site,
 * on prévient le serveur toutes les 45 s (et dès que l'onglet redevient visible).
 * Le serveur n'enregistre rien si la personne n'a pas activé sa présence publique.
 */
export default defineNuxtPlugin(() => {
  const session = authClient.useSession()
  let timer: ReturnType<typeof setInterval> | null = null

  const beat = () => {
    if (document.visibilityState !== 'visible' || !session.value.data?.user) return
    $fetch('/api/presence', { method: 'POST' }).catch(() => {
      // Réseau coupé : le prochain battement rattrapera.
    })
  }

  watch(
    () => session.value.data?.user?.id ?? null,
    (id) => {
      if (timer) clearInterval(timer)
      timer = null
      if (!id) return
      beat()
      timer = setInterval(beat, PRESENCE_HEARTBEAT_MS)
    },
    { immediate: true },
  )

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') beat()
  })
})
