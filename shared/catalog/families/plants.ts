import type { CatalogFamily, CatalogItem, MaterialSlot, Placement, ProceduralPart, Vec3 } from '../types'

/**
 * Famille « Plante ».
 * Repère : origine au centre du pot, posé au sol ou sur une surface ; face avant vers +Z.
 * Feuillage stylisé : boules (boîtes très arrondies), lames et tubes ; slots `pot`, `leaves`, `leaves2`
 * partout, plus `accent` (fleurs, tronc…) selon le modèle.
 * Les vignettes isométriques ignorent les rotations (lames, palmes) : pièces dessinées droites.
 */

const WHITE = '#FBF8F3'
const TERRACOTTA = '#D9855F'
const GREEN = '#3FAE7A'
const GREEN_LIGHT = '#5CC992'
const GREEN_DARK = '#2F7A55'
const r3 = (v: number) => Math.round(v * 10000) / 10000
const rv = (v: Vec3): Vec3 => [r3(v[0]), r3(v[1]), r3(v[2])]

const box = (size: Vec3, position: Vec3, slot: string, radius?: number, rotation?: Vec3): ProceduralPart => ({
  shape: 'box', size: rv(size), position: rv(position), slot, radius, rotation: rotation && rv(rotation),
})
const cyl = (size: Vec3, position: Vec3, slot: string): ProceduralPart => ({ shape: 'cylinder', size: rv(size), position: rv(position), slot })
/** Boule (ou ellipsoïde aplati si `h` < `d`). */
const ball = (d: number, position: Vec3, slot: string, h = d): ProceduralPart => box([d, h, d], position, slot, Math.min(d, h) / 2 - 0.0002)

function tube(points: [number, number][], radius: number, slot: string, position: Vec3 = [0, 0, 0], rotation?: Vec3): ProceduralPart {
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  return {
    shape: 'tube',
    slot,
    position: rv(position),
    rotation: rotation && rv(rotation),
    size: [r3(Math.max(...xs) - Math.min(...xs) + radius * 2), r3(Math.max(...ys) - Math.min(...ys) + radius * 2), radius * 2],
    tube: { points: points.map(([x, y]) => [r3(x), r3(y)]), radius, smooth: true },
  }
}

function extents(parts: ProceduralPart[]) {
  let [x, y0, y1, z] = [0, 0, 0, 0]
  for (const p of parts) {
    const [w, h, d] = p.size
    // Tube tourné autour de Y : son tracé peut pointer dans toutes les directions horizontales.
    const reach = p.tube && p.rotation ? Math.max(w, d) : 0
    x = Math.max(x, Math.abs(p.position[0]) + Math.max(w / 2, reach))
    z = Math.max(z, Math.abs(p.position[2]) + Math.max(d / 2, reach))
    y0 = Math.min(y0, p.position[1] - h / 2)
    y1 = Math.max(y1, p.position[1] + h / 2)
  }
  return { width: r3(x * 2), height: r3(y1 - y0), depth: r3(z * 2) }
}

/** Points répartis sur un cercle (feuillage, tiges). */
const around = (n: number, radius: number, offset = 0) =>
  Array.from({ length: n }, (_, i) => {
    const a = offset + (i / n) * Math.PI * 2
    return { a, x: Math.cos(a) * radius, z: Math.sin(a) * radius }
  })

const pot = (color: string, label = 'Pot'): MaterialSlot => ({ slot: 'pot', label, default: color, customizable: true })
const leaves = (color: string, label = 'Feuillage'): MaterialSlot => ({ slot: 'leaves', label, default: color, customizable: true, roughness: 0.8 })
const leaves2 = (color: string, label = 'Feuillage clair'): MaterialSlot => ({ slot: 'leaves2', label, default: color, customizable: true, roughness: 0.8 })
const accent = (label: string, color: string, extra: Partial<MaterialSlot> = {}): MaterialSlot => ({ slot: 'accent', label, default: color, customizable: true, ...extra })

interface PlantSpec {
  id: string
  /** `plant-monstera` et `plant-succulent` existaient avant la famille : des scènes y font référence. */
  itemId: string
  slug: string
  label: string
  name: string
  description: string
  placement: Placement
  materials: MaterialSlot[]
  parts: ProceduralPart[]
  glb?: CatalogItem['glb']
  tags: string[]
}

const PLANTS: PlantSpec[] = [
  {
    id: 'monstera', itemId: 'plant-monstera', slug: 'monstera', label: 'Monstera', name: 'Monstera',
    description: 'Grande plante verte en pot.',
    placement: 'floor',
    materials: [pot(WHITE), leaves(GREEN), leaves2(GREEN_LIGHT)],
    parts: [
      cyl([0.32, 0.34, 0.32], [0, 0.17, 0], 'pot'),
      box([0.5, 0.34, 0.5], [0, 0.5, 0], 'leaves', 0.08),
      box([0.32, 0.28, 0.32], [0.04, 0.78, -0.02], 'leaves2', 0.07),
    ],
    tags: ['monstera', 'tropicale', 'grande'],
  },
  {
    id: 'succulente', itemId: 'plant-succulent', slug: 'succulente', label: 'Succulente', name: 'Succulente',
    description: 'Petite plante grasse pour le bureau.',
    placement: 'surface',
    materials: [pot('#E3A587'), leaves('#5E8C61')],
    glb: { path: 'models/succulent-v1.glb' },
    parts: [cyl([0.09, 0.08, 0.09], [0, 0.04, 0], 'pot'), box([0.11, 0.08, 0.11], [0, 0.12, 0], 'leaves', 0.03)],
    tags: ['succulente', 'plante grasse', 'petite'],
  },
  {
    id: 'cactus', itemId: 'plant-cactus', slug: 'cactus', label: 'Cactus', name: 'Cactus',
    description: 'Cactus colonne à deux bras, petite fleur au sommet.',
    placement: 'surface',
    materials: [pot(TERRACOTTA), leaves('#4E9A6A', 'Cactus'), accent('Fleur', '#FF6B9A')],
    parts: [
      cyl([0.11, 0.1, 0.11], [0, 0.05, 0], 'pot'),
      box([0.06, 0.26, 0.06], [0, 0.22, 0], 'leaves', 0.0299),
      box([0.05, 0.035, 0.035], [-0.045, 0.2, 0], 'leaves', 0.0174),
      box([0.034, 0.09, 0.034], [-0.065, 0.25, 0], 'leaves', 0.0169),
      box([0.05, 0.035, 0.035], [0.045, 0.26, 0], 'leaves', 0.0174),
      box([0.032, 0.07, 0.032], [0.065, 0.3, 0], 'leaves', 0.0159),
      ball(0.026, [0, 0.355, 0], 'accent', 0.018),
    ],
    tags: ['cactus', 'plante grasse', 'désert'],
  },
  {
    id: 'ficus', itemId: 'plant-ficus', slug: 'ficus-lyre', label: 'Ficus lyre', name: 'Ficus lyre',
    description: 'Petit arbre d’intérieur à grandes feuilles, tronc fin.',
    placement: 'floor',
    materials: [pot('#2E2C3D'), leaves(GREEN_DARK), leaves2(GREEN), accent('Tronc', '#8A5A3C')],
    parts: [
      cyl([0.3, 0.32, 0.3], [0, 0.16, 0], 'pot'),
      cyl([0.03, 0.75, 0.03], [0, 0.69, 0], 'accent'),
      ball(0.3, [0, 1.15, 0], 'leaves', 0.26),
      ball(0.24, [-0.13, 1.0, 0.06], 'leaves2', 0.2),
      ball(0.22, [0.12, 1.3, -0.05], 'leaves2', 0.2),
      ball(0.2, [0.14, 0.98, 0.02], 'leaves', 0.18),
      ball(0.18, [-0.06, 1.38, 0.05], 'leaves', 0.16),
    ],
    tags: ['ficus', 'arbre', 'grande'],
  },
  {
    id: 'sansevieria', itemId: 'plant-snake', slug: 'sansevieria', label: 'Sansevieria', name: 'Sansevieria',
    description: 'Langue de belle-mère : hautes feuilles dressées.',
    placement: 'floor',
    materials: [pot('#E9E5DD'), leaves('#3E6B4A'), leaves2('#9BBF6A', 'Bordures')],
    parts: [
      box([0.24, 0.26, 0.24], [0, 0.13, 0], 'pot', 0.02),
      ...around(7, 0.06, 0.3).map(({ a, x, z }, i) => {
        const h = 0.42 + ((i * 5) % 4) * 0.07
        const lean = 0.14 + (i % 3) * 0.06
        return box([0.05, h, 0.012], [x, 0.26 + h / 2, z], i % 2 ? 'leaves' : 'leaves2', 0.005, [Math.sin(a) * lean, -a, -Math.cos(a) * lean])
      }),
    ],
    tags: ['sansevieria', 'langue de belle-mère', 'snake plant'],
  },
  {
    id: 'pothos', itemId: 'plant-pothos', slug: 'pothos-retombant', label: 'Pothos', name: 'Pothos retombant',
    description: 'Plante retombante, parfaite au bord d’une étagère.',
    placement: 'surface',
    materials: [pot(WHITE), leaves(GREEN), leaves2('#A8D672', 'Feuilles panachées')],
    parts: [
      cyl([0.14, 0.12, 0.14], [0, 0.06, 0], 'pot'),
      ball(0.17, [0, 0.14, 0], 'leaves', 0.08),
      // Lianes qui débordent du pot et courent sur la surface, ponctuées de feuilles
      // (rien sous y = 0 : la plante peut se poser au milieu d'un bureau).
      ...([[-0.03, 0.18, 0.35], [0.03, 0.26, 0.5], [0.04, 0.14, -0.6]] as const).flatMap(([x, len, rot]) => {
        const pts: [number, number][] = [[0, 0.13], [0.07, 0.13], [0.1, 0.06], [0.12 + len * 0.6, 0.012]]
        return [
          tube(pts, 0.003, 'leaves', [x, 0, 0.02], [0, -Math.PI / 2 + rot, 0]),
          ...pts.slice(1).map(([px, py], k) => {
            const ang = -Math.PI / 2 + rot
            return ball(0.03, [x + Math.cos(ang) * px, py - 0.01, 0.02 - Math.sin(ang) * px], k % 2 ? 'leaves2' : 'leaves', 0.016)
          }),
        ]
      }),
    ],
    tags: ['pothos', 'retombante', 'suspendue', 'liane'],
  },
  {
    id: 'bonsai', itemId: 'plant-bonsai', slug: 'bonsai', label: 'Bonsaï', name: 'Bonsaï',
    description: 'Bonsaï en coupe plate, tronc sinueux et plateaux de feuillage.',
    placement: 'surface',
    materials: [pot('#3B4A6B', 'Coupe'), leaves(GREEN_DARK), leaves2(GREEN), accent('Tronc', '#6B4A33')],
    parts: [
      box([0.22, 0.045, 0.14], [0, 0.0225, 0], 'pot', 0.006),
      box([0.2, 0.006, 0.12], [0, 0.047, 0], 'accent'),
      tube([[0, 0.05], [0.02, 0.1], [-0.025, 0.15], [0.01, 0.2], [0.05, 0.23]], 0.011, 'accent'),
      ball(0.13, [-0.04, 0.17, 0], 'leaves', 0.045),
      ball(0.12, [0.06, 0.24, 0], 'leaves2', 0.045),
      ball(0.09, [-0.01, 0.27, -0.01], 'leaves', 0.04),
    ],
    tags: ['bonsaï', 'zen', 'japon', 'arbre'],
  },
  {
    id: 'palmier', itemId: 'plant-palm', slug: 'palmier', label: 'Palmier', name: 'Palmier d’intérieur',
    description: 'Palmier en panier tressé, longues palmes arquées.',
    placement: 'floor',
    materials: [pot('#C9A26B', 'Panier'), leaves(GREEN), accent('Tiges', '#7E9C5A')],
    parts: [
      cyl([0.34, 0.3, 0.34], [0, 0.15, 0], 'pot'),
      cyl([0.36, 0.03, 0.36], [0, 0.29, 0], 'pot'),
      ...around(8, 0, 0.2).flatMap(({ a }, i) => {
        const len = 0.5 + (i % 3) * 0.12
        const pts: [number, number][] = [[0, 0.3], [len * 0.35, 0.3 + len * 0.95], [len * 0.75, 0.3 + len * 1.05], [len, 0.3 + len * 0.75]]
        // Folioles en travers de la palme, de plus en plus courtes vers la pointe.
        const leaflet = ([px, py]: [number, number], span: number): ProceduralPart =>
          box([0.05, 0.008, span], [Math.cos(a) * px, py, -Math.sin(a) * px], 'leaves', 0.004, [0, a, 0])
        const mid = (u: [number, number], v: [number, number], k: number): [number, number] => [u[0] + (v[0] - u[0]) * k, u[1] + (v[1] - u[1]) * k]
        return [
          tube(pts, 0.006, 'accent', [0, 0, 0], [0, a, 0]),
          leaflet(mid(pts[0]!, pts[1]!, 0.75), 0.26),
          leaflet(mid(pts[1]!, pts[2]!, 0.4), 0.24),
          leaflet(pts[2]!, 0.2),
          leaflet(mid(pts[2]!, pts[3]!, 0.5), 0.14),
        ]
      }),
    ],
    tags: ['palmier', 'kentia', 'tropicale', 'grande'],
  },
  {
    id: 'bambou', itemId: 'plant-bamboo', slug: 'bambou', label: 'Bambou', name: 'Bambou en vase',
    description: 'Tiges de bambou porte-bonheur dans un vase en verre.',
    placement: 'surface',
    materials: [
      { slot: 'pot', label: 'Vase', default: '#BFE3E8', customizable: true, opacity: 0.55, roughness: 0.1 },
      leaves(GREEN_LIGHT, 'Feuilles'),
      accent('Tiges', '#9BBF6A'),
    ],
    parts: [
      cyl([0.1, 0.16, 0.1], [0, 0.08, 0], 'pot'),
      ...([[-0.02, 0.38], [0.02, 0.3], [0, 0.46], [0.025, 0.42]] as const).flatMap(([x, h], i) => {
        const z = (i % 2 ? -1 : 1) * 0.015
        return [
          cyl([0.012, h, 0.012], [x, h / 2, z], 'accent'),
          cyl([0.015, 0.006, 0.015], [x, h * 0.55, z], 'accent'),
          box([0.07, 0.008, 0.025], [x + 0.03, h - 0.02, z], 'leaves', 0.004, [0, 0, 0.5]),
          box([0.06, 0.008, 0.022], [x - 0.025, h - 0.05, z], 'leaves', 0.004, [0, 0, -0.5]),
        ]
      }),
    ],
    tags: ['bambou', 'lucky bamboo', 'zen', 'vase'],
  },
  {
    id: 'aromatiques', itemId: 'plant-herbs', slug: 'jardiniere-aromatiques', label: 'Aromatiques', name: 'Jardinière d’aromatiques',
    description: 'Jardinière en bois : basilic, menthe et romarin.',
    placement: 'surface',
    materials: [pot('#C99D70', 'Jardinière'), leaves('#4CA35A', 'Basilic'), leaves2('#7CC46A', 'Menthe'), accent('Romarin', '#5E7F66')],
    parts: [
      box([0.42, 0.1, 0.14], [0, 0.05, 0], 'pot', 0.006),
      box([0.4, 0.008, 0.12], [0, 0.098, 0], 'accent'),
      ball(0.12, [-0.13, 0.15, 0], 'leaves', 0.1),
      ball(0.13, [0, 0.14, 0], 'leaves2', 0.08),
      ...[-0.03, -0.01, 0.01, 0.03].map((dx, i) => box([0.008, 0.16 + (i % 2) * 0.03, 0.008], [0.13 + dx, 0.18 + (i % 2) * 0.015, (i % 2 ? 1 : -1) * 0.01], 'accent', 0.003)),
    ],
    tags: ['aromatiques', 'herbes', 'basilic', 'cuisine', 'jardinière'],
  },
  {
    id: 'fleurs', itemId: 'plant-flowers', slug: 'bouquet-de-fleurs', label: 'Fleurs', name: 'Bouquet de fleurs',
    description: 'Bouquet de tulipes dans un vase en céramique.',
    placement: 'surface',
    materials: [pot('#F6E3D4', 'Vase'), leaves(GREEN, 'Tiges et feuilles'), accent('Fleurs', '#FF6B6B'), leaves2('#FFCF5A', 'Fleurs 2')],
    parts: [
      box([0.1, 0.18, 0.1], [0, 0.09, 0], 'pot', 0.035),
      ...around(5, 0.025, 0.4).flatMap(({ a, x, z }, i) => {
        const h = 0.34 + (i % 3) * 0.04
        const lean = 0.06 + (i % 2) * 0.03
        const tx = x + Math.cos(a) * lean
        const tz = z + Math.sin(a) * lean
        return [
          tube([[0, 0.17], [Math.hypot(tx, tz) * 0.5, (0.17 + h) / 2], [Math.hypot(tx, tz), h]], 0.003, 'leaves', [0, 0, 0], [0, -a, 0]),
          ball(0.04, [tx, h + 0.022, tz], i % 2 ? 'leaves2' : 'accent', 0.05),
        ]
      }),
      box([0.03, 0.11, 0.008], [0.03, 0.22, 0.03], 'leaves', 0.004, [0.2, 0.6, -0.35]),
      box([0.03, 0.1, 0.008], [-0.03, 0.21, -0.02], 'leaves', 0.004, [-0.2, -0.5, 0.35]),
    ],
    tags: ['fleurs', 'tulipes', 'bouquet', 'vase'],
  },
  {
    id: 'murale', itemId: 'plant-wall', slug: 'jardiniere-murale', label: 'Murale', name: 'Jardinière murale',
    description: 'Pot accroché au mur, feuillage qui retombe.',
    placement: 'wall',
    materials: [pot(TERRACOTTA), leaves(GREEN), leaves2(GREEN_LIGHT), accent('Support', '#2E2C3D', { metalness: 0.4, roughness: 0.4 })],
    parts: [
      box([0.16, 0.012, 0.012], [0, 0.06, 0.006], 'accent', 0.004),
      box([0.012, 0.13, 0.012], [0, 0, 0.006], 'accent', 0.004),
      box([0.16, 0.012, 0.14], [0, -0.06, 0.08], 'accent', 0.004),
      cyl([0.14, 0.12, 0.14], [0, 0, 0.08], 'pot'),
      ball(0.18, [0, 0.07, 0.08], 'leaves', 0.09),
      ...([[-0.05, 0.2], [0.03, 0.28], [0.07, 0.15]] as const).flatMap(([x, len], i) => [
        tube([[0, 0.06], [0.01, -len * 0.4], [-0.005, -len]], 0.003, 'leaves', [x, 0, 0.13]),
        ball(0.03, [x + 0.005, -len * 0.45, 0.13], i % 2 ? 'leaves' : 'leaves2', 0.016),
        ball(0.028, [x - 0.005, -len + 0.01, 0.13], i % 2 ? 'leaves2' : 'leaves', 0.015),
      ]),
    ],
    tags: ['murale', 'suspendue', 'retombante'],
  },
]

export const plantFamily: CatalogFamily = {
  id: 'plant',
  name: 'Plante',
  category: 'plants',
  axes: [{ id: 'model', label: 'Modèle', values: PLANTS.map(({ id, label }) => ({ id, label })) }],
  defaults: { model: 'monstera' },
}

export const plantItems: CatalogItem[] = PLANTS.map((spec) => ({
  id: spec.itemId,
  slug: spec.slug,
  name: spec.name,
  category: 'plants',
  description: spec.description,
  dimensions: extents(spec.parts),
  defaultScale: 1,
  placement: spec.placement,
  materials: spec.materials,
  ...(spec.glb ? { glb: spec.glb } : {}),
  model: { type: 'procedural', parts: spec.parts },
  tags: ['plante', 'vert', 'plant', ...spec.tags],
  family: { id: plantFamily.id, options: { model: spec.id } },
}))
