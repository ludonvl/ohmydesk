import { setupCreateSchema } from '#shared/types/scene'
import { createDefaultScene } from '#shared/utils/defaultScene'
import { createId } from '#shared/utils/ids'
import { requireUser } from '../../utils/auth'
import { createSetup, getSetupBySlug, toPublic } from '../../utils/setups'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readValidatedBody(event, (b) => setupCreateSchema.parse(b ?? {}))

  if (body.fromSlug) {
    const source = await getSetupBySlug(body.fromSlug)
    if (!source || !source.isPublic || source.hidden) throw createError({ statusCode: 404, statusMessage: 'Setup introuvable' })
    const scene = structuredClone(source.scene)
    scene.objects = scene.objects.map((o) => ({ ...o, id: createId('o_') }))
    return toPublic(await createSetup({ userId: user.id, name: body.name ?? `${source.name} (remix)`, scene }))
  }

  return toPublic(await createSetup({ userId: user.id, name: body.name, scene: createDefaultScene(body.template ?? 'studio') }))
})
