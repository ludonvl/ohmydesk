import { MathUtils } from 'three'
import type { SceneData } from '#shared/types/scene'
import { sceneDataSchema } from '#shared/types/scene'
import type { ObjectManager } from './ObjectManager'

/**
 * Validation et (dé)sérialisation des scènes.
 * Le format est défini par le schéma zod partagé avec le serveur (#shared/types/scene).
 */
export const SceneSerializer = {
  parse(input: unknown): SceneData {
    return sceneDataSchema.parse(input)
  },

  safeParse(input: unknown) {
    return sceneDataSchema.safeParse(input)
  },

  stringify(scene: SceneData): string {
    return JSON.stringify(scene)
  },

  /** Relit les transformations depuis le moteur (utile si un outil a modifié les Object3D directement). */
  fromEngine(base: SceneData, objects: ObjectManager): SceneData {
    const round = (v: number) => Math.round(v * 1000) / 1000
    return {
      ...base,
      objects: base.objects.map((obj) => {
        const group = objects.getObject3D(obj.id)
        if (!group) return obj
        return {
          ...obj,
          position: [round(group.position.x), round(group.position.y), round(group.position.z)],
          rotation: Math.round(MathUtils.radToDeg(group.rotation.y)),
        }
      }),
    }
  },
}
