import type { ProceduralPart, Vec3 } from '../catalog/types'
import type { Avatar } from './schema'

/**
 * Figurine articulée : chaque pièce procédurale est rattachée à une articulation.
 * Repère : origine au sol entre les pieds, face avant vers +Z, gauche de la figurine vers +X.
 * Hauteur ≈ 1,68 m (tête volontairement grosse, style « jouet »), à l'échelle des bureaux (0,75 m).
 *
 * Les positions sont données en coordonnées absolues (pose de repos) puis converties
 * en coordonnées relatives au pivot de l'articulation : on anime en tournant les pivots.
 */

export const AVATAR_JOINTS = ['hips', 'spine', 'head', 'armL', 'forearmL', 'armR', 'forearmR', 'legL', 'shinL', 'legR', 'shinR'] as const
export type AvatarJoint = (typeof AVATAR_JOINTS)[number]

export interface AvatarRig {
  /** Pivot de chaque articulation, relatif à son parent ; `parent: null` = racine de la figurine. */
  joints: Record<AvatarJoint, { parent: AvatarJoint | null; pivot: Vec3 }>
  /** Pièces, positionnées relativement au pivot de leur articulation. */
  parts: { joint: AvatarJoint; part: ProceduralPart }[]
  /** Couleur de chaque slot (ceux de l'avatar + slots fixes). */
  colors: Record<string, string>
  /** Hauteur totale (sommet de la tête ou de la coiffure), en mètres. */
  height: number
}

/** Slots à couleur fixe, non personnalisables. */
const FIXED_COLORS = { eyes: '#2E2C3D', detail: '#F5F2EC', mouth: '#B5524A' }

const WIDTH: Record<Avatar['body'], { torso: number; depth: number; limb: number }> = {
  standard: { torso: 1, depth: 1, limb: 1 },
  large: { torso: 1.22, depth: 1.18, limb: 1.15 },
  fin: { torso: 0.86, depth: 0.9, limb: 0.88 },
}

const r4 = (v: number) => Math.round(v * 10000) / 10000

export function buildAvatarRig(avatar: Avatar): AvatarRig {
  const w = WIDTH[avatar.body]
  const shoulderX = r4(0.18 * w.torso + 0.06 * w.limb)
  const hipX = r4(0.09 * w.torso)

  // Pivots absolus (pose de repos).
  const abs: Record<AvatarJoint, Vec3> = {
    hips: [0, 0.8, 0],
    spine: [0, 0.84, 0],
    head: [0, 1.32, 0],
    armL: [shoulderX, 1.25, 0],
    forearmL: [shoulderX, 0.99, 0],
    armR: [-shoulderX, 1.25, 0],
    forearmR: [-shoulderX, 0.99, 0],
    legL: [hipX, 0.8, 0],
    shinL: [hipX, 0.42, 0],
    legR: [-hipX, 0.8, 0],
    shinR: [-hipX, 0.42, 0],
  }
  const parents: Record<AvatarJoint, AvatarJoint | null> = {
    hips: null,
    spine: 'hips',
    head: 'spine',
    armL: 'spine',
    forearmL: 'armL',
    armR: 'spine',
    forearmR: 'armR',
    legL: 'hips',
    shinL: 'legL',
    legR: 'hips',
    shinR: 'legR',
  }
  const joints = Object.fromEntries(
    AVATAR_JOINTS.map((j) => {
      const parent = parents[j]
      const p = abs[j]
      const base = parent ? abs[parent] : [0, 0, 0]
      return [j, { parent, pivot: [r4(p[0] - base[0]!), r4(p[1] - base[1]!), r4(p[2] - base[2]!)] as Vec3 }]
    }),
  ) as AvatarRig['joints']

  const parts: AvatarRig['parts'] = []
  /** Ajoute une pièce donnée en coordonnées absolues. */
  const add = (joint: AvatarJoint, part: ProceduralPart) => {
    const o = abs[joint]
    parts.push({ joint, part: { ...part, position: [r4(part.position[0] - o[0]), r4(part.position[1] - o[1]), r4(part.position[2] - o[2])] } })
  }
  const box = (joint: AvatarJoint, size: Vec3, position: Vec3, slot: string, radius?: number) =>
    add(joint, { shape: 'box', size: size.map(r4) as Vec3, position, slot, radius })
  const cyl = (joint: AvatarJoint, size: Vec3, position: Vec3, slot: string) => add(joint, { shape: 'cylinder', size, position, slot })

  const { top, bottom, hair, accessory } = avatar
  const longSleeves = top === 'sweat' || top === 'chemise'

  /* Torse et bassin */
  const torsoW = 0.36 * w.torso
  const torsoD = 0.21 * w.depth
  box('spine', [torsoW, 0.46, torsoD], [0, 1.07, 0], 'top', 0.05)
  if (top === 'sweat') {
    box('spine', [0.26, 0.12, 0.07], [0, 1.25, -torsoD / 2 - 0.02], 'top', 0.03) // capuche
    box('spine', [0.012, 0.12, 0.01], [0.04, 1.2, torsoD / 2], 'detail') // cordons
    box('spine', [0.012, 0.12, 0.01], [-0.04, 1.2, torsoD / 2], 'detail')
  } else if (top === 'chemise') {
    box('spine', [0.08, 0.05, 0.02], [0.055, 1.28, torsoD / 2 - 0.005], 'detail', 0.01) // col
    box('spine', [0.08, 0.05, 0.02], [-0.055, 1.28, torsoD / 2 - 0.005], 'detail', 0.01)
    box('spine', [0.014, 0.38, 0.01], [0, 1.07, torsoD / 2 + 0.002], 'detail') // patte de boutonnage
  } else if (top === 'debardeur') {
    box('spine', [torsoW * 0.5, 0.07, 0.012], [0, 1.27, torsoD / 2 + 0.001], 'skin') // encolure
  }
  box('hips', [0.34 * w.torso, 0.14, 0.2 * w.depth], [0, 0.8, 0], 'bottom', 0.04)
  if (bottom === 'jupe') box('hips', [0.4 * w.torso, 0.28, 0.27 * w.depth], [0, 0.72, 0], 'bottom', 0.05)

  /* Tête */
  cyl('head', [0.09, 0.06, 0.09], [0, 1.34, 0], 'skin')
  box('head', [0.28, 0.29, 0.26], [0, 1.505, 0.005], 'skin', 0.07)
  const faceZ = 0.137
  box('head', [0.032, 0.05, 0.012], [0.06, 1.525, faceZ], 'eyes', 0.006)
  box('head', [0.032, 0.05, 0.012], [-0.06, 1.525, faceZ], 'eyes', 0.006)
  box('head', [0.05, 0.014, 0.01], [0, 1.445, faceZ - 0.002], 'mouth', 0.004)
  box('head', [0.03, 0.015, 0.012], [0.105, 1.475, faceZ - 0.006], 'mouth', 0.006) // joues
  box('head', [0.03, 0.015, 0.012], [-0.105, 1.475, faceZ - 0.006], 'mouth', 0.006)

  /* Coiffure */
  let height = 1.65
  const cap = () => box('head', [0.3, 0.09, 0.28], [0, 1.625, -0.005], 'hair', 0.04)
  switch (hair) {
    case 'court':
      cap()
      box('head', [0.3, 0.14, 0.07], [0, 1.55, -0.11], 'hair', 0.03)
      height = 1.67
      break
    case 'mi-long':
      cap()
      box('head', [0.31, 0.26, 0.08], [0, 1.49, -0.11], 'hair', 0.03)
      box('head', [0.04, 0.2, 0.2], [0.15, 1.52, -0.02], 'hair', 0.015)
      box('head', [0.04, 0.2, 0.2], [-0.15, 1.52, -0.02], 'hair', 0.015)
      height = 1.67
      break
    case 'long':
      cap()
      box('head', [0.32, 0.46, 0.08], [0, 1.41, -0.12], 'hair', 0.035)
      box('head', [0.04, 0.3, 0.18], [0.155, 1.47, -0.02], 'hair', 0.015)
      box('head', [0.04, 0.3, 0.18], [-0.155, 1.47, -0.02], 'hair', 0.015)
      height = 1.67
      break
    case 'chignon':
      cap()
      box('head', [0.29, 0.12, 0.06], [0, 1.56, -0.11], 'hair', 0.03)
      box('head', [0.13, 0.11, 0.13], [0, 1.7, -0.06], 'hair', 0.05)
      height = 1.755
      break
    case 'afro':
      box('head', [0.4, 0.3, 0.34], [0, 1.66, -0.05], 'hair', 0.13)
      height = 1.81
      break
    case 'rase':
      box('head', [0.285, 0.03, 0.265], [0, 1.645, 0.002], 'hair', 0.012)
      height = 1.66
      break
  }

  /* Accessoire */
  switch (accessory) {
    case 'lunettes':
      box('head', [0.085, 0.06, 0.012], [0.06, 1.525, faceZ + 0.008], 'accessory', 0.012)
      box('head', [0.085, 0.06, 0.012], [-0.06, 1.525, faceZ + 0.008], 'accessory', 0.012)
      box('head', [0.05, 0.014, 0.01], [0, 1.54, faceZ + 0.008], 'accessory')
      box('head', [0.008, 0.014, 0.15], [0.143, 1.54, 0.07], 'accessory')
      box('head', [0.008, 0.014, 0.15], [-0.143, 1.54, 0.07], 'accessory')
      break
    case 'casque': {
      const bandY = hair === 'afro' ? 1.82 : hair === 'chignon' ? 1.69 : 1.69
      const sideX = hair === 'afro' ? 0.215 : 0.17
      box('head', [sideX * 2 + 0.03, 0.035, 0.06], [0, bandY, 0], 'accessory', 0.015)
      box('head', [0.03, bandY - 1.55, 0.05], [sideX, (bandY + 1.55) / 2, 0], 'accessory', 0.012)
      box('head', [0.03, bandY - 1.55, 0.05], [-sideX, (bandY + 1.55) / 2, 0], 'accessory', 0.012)
      box('head', [0.055, 0.11, 0.1], [sideX, 1.51, 0], 'accessory', 0.025)
      box('head', [0.055, 0.11, 0.1], [-sideX, 1.51, 0], 'accessory', 0.025)
      height = Math.max(height, bandY + 0.018)
      break
    }
    case 'bonnet': {
      const big = hair === 'afro' ? 1.15 : 1
      box('head', [0.31 * big, 0.16, 0.29 * big], [0, 1.64, -0.005], 'accessory', 0.06)
      box('head', [0.32 * big, 0.055, 0.3 * big], [0, 1.575, -0.005], 'accessory', 0.025)
      height = Math.max(height, 1.72)
      break
    }
    case 'casquette': {
      const big = hair === 'afro' ? 1.15 : 1
      box('head', [0.3 * big, 0.1, 0.28 * big], [0, 1.635, 0], 'accessory', 0.045)
      box('head', [0.22, 0.02, 0.12], [0, 1.6, 0.17 * big], 'accessory', 0.008)
      height = Math.max(height, 1.69)
      break
    }
  }

  /* Bras (gauche = +X, droite = -X) */
  for (const [side, x] of [['L', shoulderX], ['R', -shoulderX]] as const) {
    const arm = `arm${side}` as const
    const forearm = `forearm${side}` as const
    box(arm, [0.1 * w.limb, 0.28, 0.11 * w.limb], [x, 1.12, 0], longSleeves ? 'top' : 'skin', 0.04)
    if (top === 't-shirt') box(arm, [0.112 * w.limb, 0.14, 0.122 * w.limb], [x, 1.19, 0], 'top', 0.04) // manche courte
    box(forearm, [0.09 * w.limb, 0.24, 0.1 * w.limb], [x, 0.87, 0], longSleeves ? 'top' : 'skin', 0.035)
    box(forearm, [0.085 * w.limb, 0.09, 0.09 * w.limb], [x, 0.71, 0], 'skin', 0.035)
  }

  /* Jambes */
  const thighSlot = bottom === 'jupe' ? 'skin' : 'bottom'
  const shinSlot = bottom === 'pantalon' ? 'bottom' : 'skin'
  for (const [side, x] of [['L', hipX], ['R', -hipX]] as const) {
    const leg = `leg${side}` as const
    const shin = `shin${side}` as const
    box(leg, [0.135 * w.limb, 0.4, 0.15 * w.limb], [x, 0.61, 0], thighSlot, 0.045)
    box(shin, [0.125 * w.limb, 0.36, 0.14 * w.limb], [x, 0.24, 0], shinSlot, 0.04)
    box(shin, [0.13 * w.limb, 0.08, 0.22], [x, 0.04, 0.035], 'shoes', 0.03)
  }

  return { joints, parts, colors: { ...FIXED_COLORS, ...avatar.colors }, height: r4(height) }
}
