import type { PresenceState } from '#shared/types/presence'
import { isOnline } from '../../utils/presence'

/**
 * Présence d'un auteur, lue par le viewer et l'intégration (qui, eux, sont en cache CDN).
 * Une personne qui n'a pas activé sa présence publique est toujours « hors ligne ».
 */
export default defineEventHandler(async (event): Promise<PresenceState> => {
  const username = getRouterParam(event, 'username') ?? ''
  setHeader(event, 'Cache-Control', 'no-store')
  if (!/^[a-z0-9-]{1,30}$/i.test(username)) return { online: false }
  return { online: await isOnline(username) }
})
