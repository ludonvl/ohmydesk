import type { CatalogFamily, CatalogItem, MaterialSlot, ProceduralPart, Vec3 } from '../types'

/**
 * Famille « Siège » : un axe unique, le modèle (chaque modèle a sa propre silhouette).
 * Repère : origine au centre de l'encombrement, au sol ; face avant (côté assise) vers +Z.
 * Les branches des piètements étoile sont tournées autour de Y : les vignettes isométriques
 * les dessinent sans la rotation, ce qui reste lisible à cette échelle.
 */

const INK = '#2E2C3D'
const SHELL = '#FBF8F3'
const WOOD = '#C99D70'
const CHROME = '#C9C6C0'

type ModelId = 'ergo' | 'gaming' | 'bureau' | 'direction' | 'bois' | 'tabouret' | 'fauteuil' | 'pouf'

interface ModelSpec {
  id: ModelId
  label: string
  name: string
  description: string
  materials: MaterialSlot[]
  parts: ProceduralPart[]
  tags: string[]
}

const box = (size: Vec3, position: Vec3, slot: string, radius?: number, rotation?: Vec3): ProceduralPart => ({
  shape: 'box', size, position, slot, radius, rotation,
})
const cyl = (size: Vec3, position: Vec3, slot: string): ProceduralPart => ({ shape: 'cylinder', size, position, slot })
const r3 = (v: number) => Math.round(v * 10000) / 10000
const slot = (id: string, label: string, color: string, extra: Partial<MaterialSlot> = {}): MaterialSlot => ({
  slot: id, label, default: color, customizable: true, ...extra,
})

/**
 * Piètement étoile à cinq branches sur roulettes, avec vérin jusqu'à `top` (dessous de l'assise).
 * Les branches tournées sont remplacées, dans les vignettes isométriques, par une croix alignée sur les axes.
 */
function starBase(reach: number, top: number, s = 'frame'): ProceduralPart[] {
  const parts: ProceduralPart[] = [
    cyl([0.07, 0.05, 0.07], [0, 0.075, 0], s),
    cyl([0.05, top - 0.1, 0.05], [0, 0.1 + (top - 0.1) / 2, 0], s),
  ]
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5
    const [sx, cz] = [Math.sin(a), Math.cos(a)]
    parts.push({ ...box([0.035, 0.028, reach], [r3((sx * reach) / 2), 0.064, r3((cz * reach) / 2)], s, 0.008, [0, r3(a), 0]), noIso: true })
    parts.push({ ...cyl([0.05, 0.05, 0.05], [r3(sx * (reach - 0.01)), 0.025, r3(cz * (reach - 0.01))], s), noIso: true })
  }
  const span = reach * 1.8
  parts.push(
    { ...box([span, 0.03, 0.035], [0, 0.05, 0], s), isoOnly: true },
    { ...box([0.035, 0.03, span], [0, 0.05, 0], s), isoOnly: true },
    ...[[-1, 0], [1, 0], [0, -1], [0, 1]].map(([x, z]) => ({
      ...cyl([0.045, 0.035, 0.045], [r3((x! * span) / 2), 0.0175, r3((z! * span) / 2)], s), isoOnly: true,
    })),
  )
  return parts
}

/** Quatre éléments verticaux aux coins d'un carré de demi-côté `half`. */
function corners(half: number, make: (x: number, z: number) => ProceduralPart): ProceduralPart[] {
  return [-half, half].flatMap((x) => [-half, half].map((z) => make(x, z)))
}

const MODELS: ModelSpec[] = [
  {
    // Géométrie et couleurs de l'ancienne chaise unique, inchangées : des scènes y font référence.
    id: 'ergo', label: 'Ergonomique', name: 'Chaise ergonomique',
    description: 'Chaise de bureau à roulettes avec accoudoirs.',
    materials: [slot('main', 'Assise', '#FF6B35'), slot('frame', 'Structure', INK)],
    parts: [
      cyl([0.56, 0.04, 0.56], [0, 0.03, 0], 'frame'),
      cyl([0.05, 0.38, 0.05], [0, 0.24, 0], 'frame'),
      box([0.5, 0.08, 0.48], [0, 0.47, 0], 'main', 0.03),
      box([0.04, 0.2, 0.3], [-0.27, 0.56, -0.02], 'frame', 0.01),
      box([0.04, 0.2, 0.3], [0.27, 0.56, -0.02], 'frame', 0.01),
      box([0.48, 0.62, 0.06], [0, 0.85, -0.24], 'main', 0.025),
    ],
    tags: ['ergonomique', 'roulettes', 'accoudoirs'],
  },
  {
    id: 'gaming', label: 'Gaming', name: 'Chaise gaming',
    description: 'Siège baquet à dossier haut, appui-tête et accoudoirs.',
    materials: [slot('main', 'Garnissage', '#1E1B2E'), slot('accent', 'Liserés', '#FF4FD8'), slot('frame', 'Structure', INK)],
    parts: [
      ...starBase(0.32, 0.44),
      box([0.54, 0.1, 0.52], [0, 0.49, 0], 'main', 0.03),
      box([0.07, 0.06, 0.5], [-0.25, 0.565, 0], 'accent', 0.02),
      box([0.07, 0.06, 0.5], [0.25, 0.565, 0], 'accent', 0.02),
      ...[-0.31, 0.31].flatMap((x) => [
        box([0.04, 0.18, 0.06], [x, 0.63, -0.04], 'frame', 0.01),
        box([0.08, 0.03, 0.26], [x, 0.735, -0.02], 'frame', 0.01),
      ]),
      box([0.52, 0.84, 0.1], [0, 0.98, -0.27], 'main', 0.04),
      box([0.07, 0.62, 0.12], [-0.24, 0.92, -0.25], 'accent', 0.03),
      box([0.07, 0.62, 0.12], [0.24, 0.92, -0.25], 'accent', 0.03),
      box([0.26, 0.12, 0.06], [0, 1.26, -0.2], 'accent', 0.03),
      box([0.28, 0.12, 0.05], [0, 0.72, -0.2], 'accent', 0.03),
    ],
    tags: ['gaming', 'gamer', 'baquet', 'roulettes'],
  },
  {
    id: 'bureau', label: 'Opérateur', name: 'Chaise de bureau simple',
    description: 'Chaise opérateur à roulettes, sans accoudoirs, dossier mi-hauteur.',
    materials: [slot('main', 'Assise', '#4CC9A0'), slot('frame', 'Structure', INK)],
    parts: [
      ...starBase(0.28, 0.42),
      box([0.46, 0.07, 0.44], [0, 0.455, 0.01], 'main', 0.03),
      box([0.05, 0.3, 0.03], [0, 0.6, -0.22], 'frame', 0.008),
      box([0.42, 0.32, 0.05], [0, 0.8, -0.24], 'main', 0.025),
    ],
    tags: ['opérateur', 'simple', 'roulettes', 'compact'],
  },
  {
    id: 'direction', label: 'Direction', name: 'Fauteuil de direction',
    description: 'Fauteuil capitonné à dossier haut, piètement chromé.',
    materials: [slot('main', 'Cuir', '#6B4334', { roughness: 0.45 }), slot('frame', 'Piètement', CHROME, { metalness: 0.6, roughness: 0.3 })],
    parts: [
      ...starBase(0.34, 0.42),
      box([0.56, 0.12, 0.54], [0, 0.5, 0], 'main', 0.05),
      ...[-0.3, 0.3].flatMap((x) => [
        box([0.04, 0.16, 0.04], [x, 0.62, -0.06], 'frame', 0.01),
        box([0.08, 0.05, 0.34], [x, 0.725, -0.02], 'main', 0.02),
      ]),
      box([0.56, 0.8, 0.13], [0, 1.0, -0.27], 'main', 0.05),
      box([0.5, 0.1, 0.06], [0, 1.27, -0.19], 'main', 0.04),
      box([0.46, 0.16, 0.05], [0, 0.72, -0.19], 'main', 0.04),
    ],
    tags: ['direction', 'cuir', 'chef', 'executive', 'roulettes'],
  },
  {
    id: 'bois', label: 'En bois', name: 'Chaise en bois',
    description: 'Chaise à quatre pieds en bois, galette d’assise.',
    materials: [slot('wood', 'Bois', WOOD), slot('cushion', 'Galette', SHELL, { roughness: 0.9 })],
    parts: [
      ...[-0.19, 0.19].map((x) => box([0.035, 0.44, 0.035], [x, 0.22, 0.19], 'wood')),
      ...[-0.19, 0.19].map((x) => box([0.035, 0.88, 0.035], [x, 0.44, -0.19], 'wood')),
      box([0.44, 0.03, 0.44], [0, 0.455, 0], 'wood', 0.006),
      box([0.4, 0.03, 0.38], [0, 0.485, 0.01], 'cushion', 0.012),
      box([0.36, 0.07, 0.025], [0, 0.82, -0.19], 'wood', 0.006),
      box([0.36, 0.04, 0.025], [0, 0.66, -0.19], 'wood', 0.006),
      box([0.02, 0.02, 0.36], [-0.19, 0.16, 0], 'wood'),
      box([0.02, 0.02, 0.36], [0.19, 0.16, 0], 'wood'),
    ],
    tags: ['bois', 'scandinave', 'salle à manger'],
  },
  {
    id: 'tabouret', label: 'Tabouret haut', name: 'Tabouret haut',
    description: 'Tabouret de bar à repose-pieds, pour bureau debout.',
    materials: [slot('main', 'Assise', '#FFCF5A'), slot('frame', 'Structure', INK)],
    parts: [
      cyl([0.36, 0.05, 0.36], [0, 0.735, 0], 'main'),
      ...corners(0.13, (x, z) => box([0.03, 0.71, 0.03], [x, 0.355, z], 'frame')),
      box([0.26, 0.02, 0.02], [0, 0.28, 0.13], 'frame'),
      box([0.26, 0.02, 0.02], [0, 0.28, -0.13], 'frame'),
      box([0.02, 0.02, 0.26], [0.13, 0.28, 0], 'frame'),
      box([0.02, 0.02, 0.26], [-0.13, 0.28, 0], 'frame'),
    ],
    tags: ['tabouret', 'bar', 'haut', 'debout', 'stool'],
  },
  {
    id: 'fauteuil', label: 'Fauteuil', name: 'Fauteuil lounge',
    description: 'Fauteuil cosy à coussins, pieds en bois.',
    materials: [
      slot('fabric', 'Tissu', '#A497FF', { roughness: 0.95 }),
      slot('cushion', 'Coussins', SHELL, { roughness: 0.95 }),
      slot('wood', 'Pieds', WOOD),
    ],
    parts: [
      ...[-0.33, 0.33].flatMap((x) => [-0.3, 0.3].map((z) => cyl([0.04, 0.14, 0.04], [x, 0.07, z], 'wood'))),
      box([0.78, 0.2, 0.72], [0, 0.24, 0], 'fabric', 0.04),
      box([0.54, 0.1, 0.56], [0, 0.39, 0.06], 'cushion', 0.04),
      box([0.12, 0.26, 0.72], [-0.33, 0.47, 0], 'fabric', 0.04),
      box([0.12, 0.26, 0.72], [0.33, 0.47, 0], 'fabric', 0.04),
      box([0.78, 0.42, 0.14], [0, 0.55, -0.29], 'fabric', 0.04),
      box([0.52, 0.3, 0.1], [0, 0.6, -0.18], 'cushion', 0.04),
    ],
    tags: ['fauteuil', 'lounge', 'cosy', 'canapé', 'armchair'],
  },
  {
    id: 'pouf', label: 'Pouf', name: 'Pouf',
    description: 'Pouf rond en tissu, assise d’appoint.',
    materials: [slot('main', 'Tissu', '#FF6B35', { roughness: 0.95 }), slot('band', 'Passepoil', '#2E2C3D', { roughness: 0.95 })],
    parts: [
      cyl([0.5, 0.4, 0.5], [0, 0.2, 0], 'main'),
      cyl([0.505, 0.025, 0.505], [0, 0.39, 0], 'band'),
      cyl([0.505, 0.025, 0.505], [0, 0.0125, 0], 'band'),
    ],
    tags: ['pouf', 'ottoman', 'appoint'],
  },
]

export const chairFamily: CatalogFamily = {
  id: 'chair',
  name: 'Siège',
  category: 'seating',
  axes: [{ id: 'model', label: 'Modèle', values: MODELS.map(({ id, label }) => ({ id, label })) }],
  defaults: { model: 'ergo' },
}

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

/** Identifiant historique conservé pour la chaise ergonomique : les scènes existantes y font référence. */
const chairId = (id: ModelId) => (id === 'ergo' ? { id: 'chair-ergo', slug: 'chaise-ergonomique' } : { id: `chair-${id}`, slug: `siege-${id}` })

export const chairItems: CatalogItem[] = MODELS.map((model): CatalogItem => ({
  ...chairId(model.id),
  name: model.name,
  category: 'seating',
  description: model.description,
  dimensions: model.id === 'ergo' ? { width: 0.6, height: 1.15, depth: 0.6 } : extents(model.parts),
  defaultScale: 1,
  placement: 'floor',
  materials: model.materials,
  model: { type: 'procedural', parts: model.parts },
  tags: ['chaise', 'siège', 'chair', ...model.tags],
  family: { id: chairFamily.id, options: { model: model.id } },
}))
