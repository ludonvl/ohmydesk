import { setupCreateSchema } from '#shared/types/scene'
import { createDefaultScene } from '#shared/utils/defaultScene'
import { createId } from '#shared/utils/ids'
import { createSetup, getSetupBySlug } from '../../utils/setups'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, (b) => setupCreateSchema.parse(b ?? {}))

  if (body.fromSlug) {
    const source = await getSetupBySlug(body.fromSlug)
    if (!source || !source.isPublic) throw createError({ statusCode: 404, statusMessage: 'Setup introuvable' })
    const scene = structuredClone(source.scene)
    scene.objects = scene.objects.map((o) => ({ ...o, id: createId('o_') }))
    return createSetup({ name: body.name ?? `${source.name} (remix)`, scene })
  }

  return createSetup({ name: body.name, scene: createDefaultScene(body.template ?? 'studio') })
})
