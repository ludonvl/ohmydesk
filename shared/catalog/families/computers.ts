import type { CatalogFamily, CatalogItem, MaterialSlot, Placement, ProceduralPart, Vec3 } from '../types'

/**
 * Familles « Portable » (modèle × position) et « Ordinateur fixe » (modèle).
 * Repère : origine au centre de la base, posée sur la surface ; face avant (clavier, écran) vers +Z.
 * Les noms restent génériques ; les tags reprennent les modèles du commerce pour la recherche.
 * Les vignettes isométriques ignorent les inclinaisons (écran ouvert, support) : pièces dessinées droites.
 */

const INK = '#2E2C3D'
const r3 = (v: number) => Math.round(v * 10000) / 10000

const box = (size: Vec3, position: Vec3, slot: string, radius?: number, rotation?: Vec3): ProceduralPart => ({
  shape: 'box', size, position, slot, radius, rotation,
})

/** Encombrement approximatif (rotations ignorées), symétrique autour de l'origine en x et z. */
function extents(parts: ProceduralPart[]) {
  let [x, y, z] = [0, 0, 0]
  for (const p of parts) {
    x = Math.max(x, Math.abs(p.position[0]) + p.size[0] / 2)
    y = Math.max(y, p.position[1] + p.size[1] / 2)
    z = Math.max(z, Math.abs(p.position[2]) + p.size[2] / 2)
  }
  return { width: r3(x * 2), height: r3(y), depth: r3(z * 2) }
}

/** Ne garde que les slots réellement utilisés par les pièces (un portable fermé n'a pas d'écran visible). */
const usedSlots = (slots: MaterialSlot[], parts: ProceduralPart[]) => slots.filter((s) => parts.some((p) => p.slot === s.slot))

// ─── Portables ────────────────────────────────────────────────────────────────

type LaptopModelId = '13' | '14' | '16' | 'gaming'
type LaptopPoseId = 'ouvert' | 'support' | 'ferme'

interface LaptopSpec {
  id: LaptopModelId
  label: string
  name: string
  description: string
  /** Largeur × profondeur de la base, en mètres. */
  size: [number, number]
  /** Épaisseur de la base et de l'écran (capot). */
  thickness: [number, number]
  /** Bordure autour de la dalle ; `chin` = bordure basse (charnière). */
  bezel: number
  chin: number
  colors: { body: string; keys: string; screen: string; glow?: string }
  tags: string[]
}

const LAPTOPS: LaptopSpec[] = [
  {
    id: '13', label: '13" ultra-fin', name: 'Portable 13" ultra-fin', description: 'Portable ultra-fin 13 pouces, coque alu',
    size: [0.304, 0.215], thickness: [0.0065, 0.0048], bezel: 0.007, chin: 0.012,
    colors: { body: '#D6D4D0', keys: '#2A2A2E', screen: '#8FC8FF' },
    tags: ['13', 'ultra-fin', 'macbook air', 'macbook'],
  },
  {
    id: '14', label: '14" pro', name: 'Portable 14" pro', description: 'Portable pro 14 pouces',
    size: [0.3126, 0.221], thickness: [0.0095, 0.006], bezel: 0.006, chin: 0.012,
    colors: { body: '#5F5F64', keys: '#1C1C20', screen: '#A497FF' },
    tags: ['14', 'pro', 'macbook pro', 'macbook'],
  },
  {
    id: '16', label: '16" pro', name: 'Portable 16" pro', description: 'Grand portable pro 16 pouces',
    size: [0.356, 0.2486], thickness: [0.0105, 0.0063], bezel: 0.006, chin: 0.013,
    colors: { body: '#C9C8C4', keys: '#1C1C20', screen: '#FF8A5C' },
    tags: ['16', 'pro', 'macbook pro', 'macbook', 'grand'],
  },
  {
    id: 'gaming', label: '15" gaming', name: 'Portable gaming 15"', description: 'Portable gaming 15 pouces, clavier rétroéclairé',
    size: [0.357, 0.255], thickness: [0.017, 0.008], bezel: 0.008, chin: 0.02,
    colors: { body: INK, keys: '#16151F', screen: '#24E1FF', glow: '#FF4FD8' },
    tags: ['15', 'gaming', 'rgb'],
  },
]

const POSES: { id: LaptopPoseId; label: string; suffix: string; description: string }[] = [
  { id: 'ouvert', label: 'Ouvert', suffix: '', description: 'ouvert' },
  { id: 'support', label: 'Sur support', suffix: 'sur support', description: 'ouvert sur un support incliné' },
  { id: 'ferme', label: 'Fermé', suffix: 'fermé', description: 'fermé' },
]

export const laptopFamily: CatalogFamily = {
  id: 'laptop',
  name: 'Portable',
  category: 'computers',
  axes: [
    { id: 'model', label: 'Modèle', values: LAPTOPS.map(({ id, label }) => ({ id, label })) },
    { id: 'pose', label: 'Position', values: POSES.map(({ id, label }) => ({ id, label })) },
  ],
  defaults: { model: '14', pose: 'ouvert' },
}

/** Ouverture de l'écran : inclinaison vers l'arrière par rapport à la verticale (≈ 110° d'ouverture). */
const LID_TILT = 0.34
/** Support : inclinaison de la base et hauteur du bord avant. */
const STAND_TILT = 0.3
const STAND_FRONT = 0.05

/** Rotation autour de X (repère three.js : +Y bascule vers +Z pour un angle positif). */
const rotX = ([x, y, z]: Vec3, a: number): Vec3 => [x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)]
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const scale = (v: Vec3, k: number): Vec3 => [v[0] * k, v[1] * k, v[2] * k]
const round = (v: Vec3): Vec3 => [r3(v[0]), r3(v[1]), r3(v[2])]

/** Portable dans son repère local : base à plat, centrée, posée en y = 0. `lidAngle` = rotation X du capot. */
function laptopParts(spec: LaptopSpec, pose: LaptopPoseId, lidAngle: number): ProceduralPart[] {
  const [w, d] = spec.size
  const [tb, tl] = spec.thickness
  const parts: ProceduralPart[] = [
    box([w, tb, d], [0, tb / 2, 0], 'body', Math.min(0.006, tb / 2)),
    // Clavier (moitié arrière) et pavé tactile (moitié avant), à fleur de la base.
    box([w * 0.86, 0.0012, d * 0.42], [0, tb + 0.0006, -d * 0.16], 'keys', 0.002),
    box([w * 0.42, 0.0008, d * 0.3], [0, tb + 0.0004, d * 0.29], 'keys', 0.004),
  ]
  if (spec.colors.glow) parts.push(box([w * 0.7, 0.003, 0.004], [0, tb * 0.5, -d / 2 - 0.0015], 'glow'))

  if (pose === 'ferme') {
    // Capot rabattu : le clavier, masqué, disparaît (et son slot de couleur avec).
    return [...parts.filter((p) => p.slot !== 'keys'), box([w, tl, d], [0, tb + tl / 2, 0], 'body', Math.min(0.005, tl / 2))]
  }

  // Capot articulé sur le bord arrière de la base ; sa face avant passe par la charnière.
  const hinge: Vec3 = [0, tb, -d / 2]
  const up = rotX([0, 1, 0], lidAngle)
  const normal = rotX([0, 0, 1], lidAngle)
  const L = d
  const lidCenter = add(add(hinge, scale(up, L / 2)), scale(normal, -tl / 2))
  parts.push(box([w, L, tl], round(lidCenter), 'body', Math.min(0.005, tl / 2), [r3(lidAngle), 0, 0]))
  const ph = L - spec.bezel - spec.chin
  const screenCenter = add(add(hinge, scale(up, spec.chin + ph / 2)), scale(normal, 0.001))
  parts.push(box([w - spec.bezel * 2, ph, 0.002], round(screenCenter), 'screen', undefined, [r3(lidAngle), 0, 0]))
  return parts
}

/** Bascule toutes les pièces autour de X puis les translate (portable posé sur le support). */
function tilt(parts: ProceduralPart[], angle: number, offset: Vec3): ProceduralPart[] {
  return parts.map((p) => ({
    ...p,
    position: round(add(rotX(p.position, angle), offset)),
    rotation: [r3((p.rotation?.[0] ?? 0) + angle), 0, 0],
  }))
}

function laptopItemParts(spec: LaptopSpec, pose: LaptopPoseId): ProceduralPart[] {
  if (pose !== 'support') return laptopParts(spec, pose, -LID_TILT)
  const [w, d] = spec.size
  // Le capot compense l'inclinaison du support : l'écran garde la même inclinaison qu'à plat.
  const laptop = laptopParts(spec, 'ouvert', -LID_TILT - STAND_TILT)
  const plate = 0.004
  // Plateau incliné sous le portable : son bord avant repose à STAND_FRONT.
  const lift: Vec3 = [0, STAND_FRONT + plate + Math.sin(STAND_TILT) * (d / 2), 0]
  const backY = STAND_FRONT + Math.sin(STAND_TILT) * d
  const backZ = -Math.cos(STAND_TILT) * d / 2
  const frontZ = Math.cos(STAND_TILT) * d / 2
  const standW = w * 0.9
  return [
    ...tilt(laptop, STAND_TILT, lift),
    ...tilt([box([standW, plate, d * 0.96], [0, plate / 2, 0], 'stand', 0.002)], STAND_TILT, add(lift, [0, -plate, 0])),
    // Butée avant, montants arrière et pied.
    box([standW, 0.012, 0.006], round([0, STAND_FRONT + 0.006, frontZ + 0.003]), 'stand', 0.002),
    box([0.022, backY, 0.018], round([-standW / 2 + 0.011, backY / 2, backZ]), 'stand', 0.003),
    box([0.022, backY, 0.018], round([standW / 2 - 0.011, backY / 2, backZ]), 'stand', 0.003),
    box([0.022, STAND_FRONT, 0.018], round([-standW / 2 + 0.011, STAND_FRONT / 2, frontZ - 0.012]), 'stand', 0.003),
    box([0.022, STAND_FRONT, 0.018], round([standW / 2 - 0.011, STAND_FRONT / 2, frontZ - 0.012]), 'stand', 0.003),
    box([standW, 0.006, 0.02], round([0, 0.003, backZ]), 'stand', 0.002),
  ]
}

function laptopMaterials(spec: LaptopSpec, parts: ProceduralPart[]): MaterialSlot[] {
  return usedSlots(
    [
      { slot: 'body', label: 'Coque', default: spec.colors.body, customizable: true, metalness: 0.35, roughness: 0.45 },
      { slot: 'keys', label: 'Clavier', default: spec.colors.keys, customizable: true },
      { slot: 'screen', label: "Fond d'écran", default: spec.colors.screen, customizable: true, emissive: 0.9, roughness: 0.3 },
      { slot: 'glow', label: 'Éclairage', default: spec.colors.glow ?? '#FF4FD8', customizable: true, emissive: 1.1 },
      { slot: 'stand', label: 'Support', default: '#C9C6C0', customizable: true, metalness: 0.4, roughness: 0.4 },
    ],
    parts,
  )
}

export const laptopItems: CatalogItem[] = LAPTOPS.flatMap((spec) =>
  POSES.map((pose): CatalogItem => {
    const parts = laptopItemParts(spec, pose.id)
    const suffix = pose.id === 'ouvert' ? '' : `-${pose.id}`
    return {
      id: `laptop-${spec.id}${suffix}`,
      slug: `portable-${spec.id}${suffix}`,
      name: pose.suffix ? `${spec.name} ${pose.suffix}` : spec.name,
      category: 'computers',
      description: `${spec.description}, ${pose.description}.`,
      dimensions: extents(parts),
      defaultScale: 1,
      placement: 'surface',
      materials: laptopMaterials(spec, parts),
      model: { type: 'procedural', parts },
      tags: ['portable', 'ordinateur', 'laptop', ...spec.tags, ...(pose.id === 'support' ? ['support', 'rehausseur'] : [])],
      family: { id: laptopFamily.id, options: { model: spec.id, pose: pose.id } },
    }
  }),
)

// ─── Ordinateurs fixes ────────────────────────────────────────────────────────

interface DesktopSpec {
  id: string
  /** Identifiant et slug du catalogue (`pc-tower` existait avant la famille : des scènes y font référence). */
  itemId: string
  slug: string
  label: string
  name: string
  description: string
  placement: Placement
  materials: MaterialSlot[]
  parts: ProceduralPart[]
  tags: string[]
}

const DESKTOPS: DesktopSpec[] = [
  {
    id: 'tour', itemId: 'pc-tower', slug: 'tour-pc', label: 'Tour', name: 'Tour PC',
    description: 'Boîtier moyen tour avec panneau lumineux.',
    placement: 'floor',
    materials: [
      { slot: 'case', label: 'Boîtier', default: INK, customizable: true },
      { slot: 'glow', label: 'Éclairage', default: '#5EE6B5', customizable: true, emissive: 1.1 },
    ],
    parts: [
      box([0.22, 0.46, 0.44], [0, 0.23, 0], 'case', 0.01),
      box([0.004, 0.34, 0.32], [0.111, 0.25, 0], 'glow'),
    ],
    tags: ['tour', 'gaming'],
  },
  {
    id: 'itx', itemId: 'pc-itx', slug: 'tour-compacte', label: 'Tour ITX', name: 'Tour compacte ITX',
    description: 'Petit boîtier mini-ITX vitré, à poser sur le bureau ou au sol.',
    placement: 'surface',
    materials: [
      { slot: 'case', label: 'Boîtier', default: '#F5F2EC', customizable: true },
      { slot: 'glow', label: 'Éclairage', default: '#A497FF', customizable: true, emissive: 1.1 },
    ],
    parts: [
      box([0.17, 0.008, 0.3], [0, 0.004, 0], 'case', 0.003),
      box([0.18, 0.29, 0.33], [0, 0.153, 0], 'case', 0.012),
      box([0.004, 0.22, 0.26], [0.091, 0.16, 0], 'glow'),
      box([0.006, 0.18, 0.004], [-0.06, 0.16, 0.166], 'glow'),
    ],
    tags: ['tour', 'itx', 'compact', 'sff'],
  },
  {
    id: 'mini', itemId: 'pc-mini', slug: 'mini-pc', label: 'Mini', name: 'Mini PC',
    description: 'Ordinateur ultra-compact de 12,7 cm de côté.',
    placement: 'surface',
    materials: [
      { slot: 'body', label: 'Coque', default: '#D6D4D0', customizable: true, metalness: 0.35, roughness: 0.45 },
      { slot: 'base', label: 'Socle', default: '#2A2A2E', customizable: true },
      { slot: 'led', label: 'Voyant', default: '#FFFFFF', customizable: false, emissive: 1.4 },
    ],
    parts: [
      box([0.11, 0.004, 0.11], [0, 0.002, 0], 'base', 0.01),
      box([0.127, 0.046, 0.127], [0, 0.027, 0], 'body', 0.014),
      box([0.003, 0.003, 0.001], [0.05, 0.027, 0.0636], 'led'),
      box([0.007, 0.004, 0.001], [-0.045, 0.022, 0.0636], 'base'),
      box([0.007, 0.004, 0.001], [-0.034, 0.022, 0.0636], 'base'),
    ],
    tags: ['mini', 'compact', 'mac mini', 'nuc'],
  },
  {
    id: 'studio', itemId: 'pc-studio', slug: 'station-compacte', label: 'Station', name: 'Station compacte',
    description: 'Station de travail compacte et silencieuse, 19,7 cm de côté.',
    placement: 'surface',
    materials: [
      { slot: 'body', label: 'Coque', default: '#D6D4D0', customizable: true, metalness: 0.35, roughness: 0.45 },
      { slot: 'base', label: 'Socle et ports', default: '#2A2A2E', customizable: true },
      { slot: 'led', label: 'Voyant', default: '#FFFFFF', customizable: false, emissive: 1.4 },
    ],
    parts: [
      box([0.18, 0.004, 0.18], [0, 0.002, 0], 'base', 0.015),
      box([0.197, 0.091, 0.197], [0, 0.0495, 0], 'body', 0.02),
      // Ports en façade, grille d'aération à l'arrière.
      box([0.008, 0.004, 0.001], [-0.07, 0.035, 0.0991], 'base'),
      box([0.008, 0.004, 0.001], [-0.058, 0.035, 0.0991], 'base'),
      box([0.024, 0.003, 0.001], [-0.025, 0.035, 0.0991], 'base'),
      box([0.003, 0.003, 0.001], [0.08, 0.035, 0.0991], 'led'),
      box([0.16, 0.012, 0.001], [0, 0.012, -0.0991], 'base'),
    ],
    tags: ['station', 'compact', 'mac studio', 'création'],
  },
  {
    id: 'aio', itemId: 'pc-aio', slug: 'tout-en-un', label: 'Tout-en-un', name: 'Tout-en-un 24"',
    description: 'Ordinateur tout-en-un 24 pouces, écran et machine dans une dalle fine.',
    placement: 'surface',
    materials: [
      { slot: 'body', label: 'Coque', default: '#8FB8E8', customizable: true, metalness: 0.25, roughness: 0.45 },
      { slot: 'bezel', label: 'Bordure', default: '#F5F5F3', customizable: true },
      { slot: 'screen', label: "Fond d'écran", default: '#5AB0FF', customizable: true, emissive: 0.9, roughness: 0.3 },
    ],
    parts: [
      // Pied plat et montant incliné derrière la dalle.
      box([0.15, 0.005, 0.15], [0, 0.0025, -0.01], 'body', 0.004),
      box([0.14, 0.2, 0.006], [0, 0.11, -0.055], 'body', 0.002, [-0.25, 0, 0]),
      // Dalle : coque (menton coloré), bordure claire, écran.
      box([0.547, 0.4, 0.0115], [0, 0.26, -0.022], 'body', 0.008),
      box([0.543, 0.33, 0.001], [0, 0.293, -0.0158], 'bezel'),
      box([0.522, 0.296, 0.002], [0, 0.294, -0.0148], 'screen'),
    ],
    tags: ['tout-en-un', 'all-in-one', 'imac', '24'],
  },
]

export const desktopFamily: CatalogFamily = {
  id: 'desktop',
  name: 'Ordinateur fixe',
  category: 'computers',
  axes: [{ id: 'model', label: 'Modèle', values: DESKTOPS.map(({ id, label }) => ({ id, label })) }],
  defaults: { model: 'tour' },
}

export const desktopItems: CatalogItem[] = DESKTOPS.map((spec) => ({
  id: spec.itemId,
  slug: spec.slug,
  name: spec.name,
  category: 'computers',
  description: spec.description,
  dimensions: extents(spec.parts),
  defaultScale: 1,
  placement: spec.placement,
  materials: spec.materials,
  model: { type: 'procedural', parts: spec.parts },
  tags: ['ordinateur', 'pc', ...spec.tags],
  family: { id: desktopFamily.id, options: { model: spec.id } },
}))
