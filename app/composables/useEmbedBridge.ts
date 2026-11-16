import { z } from 'zod'

/**
 * Communication optionnelle site parent ↔ iframe via postMessage.
 * - Messages entrants acceptés uniquement depuis window.parent ET une origine de la liste blanche
 *   (NUXT_PUBLIC_EMBED_ALLOWED_ORIGINS), puis validés par schéma.
 * - Messages sortants envoyés uniquement à une origine parente autorisée (jamais à « * »).
 */
const MESSAGE_SOURCE = 'ohmydesk'

const commandSchema = z.discriminatedUnion('type', [
  z.object({ source: z.literal(MESSAGE_SOURCE), type: z.literal('ping') }),
  z.object({ source: z.literal(MESSAGE_SOURCE), type: z.literal('setAutoRotate'), value: z.boolean() }),
  z.object({ source: z.literal(MESSAGE_SOURCE), type: z.literal('rotateCamera'), degrees: z.number().min(-360).max(360) }),
  z.object({ source: z.literal(MESSAGE_SOURCE), type: z.literal('zoom'), factor: z.number().min(0.25).max(4) }),
  z.object({ source: z.literal(MESSAGE_SOURCE), type: z.literal('resetCamera') }),
  z.object({ source: z.literal(MESSAGE_SOURCE), type: z.literal('highlight'), objectId: z.string().max(64).nullable() }),
])
export type EmbedCommand = z.infer<typeof commandSchema>

export type EmbedEvent =
  | { type: 'ready'; slug: string }
  | { type: 'pong' }
  | { type: 'objectClick'; objectId: string; catalogId: string }

export function useEmbedBridge(onCommand: (command: EmbedCommand) => void) {
  const config = useRuntimeConfig()
  const allowed = new Set(
    String(config.public.embedAllowedOrigins || '')
      .split(',')
      .map((o) => o.trim().replace(/\/$/, ''))
      .filter(Boolean),
  )
  const parentOrigin = ref<string | null>(null)

  function detectParentOrigin(): string | null {
    if (window.parent === window) return null
    const ancestor = window.location.ancestorOrigins?.[0]
    let candidate = ancestor ?? null
    if (!candidate && document.referrer) {
      try {
        candidate = new URL(document.referrer).origin
      } catch {
        candidate = null
      }
    }
    return candidate && allowed.has(candidate) ? candidate : null
  }

  function send(event: EmbedEvent) {
    if (!parentOrigin.value) return
    window.parent.postMessage({ source: MESSAGE_SOURCE, ...event }, parentOrigin.value)
  }

  function onMessage(event: MessageEvent) {
    if (event.source !== window.parent || !allowed.has(event.origin)) return
    const parsed = commandSchema.safeParse(event.data)
    if (!parsed.success) return
    parentOrigin.value = event.origin
    if (parsed.data.type === 'ping') send({ type: 'pong' })
    else onCommand(parsed.data)
  }

  onMounted(() => {
    if (!allowed.size) return
    parentOrigin.value = detectParentOrigin()
    window.addEventListener('message', onMessage)
  })
  onBeforeUnmount(() => window.removeEventListener('message', onMessage))

  return { send, parentOrigin }
}
