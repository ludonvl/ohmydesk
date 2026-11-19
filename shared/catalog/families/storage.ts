import type { CatalogFamily, CatalogItem, MaterialSlot, Placement, ProceduralPart, Vec3 } from '../types'

/**
 * Familles de rangement : « Meuble à casiers » (format × aménagement), « Meuble de rangement » (modèle)
 * et « Vitrine » (modèle × éclairage).
 * Repère : origine au centre de la base, au sol ; façade vers +Z. Vitrine murale : origine au centre
 * de la face arrière, contre le mur (comme les posters).
 * Les objets « surface » se posent sur le dessus et sur les étagères visibles ; le verre (slot `glass`,
 * opacité < 1) laisse passer le pointeur et n'est pas dessiné dans les vignettes.
 */

const INK = '#2E2C3D'
const WHITE = '#F5F2EC'
const OAK = '#C99D70'
const r3 = (v: number) => Math.round(v * 10000) / 10000

const box = (size: Vec3, position: Vec3, slot: string, radius?: number): ProceduralPart => ({
  shape: 'box', size: [r3(size[0]), r3(size[1]), r3(size[2])], position: [r3(position[0]), r3(position[1]), r3(position[2])], slot, radius,
})
const cyl = (size: Vec3, position: Vec3, slot: string): ProceduralPart => ({
  shape: 'cylinder', size, position: [r3(position[0]), r3(position[1]), r3(position[2])], slot,
})

function extents(parts: ProceduralPart[]) {
  let [x, y0, y1, z] = [0, 0, 0, 0]
  for (const p of parts) {
    x = Math.max(x, Math.abs(p.position[0]) + p.size[0] / 2)
    y0 = Math.min(y0, p.position[1] - p.size[1] / 2)
    y1 = Math.max(y1, p.position[1] + p.size[1] / 2)
    z = Math.max(z, Math.abs(p.position[2]) + p.size[2] / 2)
  }
  return { width: r3(x * 2), height: r3(y1 - y0), depth: r3(z * 2) }
}

const usedSlots = (slots: MaterialSlot[], parts: ProceduralPart[]) => slots.filter((s) => parts.some((p) => p.slot === s.slot))

const GLASS: MaterialSlot = { slot: 'glass', label: 'Verre', default: '#DCEFF5', customizable: false, opacity: 0.22, roughness: 0.05 }

/** Caisson : côtés, dessus, dessous et fond, de `t` d'épaisseur ; base posée en y = `y0`. */
function carcass(w: number, h: number, d: number, t: number, slot: string, y0 = 0, back = 0.006): ProceduralPart[] {
  return [
    box([t, h, d], [-w / 2 + t / 2, y0 + h / 2, 0], slot),
    box([t, h, d], [w / 2 - t / 2, y0 + h / 2, 0], slot),
    box([w - 2 * t, t, d], [0, y0 + h - t / 2, 0], slot),
    box([w - 2 * t, t, d], [0, y0 + t / 2, 0], slot),
    box([w - 2 * t, h - 2 * t, back], [0, y0 + h / 2, -d / 2 + back / 2], slot),
  ]
}

// ─── Meuble à casiers ─────────────────────────────────────────────────────────

type CubeFormatId = '2x2' | '1x4' | '4x1' | '2x4' | '4x2' | '4x4'
type FillId = 'vide' | 'boites' | 'portes'

const CUBE_FORMATS: { id: CubeFormatId; label: string; cols: number; rows: number }[] = [
  { id: '2x2', label: '2 × 2', cols: 2, rows: 2 },
  { id: '1x4', label: '1 × 4', cols: 1, rows: 4 },
  { id: '4x1', label: '4 × 1 (banc)', cols: 4, rows: 1 },
  { id: '2x4', label: '2 × 4', cols: 2, rows: 4 },
  { id: '4x2', label: '4 × 2', cols: 4, rows: 2 },
  { id: '4x4', label: '4 × 4', cols: 4, rows: 4 },
]

const FILLS: { id: FillId; label: string; suffix: string }[] = [
  { id: 'vide', label: 'Vide', suffix: '' },
  { id: 'boites', label: 'Boîtes', suffix: 'avec boîtes' },
  { id: 'portes', label: 'Portes', suffix: 'avec portes' },
]

export const cubeShelfFamily: CatalogFamily = {
  id: 'cube-shelf',
  name: 'Meuble à casiers',
  category: 'storage',
  axes: [
    { id: 'format', label: 'Format', values: CUBE_FORMATS.map(({ id, label }) => ({ id, label })) },
    { id: 'fill', label: 'Aménagement', values: FILLS.map(({ id, label }) => ({ id, label })) },
  ],
  defaults: { format: '2x2', fill: 'vide' },
}

/** Casier de 33,5 cm, cadre de 4 cm, séparations de 1,6 cm, profondeur 39 cm. */
const CELL = 0.335
const OUTER = 0.04
const INNER = 0.016
const CUBE_DEPTH = 0.39

function cubeShelfParts(cols: number, rows: number, fill: FillId): ProceduralPart[] {
  const w = cols * CELL + (cols - 1) * INNER + OUTER * 2
  const h = rows * CELL + (rows - 1) * INNER + OUTER * 2
  const d = CUBE_DEPTH
  const parts = carcass(w, h, d, OUTER, 'frame', 0, 0.004)
  const cellX = (c: number) => -w / 2 + OUTER + CELL / 2 + c * (CELL + INNER)
  const cellY = (r: number) => OUTER + CELL / 2 + r * (CELL + INNER)
  for (let c = 1; c < cols; c++) parts.push(box([INNER, h - 2 * OUTER, d - 0.004], [cellX(c) - CELL / 2 - INNER / 2, h / 2, 0.002], 'frame'))
  for (let r = 1; r < rows; r++) {
    for (let c = 0; c < cols; c++) parts.push(box([CELL, INNER, d - 0.004], [cellX(c), cellY(r) - CELL / 2 - INNER / 2, 0.002], 'frame'))
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c
      if (fill === 'boites' && (r + c) % 2 === 0) {
        // Boîte en tissu, légèrement en retrait, poignée découpée.
        parts.push(box([CELL - 0.012, CELL - 0.02, d - 0.04], [cellX(c), cellY(r) - 0.008, 0.01], i % 3 === 0 ? 'bins2' : 'bins', 0.006))
        parts.push(box([0.07, 0.022, 0.002], [cellX(c), cellY(r) + CELL * 0.28, d / 2 - 0.009], 'frame', 0.008))
      }
      if (fill === 'portes' && (r + c) % 2 === 1) {
        parts.push(box([CELL - 0.003, CELL - 0.003, 0.016], [cellX(c), cellY(r), d / 2 - 0.008], 'doors', 0.002))
        parts.push(cyl([0.016, 0.012, 0.016], [cellX(c) + CELL / 2 - 0.035, cellY(r), d / 2 + 0.001], 'handle'))
      }
    }
  }
  return parts
}

export const cubeShelfItems: CatalogItem[] = CUBE_FORMATS.flatMap((format) =>
  FILLS.map((fill): CatalogItem => {
    const parts = cubeShelfParts(format.cols, format.rows, fill.id)
    const dims = extents(parts)
    const suffix = fill.id === 'vide' ? '' : `-${fill.id}`
    const name = `Meuble à casiers ${format.cols} × ${format.rows}`
    return {
      id: `cube-shelf-${format.id}${suffix}`,
      slug: `meuble-casiers-${format.id}${suffix}`,
      name: fill.suffix ? `${name} ${fill.suffix}` : name,
      category: 'storage',
      description: `Meuble à ${format.cols * format.rows} casiers carrés de 33 cm${fill.suffix ? `, ${fill.suffix}` : ''}.`,
      dimensions: dims,
      defaultScale: 1,
      placement: 'floor',
      surface: { height: dims.height },
      materials: usedSlots(
        [
          { slot: 'frame', label: 'Structure', default: WHITE, customizable: true },
          { slot: 'bins', label: 'Boîtes', default: '#A497FF', customizable: true, roughness: 0.95 },
          { slot: 'bins2', label: 'Boîtes accent', default: '#FFCF5A', customizable: true, roughness: 0.95 },
          { slot: 'doors', label: 'Portes', default: OAK, customizable: true },
          { slot: 'handle', label: 'Boutons', default: INK, customizable: true },
        ],
        parts,
      ),
      model: { type: 'procedural', parts },
      tags: ['rangement', 'casiers', 'cube', 'étagère', 'kallax', ...(fill.id === 'boites' ? ['boîtes', 'paniers'] : [])],
      family: { id: cubeShelfFamily.id, options: { format: format.id, fill: fill.id } },
    }
  }),
)

// ─── Meubles de rangement ─────────────────────────────────────────────────────

interface FurnitureSpec {
  id: string
  label: string
  name: string
  description: string
  placement: Placement
  materials: MaterialSlot[]
  parts: ProceduralPart[]
  tags: string[]
}

/** Façades : `n` tiroirs empilés (ou portes côte à côte) entre `y0` et `y1`, avec poignées. */
function drawers(w: number, d: number, y0: number, y1: number, n: number, gap = 0.004): ProceduralPart[] {
  const hh = (y1 - y0) / n
  return Array.from({ length: n }, (_, i) => {
    const y = y0 + hh * (i + 0.5)
    return [
      box([w - gap * 2, hh - gap, 0.018], [0, y, d / 2 + 0.009], 'fronts', 0.002),
      box([Math.min(0.14, w * 0.35), 0.012, 0.016], [0, y + hh * 0.22, d / 2 + 0.026], 'handle', 0.004),
    ]
  }).flat()
}

function doors(w: number, d: number, y0: number, y1: number, n: number, vertical = true, gap = 0.004): ProceduralPart[] {
  const ww = (w - gap) / n
  return Array.from({ length: n }, (_, i) => {
    const x = -w / 2 + gap / 2 + ww * (i + 0.5)
    // Poignée côté ouverture : vers le centre pour une paire, à droite sinon.
    const side = n === 2 ? (i === 0 ? 1 : -1) : 1
    const hx = x + side * (ww / 2 - 0.04)
    const h = y1 - y0
    return [
      box([ww - gap, h - gap, 0.018], [x, y0 + h / 2, d / 2 + 0.009], 'fronts', 0.002),
      vertical
        ? box([0.012, Math.min(0.3, h * 0.22), 0.016], [hx, y0 + h * (h > 1 ? 0.5 : 0.75), d / 2 + 0.026], 'handle', 0.004)
        : cyl([0.02, 0.014, 0.02], [hx, y0 + h * 0.75, d / 2 + 0.025], 'handle'),
    ]
  }).flat()
}

const wood = (label: string, color: string): MaterialSlot => ({ slot: 'body', label, default: color, customizable: true })
const fronts = (color: string): MaterialSlot => ({ slot: 'fronts', label: 'Façades', default: color, customizable: true })
const handle = (color = INK): MaterialSlot => ({ slot: 'handle', label: 'Poignées', default: color, customizable: true, metalness: 0.4, roughness: 0.4 })

const FURNITURE: FurnitureSpec[] = [
  {
    id: 'armoire', label: 'Armoire', name: 'Armoire', description: 'Armoire haute à deux portes, sur socle.',
    placement: 'floor',
    materials: [wood('Caisson', WHITE), fronts(WHITE), handle(), { slot: 'plinth', label: 'Socle', default: '#D9D4CB', customizable: true }],
    parts: [box([0.96, 0.08, 0.54], [0, 0.04, -0.01], 'plinth'), ...carcass(1.0, 1.82, 0.58, 0.018, 'body', 0.08), ...doors(1.0, 0.58, 0.08, 1.9, 2)],
    tags: ['armoire', 'penderie', 'placard'],
  },
  {
    id: 'buffet', label: 'Buffet', name: 'Buffet bas', description: 'Buffet bas à trois portes sur pieds fuselés.',
    placement: 'floor',
    materials: [wood('Caisson', OAK), fronts('#7E9C8F'), handle('#C9A15A'), { slot: 'legs', label: 'Pieds', default: '#8A5A3C', customizable: true }],
    parts: [
      ...carcass(1.5, 0.6, 0.45, 0.02, 'body', 0.18),
      ...doors(1.5, 0.45, 0.18, 0.78, 3, false),
      ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => cyl([0.035, 0.18, 0.035], [sx * 0.68, 0.09, sz * 0.18], 'legs'))),
    ],
    tags: ['buffet', 'bahut', 'enfilade', 'scandinave'],
  },
  {
    id: 'commode', label: 'Commode', name: 'Commode', description: 'Commode à quatre tiroirs.',
    placement: 'floor',
    materials: [wood('Caisson', WHITE), fronts(WHITE), handle(OAK)],
    parts: [...carcass(0.8, 0.84, 0.45, 0.018, 'body', 0.04, 0.006), box([0.76, 0.04, 0.42], [0, 0.02, -0.01], 'body'), ...drawers(0.8, 0.45, 0.04, 0.88, 4)],
    tags: ['commode', 'tiroirs'],
  },
  {
    id: 'caisson', label: 'Caisson', name: 'Caisson à roulettes', description: 'Caisson de bureau à trois tiroirs, sur roulettes, à glisser sous le plateau.',
    placement: 'floor',
    materials: [wood('Caisson', INK), fronts('#4A4860'), handle('#C9C6C0'), { slot: 'wheels', label: 'Roulettes', default: '#16151F', customizable: true }],
    parts: [
      ...carcass(0.42, 0.56, 0.52, 0.016, 'body', 0.05),
      ...drawers(0.42, 0.52, 0.05, 0.61, 3),
      ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => cyl([0.045, 0.045, 0.045], [sx * 0.17, 0.0225, sz * 0.21], 'wheels'))),
    ],
    tags: ['caisson', 'tiroirs', 'roulettes', 'bureau'],
  },
  {
    id: 'vestiaire', label: 'Vestiaire', name: 'Vestiaire métallique', description: 'Casier vestiaire en métal, porte à aérations.',
    placement: 'floor',
    materials: [
      { slot: 'body', label: 'Caisson', default: '#5E8C61', customizable: true, metalness: 0.45, roughness: 0.45 },
      { slot: 'fronts', label: 'Porte', default: '#5E8C61', customizable: true, metalness: 0.45, roughness: 0.45 },
      { slot: 'handle', label: 'Poignée et aérations', default: INK, customizable: true },
    ],
    parts: [
      ...carcass(0.38, 1.8, 0.45, 0.012, 'body', 0),
      box([0.372, 1.792, 0.012], [0, 0.9, 0.231], 'fronts', 0.002),
      ...[0, 1, 2, 3, 4].map((i) => box([0.2, 0.012, 0.002], [0, 1.58 - i * 0.035, 0.238], 'handle')),
      ...[0, 1, 2, 3, 4].map((i) => box([0.2, 0.012, 0.002], [0, 0.32 - i * 0.035, 0.238], 'handle')),
      box([0.03, 0.09, 0.02], [0.13, 0.98, 0.245], 'handle', 0.004),
    ],
    tags: ['vestiaire', 'casier', 'métal', 'industriel', 'locker'],
  },
  {
    id: 'bibliotheque', label: 'Bibliothèque', name: 'Bibliothèque', description: 'Bibliothèque ouverte à cinq niveaux, avec quelques livres.',
    placement: 'floor',
    materials: [
      wood('Structure', OAK),
      { slot: 'book1', label: 'Livres 1', default: '#FF6B35', customizable: true },
      { slot: 'book2', label: 'Livres 2', default: '#A497FF', customizable: true },
      { slot: 'book3', label: 'Livres 3', default: '#4CC9A0', customizable: true },
    ],
    parts: (() => {
      const [w, h, d, t] = [0.8, 1.8, 0.3, 0.018]
      const parts = carcass(w, h, d, t, 'body')
      const step = (h - t) / 5
      for (let i = 1; i < 5; i++) parts.push(box([w - 2 * t, t, d - 0.006], [0, i * step + t / 2, 0.003], 'body'))
      // Rangées de livres sur trois niveaux, alignées à gauche ou à droite.
      const rows: [number, number, 1 | -1][] = [[0, 9, -1], [2, 6, 1], [3, 11, -1]]
      for (const [level, count, side] of rows) {
        const y0 = level * step + t
        let x = side * (w / 2 - t - 0.01)
        for (let b = 0; b < count; b++) {
          const bw = 0.022 + ((b * 7) % 4) * 0.005
          const bh = step * (0.62 + ((b * 5) % 3) * 0.08)
          x -= side * bw / 2
          parts.push(box([bw, bh, 0.2], [x, y0 + bh / 2, 0.01], (['book1', 'book2', 'book3'] as const)[(b + level) % 3]!))
          x -= side * (bw / 2 + 0.002)
        }
      }
      return parts
    })(),
    tags: ['bibliothèque', 'étagère', 'livres'],
  },
]

export const furnitureFamily: CatalogFamily = {
  id: 'furniture',
  name: 'Meuble de rangement',
  category: 'storage',
  axes: [{ id: 'model', label: 'Modèle', values: FURNITURE.map(({ id, label }) => ({ id, label })) }],
  defaults: { model: 'armoire' },
}

export const furnitureItems: CatalogItem[] = FURNITURE.map((spec) => {
  const dims = extents(spec.parts)
  return {
    id: `furniture-${spec.id}`,
    slug: spec.id,
    name: spec.name,
    category: 'storage',
    description: spec.description,
    dimensions: dims,
    defaultScale: 1,
    placement: spec.placement,
    surface: { height: dims.height },
    materials: spec.materials,
    model: { type: 'procedural', parts: spec.parts },
    tags: ['rangement', 'meuble', ...spec.tags],
    family: { id: furnitureFamily.id, options: { model: spec.id } },
  }
})

// ─── Vitrines ─────────────────────────────────────────────────────────────────

type VitrineModelId = 'haute' | 'basse' | 'murale' | 'cube'
type VitrineLightId = 'sans' | 'led'

interface VitrineSpec {
  id: VitrineModelId
  label: string
  name: string
  description: string
  placement: Placement
  /** Largeur, hauteur, profondeur, nombre d'étagères intermédiaires. */
  size: [number, number, number]
  shelves: number
  /** Hauteur des pieds (vitrine sur pieds) ou du socle. */
  base: number
  frame: string
  tags: string[]
}

const VITRINES: VitrineSpec[] = [
  {
    id: 'haute', label: 'Haute', name: 'Vitrine haute', description: 'Vitrine haute à portes vitrées et étagères',
    placement: 'floor', size: [0.8, 1.8, 0.4], shelves: 3, base: 0.06, frame: INK, tags: ['haute', 'collection'],
  },
  {
    id: 'basse', label: 'Basse', name: 'Vitrine basse', description: 'Vitrine basse sur pieds, dessus en bois',
    placement: 'floor', size: [1.2, 0.62, 0.4], shelves: 1, base: 0.2, frame: OAK, tags: ['basse', 'meuble tv'],
  },
  {
    id: 'murale', label: 'Murale', name: 'Vitrine murale', description: 'Vitrine à accrocher au mur',
    placement: 'wall', size: [0.8, 0.6, 0.25], shelves: 1, base: 0, frame: WHITE, tags: ['murale', 'suspendue'],
  },
  {
    id: 'cube', label: 'Cube figurines', name: 'Cube vitrine', description: 'Cube en verre sur socle, pour une figurine ou une maquette',
    placement: 'surface', size: [0.3, 0.32, 0.3], shelves: 0, base: 0.03, frame: INK, tags: ['figurine', 'maquette', 'lego', 'collection'],
  },
]

const VITRINE_LIGHTS: { id: VitrineLightId; label: string }[] = [
  { id: 'sans', label: 'Sans' },
  { id: 'led', label: 'LED' },
]

export const vitrineFamily: CatalogFamily = {
  id: 'vitrine',
  name: 'Vitrine',
  category: 'storage',
  axes: [
    { id: 'model', label: 'Modèle', values: VITRINES.map(({ id, label }) => ({ id, label })) },
    { id: 'lighting', label: 'Éclairage', values: VITRINE_LIGHTS.map(({ id, label }) => ({ id, label })) },
  ],
  defaults: { model: 'haute', lighting: 'sans' },
}

/** Vitrine : montants et traverses opaques, panneaux de verre, étagères opaques (on y pose des objets). */
function vitrineParts(spec: VitrineSpec, led: boolean): { parts: ProceduralPart[]; light: Vec3 } {
  const [w, h, d] = spec.size
  const wall = spec.placement === 'wall'
  // Murale : centrée en y, fond contre le mur (z = 0) ; sinon centrée en z, posée au sol.
  const y0 = wall ? -h / 2 : spec.base
  const zc = wall ? d / 2 : 0
  const t = spec.id === 'cube' ? 0.008 : 0.02
  const parts: ProceduralPart[] = []
  const P = (size: Vec3, pos: Vec3, slot: string, radius?: number) => parts.push(box(size, [pos[0], pos[1], pos[2] + zc], slot, radius))
  const bodyH = h - (wall ? 0 : spec.base)

  if (spec.id === 'cube') {
    P([w, spec.base, d], [0, spec.base / 2, 0], 'frame', 0.004)
    P([w - 0.004, bodyH, d - 0.004], [0, spec.base + bodyH / 2, 0], 'glass', 0.002)
    if (led) P([w * 0.7, 0.003, d * 0.7], [0, spec.base + 0.0015, 0], 'led')
    return { parts, light: [0, spec.base + 0.08, 0] }
  }

  // Dessus, dessous, fond et montants d'angle.
  P([w, t, d], [0, y0 + bodyH - t / 2, 0], 'frame', 0.003)
  P([w, t, d], [0, y0 + t / 2, 0], 'frame', 0.003)
  P([w - 2 * t, bodyH - 2 * t, 0.006], [0, y0 + bodyH / 2, -d / 2 + 0.003], spec.id === 'basse' ? 'glass' : 'back')
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P([t, bodyH, t], [sx * (w / 2 - t / 2), y0 + bodyH / 2, sz * (d / 2 - t / 2)], 'frame')
  // Côtés et façade vitrés (deux portes pour les grands modèles, montant central).
  for (const sx of [-1, 1]) P([0.004, bodyH - 2 * t, d - 2 * t], [sx * (w / 2 - t / 2), y0 + bodyH / 2, 0], 'glass')
  P([w - 2 * t, bodyH - 2 * t, 0.004], [0, y0 + bodyH / 2, d / 2 - t / 2], 'glass')
  if (w > 0.7) P([t * 0.6, bodyH - 2 * t, t * 0.6], [0, y0 + bodyH / 2, d / 2 - t / 2], 'frame')
  // Étagères (pleines, dans la couleur du cadre).
  const step = (bodyH - 2 * t) / (spec.shelves + 1)
  for (let i = 1; i <= spec.shelves; i++) P([w - 2 * t, 0.012, d - 2 * t - 0.006], [0, y0 + t + i * step, 0], 'frame')
  // Pieds ou socle.
  if (spec.id === 'basse') {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(cyl([0.03, spec.base, 0.03], [sx * (w / 2 - 0.06), spec.base / 2, sz * (d / 2 - 0.05)], 'frame'))
  } else if (!wall) {
    P([w - 0.04, spec.base, d - 0.04], [0, spec.base / 2, -0.01], 'frame')
  }
  if (led) {
    // Rubans LED sous le dessus et sous chaque étagère, côté façade.
    P([w - 2 * t - 0.02, 0.004, 0.01], [0, y0 + bodyH - t - 0.002, d / 2 - t - 0.02], 'led')
    for (let i = 1; i <= spec.shelves; i++) P([w - 2 * t - 0.02, 0.004, 0.01], [0, y0 + t + i * step - 0.008, d / 2 - t - 0.02], 'led')
  }
  return { parts, light: [0, y0 + bodyH * 0.7, zc] }
}

export const vitrineItems: CatalogItem[] = VITRINES.flatMap((spec) =>
  VITRINE_LIGHTS.map((lighting): CatalogItem => {
    const led = lighting.id === 'led'
    const { parts, light } = vitrineParts(spec, led)
    const dims = extents(parts)
    const suffix = led ? '-led' : ''
    return {
      id: `vitrine-${spec.id}${suffix}`,
      slug: `vitrine-${spec.id}${suffix}`,
      name: led ? `${spec.name} LED` : spec.name,
      category: 'storage',
      description: `${spec.description}${led ? ', éclairage LED intégré' : ''}.`,
      dimensions: dims,
      defaultScale: 1,
      placement: spec.placement,
      surface: { height: dims.height },
      ...(led ? { light: { slot: 'led', intensity: spec.id === 'cube' ? 0.4 : 0.9, distance: spec.id === 'cube' ? 0.5 : 1.4, position: light } } : {}),
      materials: usedSlots(
        [
          { slot: 'frame', label: 'Cadre et étagères', default: spec.frame, customizable: true },
          { slot: 'back', label: 'Fond', default: spec.id === 'murale' ? '#E9E5DD' : '#3A3850', customizable: true },
          GLASS,
          { slot: 'led', label: 'LED', default: '#FFE8B0', customizable: true, emissive: 1.4 },
        ],
        parts,
      ),
      model: { type: 'procedural', parts },
      tags: ['vitrine', 'rangement', 'verre', ...spec.tags, ...(led ? ['led', 'lumière'] : [])],
      family: { id: vitrineFamily.id, options: { model: spec.id, lighting: lighting.id } },
    }
  }),
)
