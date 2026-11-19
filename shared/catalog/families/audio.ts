import type { CatalogFamily, CatalogItem, MaterialSlot, Placement, ProceduralPart, Vec3 } from '../types'

/**
 * Familles « Casque » (modèle × rangement) et « Enceinte » (modèle).
 * Repère : origine au centre de la base, posée sur la surface ; face avant vers +Z.
 * Casque : arceau tracé en tube dans le plan XY, oreillettes en boîtes très arrondies.
 * Casque posé : tout le modèle est basculé à plat (rotation X de −90°) ; les vignettes isométriques
 * gèrent ce quart de tour pour les boîtes mais dessinent l'arceau debout.
 */

const INK = '#2E2C3D'
const SHELL = '#FBF8F3'
const r3 = (v: number) => Math.round(v * 10000) / 10000
const round = (v: Vec3): Vec3 => [r3(v[0]), r3(v[1]), r3(v[2])]

const box = (size: Vec3, position: Vec3, slot: string, radius?: number, rotation?: Vec3): ProceduralPart => ({
  shape: 'box', size, position: round(position), slot, radius, rotation,
})
const cyl = (size: Vec3, position: Vec3, slot: string, rotation?: Vec3): ProceduralPart => ({
  shape: 'cylinder', size, position: round(position), slot, rotation,
})
/** Membrane ou bague de haut-parleur sur la face avant (cylindre couché, axe selon Z). */
const disc = (diameter: number, depth: number, position: Vec3, slot: string) => cyl([diameter, depth, diameter], position, slot, [Math.PI / 2, 0, 0])

function tube(points: [number, number][], radius: number, slot: string): ProceduralPart {
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  return {
    shape: 'tube',
    slot,
    position: [0, 0, 0],
    size: [r3(Math.max(...xs) - Math.min(...xs) + radius * 2), r3(Math.max(...ys) - Math.min(...ys) + radius * 2), radius * 2],
    tube: { points: points.map(([x, y]) => [r3(x), r3(y)]), radius, smooth: true },
  }
}

/** Encombrement approximatif (rotations ignorées, sauf le quart de tour X des pièces basculées). */
function extents(parts: ProceduralPart[]) {
  let [x, y, z] = [0, 0, 0]
  for (const p of parts) {
    let [w, h, d] = p.size
    if (p.rotation && Math.abs(Math.abs(p.rotation[0]) - Math.PI / 2) < 0.01) [h, d] = [d, h]
    x = Math.max(x, Math.abs(p.position[0]) + w / 2)
    y = Math.max(y, p.position[1] + h / 2)
    z = Math.max(z, Math.abs(p.position[2]) + d / 2)
  }
  return { width: r3(x * 2), height: r3(y), depth: r3(z * 2) }
}

const usedSlots = (slots: MaterialSlot[], parts: ProceduralPart[]) => slots.filter((s) => parts.some((p) => p.slot === s.slot))

// ─── Casques ──────────────────────────────────────────────────────────────────

type HeadphoneModelId = 'studio' | 'sansfil' | 'ouvert' | 'gaming' | 'ecouteurs'
type StorageId = 'support' | 'pose'

interface HeadphoneSpec {
  id: HeadphoneModelId
  label: string
  name: string
  description: string
  /** Écart entre les centres des oreillettes. */
  width: number
  /** Oreillette : épaisseur (x), hauteur, profondeur et arrondi. */
  cup: [number, number, number, number]
  /** Hauteur du sommet de l'arceau au-dessus du centre des oreillettes. */
  bandRise: number
  bandRadius: number
  colors: { body: string; cushion: string; band: string; accent?: string; glow?: string }
  bodyFinish?: Pick<MaterialSlot, 'metalness' | 'roughness'>
  tags: string[]
}

const HEADPHONES: HeadphoneSpec[] = [
  {
    id: 'studio', label: 'Studio', name: 'Casque studio', description: 'Casque fermé circum-auriculaire',
    width: 0.19, cup: [0.036, 0.1, 0.085, 0.02], bandRise: 0.115, bandRadius: 0.007,
    colors: { body: INK, cushion: '#3A3850', band: INK }, tags: ['studio', 'fermé', 'monitoring'],
  },
  {
    id: 'sansfil', label: 'Sans fil', name: 'Casque sans fil premium', description: 'Casque sans fil à réduction de bruit, coques alu',
    width: 0.19, cup: [0.04, 0.095, 0.08, 0.016], bandRise: 0.12, bandRadius: 0.005,
    colors: { body: '#D6D4D0', cushion: '#E9E5DD', band: '#C9C6C0' }, bodyFinish: { metalness: 0.4, roughness: 0.4 },
    tags: ['sans fil', 'bluetooth', 'réduction de bruit', 'airpods max'],
  },
  {
    id: 'ouvert', label: 'Ouvert hi-fi', name: 'Casque ouvert hi-fi', description: 'Casque ouvert pour l’écoute hi-fi, coques bois et grilles',
    width: 0.2, cup: [0.03, 0.11, 0.11, 0.045], bandRise: 0.12, bandRadius: 0.006,
    colors: { body: '#8A5A3C', cushion: INK, band: INK, accent: '#B8B4AD' }, tags: ['ouvert', 'hi-fi', 'audiophile', 'bois'],
  },
  {
    id: 'gaming', label: 'Gaming', name: 'Casque gaming', description: 'Casque gaming avec micro perche et éclairage',
    width: 0.2, cup: [0.042, 0.105, 0.09, 0.02], bandRise: 0.12, bandRadius: 0.009,
    colors: { body: INK, cushion: '#16151F', band: '#16151F', accent: '#16151F', glow: '#FF4FD8' }, tags: ['gaming', 'micro', 'rgb'],
  },
  {
    id: 'ecouteurs', label: 'Écouteurs', name: 'Écouteurs sans fil', description: 'Écouteurs sans fil et leur boîtier de charge',
    width: 0, cup: [0, 0, 0, 0], bandRise: 0, bandRadius: 0,
    colors: { body: SHELL, cushion: '#D6D4D0', band: SHELL }, tags: ['écouteurs', 'intra', 'sans fil', 'airpods'],
  },
]

const STORAGES: { id: StorageId; label: string; suffix: string; description: string }[] = [
  { id: 'support', label: 'Sur support', suffix: 'sur support', description: 'sur un support de casque' },
  { id: 'pose', label: 'Posé', suffix: 'posé', description: 'posé à plat' },
]

export const headphoneFamily: CatalogFamily = {
  id: 'headphones',
  name: 'Casque',
  category: 'audio',
  axes: [
    { id: 'model', label: 'Modèle', values: HEADPHONES.map(({ id, label }) => ({ id, label })) },
    { id: 'storage', label: 'Rangement', values: STORAGES.map(({ id, label }) => ({ id, label })) },
  ],
  defaults: { model: 'studio', storage: 'support' },
}

/** Casque « porté » : centre des oreillettes en y = `cupY`, arceau au-dessus. */
function headphoneParts(spec: HeadphoneSpec, cupY: number): ProceduralPart[] {
  const [ct, ch, cd, cr] = spec.cup
  const half = spec.width / 2
  const parts: ProceduralPart[] = []
  for (const side of [-1, 1]) {
    parts.push(box([ct, ch, cd], [side * half, cupY, 0], 'body', cr))
    parts.push(box([0.022, ch * 0.9, cd * 0.9], [side * (half - ct / 2 - 0.009), cupY, 0], 'cushion', Math.min(cr, 0.0109)))
    if (spec.id === 'ouvert') parts.push(box([0.003, ch * 0.72, cd * 0.72], [side * (half + ct / 2), cupY, 0], 'accent', cr * 0.7))
    if (spec.colors.glow) parts.push(box([0.004, ch * 0.62, cd * 0.62], [side * (half + ct / 2), cupY, 0], 'glow', 0.0019))
    // Fourche : petite tige entre l'oreillette et l'arceau.
    parts.push(box([0.008, 0.03, 0.012], [side * half, cupY + ch / 2 + 0.01, 0], 'band', 0.003))
  }
  const y0 = cupY + ch / 2 + 0.022
  const top = cupY + spec.bandRise
  const arc = (from: number, to: number, inset: number, n = 13): [number, number][] =>
    Array.from({ length: n }, (_, i) => {
      const t = from + ((to - from) * i) / (n - 1)
      return [Math.cos(t) * (half - inset), y0 + (top - y0 - inset) * Math.sin(t)]
    })
  parts.push(tube(arc(Math.PI, 0, 0), spec.bandRadius, 'band'))
  // Coussin d'arceau, sous le sommet.
  parts.push(tube(arc(Math.PI * 0.72, Math.PI * 0.28, spec.bandRadius + 0.009, 7), 0.009, 'cushion'))
  if (spec.id === 'gaming') {
    // Micro perche : part de l'oreillette gauche vers l'avant, en descendant.
    parts.push(box([0.007, 0.007, 0.11], [-half - ct / 2 + 0.002, cupY - 0.03, 0.06], 'accent', 0.003, [0.45, 0, 0]))
    parts.push(box([0.014, 0.014, 0.02], [-half - ct / 2 + 0.002, cupY - 0.055, 0.112], 'accent', 0.006, [0.45, 0, 0]))
  }
  return parts
}

/** Bascule autour de X d'un quart de tour (casque couché sur le dos, arceau vers l'arrière). */
function layFlat(parts: ProceduralPart[], lift: number, shiftZ: number): ProceduralPart[] {
  return parts.map((p) => {
    const [x, y, z] = p.position
    return { ...p, position: round([x, z + lift, -y + shiftZ]), rotation: [r3((p.rotation?.[0] ?? 0) - Math.PI / 2), 0, 0] }
  })
}

function earbudParts(): ProceduralPart[] {
  const bud = (x: number, flip: number): ProceduralPart[] => [
    box([0.02, 0.02, 0.022], [x, 0.011, 0], 'body', 0.0099),
    box([0.007, 0.006, 0.03], [x + flip * 0.004, 0.004, 0.022], 'body', 0.0029),
    box([0.012, 0.004, 0.012], [x - flip * 0.004, 0.021, -0.002], 'cushion', 0.0019),
  ]
  return [
    // Boîtier de charge debout, couvercle, voyant.
    box([0.06, 0.045, 0.022], [0, 0.0225, -0.03], 'body', 0.0105),
    box([0.06, 0.0008, 0.0225], [0, 0.033, -0.03], 'cushion'),
    box([0.004, 0.004, 0.001], [0, 0.02, -0.0185], 'led'),
    ...bud(-0.022, -1),
    ...bud(0.022, 1),
  ]
}

function headphoneItemParts(spec: HeadphoneSpec, storage: StorageId): ProceduralPart[] {
  if (spec.id === 'ecouteurs') return earbudParts()
  const [, ch, cd] = spec.cup
  if (storage === 'pose') {
    const cupY = ch / 2
    return layFlat(headphoneParts(spec, cupY), cd / 2, (cupY + spec.bandRise) / 2)
  }
  // Support : socle, mât et berceau ; le coussin d'arceau (Ø 18 mm, sous l'arceau) repose sur le berceau.
  const saddleY = 0.27
  const cupY = saddleY + spec.bandRadius + 0.018 - spec.bandRise
  return [
    cyl([0.12, 0.012, 0.12], [0, 0.006, 0], 'stand'),
    box([0.022, saddleY - 0.012, 0.022], [0, 0.012 + (saddleY - 0.012) / 2, 0], 'stand', 0.005),
    box([0.1, 0.014, 0.04], [0, saddleY - 0.007, 0], 'stand', 0.006),
    ...headphoneParts(spec, cupY),
  ]
}

function headphoneMaterials(spec: HeadphoneSpec, parts: ProceduralPart[]): MaterialSlot[] {
  const earbuds = spec.id === 'ecouteurs'
  return usedSlots(
    [
      { slot: 'body', label: earbuds ? 'Écouteurs et boîtier' : 'Oreillettes', default: spec.colors.body, customizable: true, ...spec.bodyFinish },
      { slot: 'cushion', label: earbuds ? 'Embouts' : 'Coussinets', default: spec.colors.cushion, customizable: true, roughness: 0.9 },
      { slot: 'band', label: 'Arceau', default: spec.colors.band, customizable: true, ...spec.bodyFinish },
      { slot: 'accent', label: spec.id === 'ouvert' ? 'Grilles' : 'Micro', default: spec.colors.accent ?? INK, customizable: true, ...(spec.id === 'ouvert' ? { metalness: 0.5, roughness: 0.4 } : {}) },
      { slot: 'glow', label: 'Éclairage', default: spec.colors.glow ?? '#FF4FD8', customizable: true, emissive: 1.2 },
      { slot: 'led', label: 'Voyant', default: '#5EE6B5', customizable: false, emissive: 1.4 },
      { slot: 'stand', label: 'Support', default: '#C9C6C0', customizable: true, metalness: 0.4, roughness: 0.4 },
    ],
    parts,
  )
}

export const headphoneItems: CatalogItem[] = HEADPHONES.flatMap((spec) =>
  STORAGES.filter((s) => spec.id !== 'ecouteurs' || s.id === 'pose').map((storage): CatalogItem => {
    const parts = headphoneItemParts(spec, storage.id)
    const earbuds = spec.id === 'ecouteurs'
    const suffix = earbuds || storage.id === 'support' ? '' : '-pose'
    return {
      id: earbuds ? 'earbuds' : `headphones-${spec.id}${suffix}`,
      slug: earbuds ? 'ecouteurs' : `casque-${spec.id}${suffix}`,
      name: earbuds ? spec.name : `${spec.name} ${storage.suffix}`,
      category: 'audio',
      description: earbuds ? `${spec.description}.` : `${spec.description}, ${storage.description}.`,
      dimensions: extents(parts),
      defaultScale: 1,
      placement: 'surface',
      materials: headphoneMaterials(spec, parts),
      model: { type: 'procedural', parts },
      tags: ['casque', 'audio', 'headphones', ...spec.tags],
      family: { id: headphoneFamily.id, options: { model: spec.id, storage: storage.id } },
    }
  }),
)

// ─── Enceintes ────────────────────────────────────────────────────────────────

interface SpeakerSpec {
  id: string
  /** Identifiant et slug (`speaker` existait avant la famille : des scènes y font référence). */
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

const SPEAKERS: SpeakerSpec[] = [
  {
    id: 'compacte', itemId: 'speaker', slug: 'enceinte', label: 'Compacte', name: 'Enceinte compacte',
    description: 'Enceinte de bureau compacte.',
    placement: 'surface',
    materials: [
      { slot: 'body', label: 'Caisson', default: SHELL, customizable: true },
      { slot: 'cone', label: 'Membrane', default: INK, customizable: true },
    ],
    parts: [
      box([0.14, 0.24, 0.15], [0, 0.12, 0], 'body', 0.01),
      disc(0.09, 0.006, [0, 0.09, 0.076], 'cone'),
      disc(0.035, 0.006, [0, 0.18, 0.076], 'cone'),
    ],
    tags: ['compacte', 'bibliothèque'],
  },
  {
    id: 'monitoring', itemId: 'speaker-studio', slug: 'enceinte-monitoring', label: 'Monitoring', name: 'Enceinte de monitoring',
    description: 'Enceinte de studio active, grand boomer et bague colorée.',
    placement: 'surface',
    materials: [
      { slot: 'body', label: 'Caisson', default: '#1E1D2A', customizable: true },
      { slot: 'cone', label: 'Membranes', default: '#3A3850', customizable: true },
      { slot: 'accent', label: 'Bague', default: '#FFCF5A', customizable: true },
    ],
    parts: [
      box([0.17, 0.27, 0.22], [0, 0.135, 0], 'body', 0.014),
      disc(0.13, 0.004, [0, 0.085, 0.111], 'accent'),
      disc(0.115, 0.006, [0, 0.085, 0.112], 'cone'),
      disc(0.045, 0.004, [0, 0.085, 0.115], 'body'),
      disc(0.04, 0.006, [0, 0.205, 0.112], 'cone'),
      box([0.12, 0.012, 0.004], [0, 0.248, 0.111], 'accent', 0.002),
    ],
    tags: ['studio', 'monitoring', 'musique', 'production'],
  },
  {
    id: 'barre', itemId: 'soundbar', slug: 'barre-de-son', label: 'Barre de son', name: 'Barre de son',
    description: 'Barre de son fine, à glisser sous l’écran.',
    placement: 'surface',
    materials: [
      { slot: 'body', label: 'Coque', default: INK, customizable: true },
      { slot: 'grille', label: 'Tissu', default: '#4A4860', customizable: true, roughness: 0.95 },
      { slot: 'led', label: 'Voyant', default: '#FFFFFF', customizable: false, emissive: 1.4 },
    ],
    parts: [
      box([0.5, 0.06, 0.08], [0, 0.03, 0], 'body', 0.02),
      box([0.48, 0.042, 0.004], [0, 0.031, 0.039], 'grille', 0.0019),
      box([0.012, 0.002, 0.002], [0, 0.056, 0.035], 'led'),
    ],
    tags: ['barre de son', 'soundbar', 'tv'],
  },
  {
    id: 'nomade', itemId: 'speaker-portable', slug: 'enceinte-nomade', label: 'Nomade', name: 'Enceinte nomade',
    description: 'Enceinte Bluetooth cylindrique en tissu.',
    placement: 'surface',
    materials: [
      { slot: 'grille', label: 'Tissu', default: '#4CC9A0', customizable: true, roughness: 0.95 },
      { slot: 'body', label: 'Embouts', default: '#2E4A45', customizable: true },
    ],
    parts: [
      cyl([0.072, 0.012, 0.072], [0, 0.006, 0], 'body'),
      cyl([0.075, 0.16, 0.075], [0, 0.092, 0], 'grille'),
      cyl([0.072, 0.012, 0.072], [0, 0.178, 0], 'body'),
      box([0.02, 0.003, 0.004], [0, 0.12, 0.037], 'body', 0.0014),
    ],
    tags: ['bluetooth', 'portable', 'nomade', 'sans fil'],
  },
  {
    id: 'connectee', itemId: 'speaker-smart', slug: 'enceinte-connectee', label: 'Connectée', name: 'Enceinte connectée',
    description: 'Petite enceinte connectée ronde, surface tactile lumineuse.',
    placement: 'surface',
    materials: [
      { slot: 'grille', label: 'Tissu', default: '#E9E5DD', customizable: true, roughness: 0.95 },
      { slot: 'glow', label: 'Lumière', default: '#A497FF', customizable: true, emissive: 1.3 },
    ],
    parts: [
      box([0.098, 0.084, 0.098], [0, 0.042, 0], 'grille', 0.04),
      cyl([0.05, 0.002, 0.05], [0, 0.0842, 0], 'glow'),
    ],
    tags: ['connectée', 'assistant', 'smart speaker', 'homepod'],
  },
  {
    id: 'vintage', itemId: 'speaker-vintage', slug: 'enceinte-vintage', label: 'Vintage', name: 'Enceinte vintage',
    description: 'Enceinte rétro en bois, façade en tissu et boutons.',
    placement: 'surface',
    materials: [
      { slot: 'body', label: 'Bois', default: '#A0683E', customizable: true },
      { slot: 'grille', label: 'Tissu', default: '#E9DFD0', customizable: true, roughness: 0.95 },
      { slot: 'accent', label: 'Boutons', default: '#C9C6C0', customizable: true, metalness: 0.5, roughness: 0.4 },
    ],
    parts: [
      box([0.26, 0.16, 0.13], [0, 0.08, 0], 'body', 0.012),
      box([0.17, 0.12, 0.004], [-0.035, 0.08, 0.065], 'grille', 0.004),
      disc(0.024, 0.012, [0.093, 0.105, 0.068], 'accent'),
      disc(0.024, 0.012, [0.093, 0.06, 0.068], 'accent'),
    ],
    tags: ['vintage', 'rétro', 'bois', 'radio'],
  },
  {
    id: 'caisson', itemId: 'subwoofer', slug: 'caisson-de-basses', label: 'Caisson de basses', name: 'Caisson de basses',
    description: 'Caisson de basses à poser au sol, sous le bureau.',
    placement: 'floor',
    materials: [
      { slot: 'body', label: 'Caisson', default: INK, customizable: true },
      { slot: 'cone', label: 'Membrane', default: '#3A3850', customizable: true },
    ],
    parts: [
      box([0.3, 0.31, 0.3], [0, 0.165, 0], 'body', 0.012),
      disc(0.21, 0.008, [0, 0.165, 0.151], 'cone'),
      disc(0.07, 0.006, [0, 0.165, 0.156], 'body'),
      ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => cyl([0.03, 0.01, 0.03], [sx * 0.12, 0.005, sz * 0.12], 'cone'))),
    ],
    tags: ['caisson', 'subwoofer', 'basses'],
  },
]

export const speakerFamily: CatalogFamily = {
  id: 'speaker',
  name: 'Enceinte',
  category: 'audio',
  axes: [{ id: 'model', label: 'Modèle', values: SPEAKERS.map(({ id, label }) => ({ id, label })) }],
  defaults: { model: 'compacte' },
}

export const speakerItems: CatalogItem[] = SPEAKERS.map((spec) => ({
  id: spec.itemId,
  slug: spec.slug,
  name: spec.name,
  category: 'audio',
  description: spec.description,
  dimensions: extents(spec.parts),
  defaultScale: 1,
  placement: spec.placement,
  materials: spec.materials,
  model: { type: 'procedural', parts: spec.parts },
  tags: ['enceinte', 'audio', 'speaker', ...spec.tags],
  family: { id: speakerFamily.id, options: { model: spec.id } },
}))
