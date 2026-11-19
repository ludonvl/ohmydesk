import type { CatalogFamily, CatalogItem, MaterialSlot, ProceduralPart, Vec3 } from '../types'

/**
 * Familles « Clavier » (format × éclairage) et « Souris » (modèle).
 * Repère : origine au centre de la base, posée sur la surface ; face avant (côté utilisateur) vers +Z.
 * Les touches sont dessinées par rangées (une boîte par rangée et par bloc), les espaces entre
 * rangées suffisent à lire le clavier. Les vignettes isométriques ignorent les rotations
 * (claviers split, souris verticale) : pièces dessinées droites.
 */

const INK = '#2E2C3D'
const SHELL = '#FBF8F3'
const r3 = (v: number) => Math.round(v * 10000) / 10000

const box = (size: Vec3, position: Vec3, slot: string, radius?: number, rotation?: Vec3): ProceduralPart => ({
  shape: 'box', size, position: [r3(position[0]), r3(position[1]), r3(position[2])], slot, radius, rotation,
})
const cyl = (size: Vec3, position: Vec3, slot: string, rotation?: Vec3): ProceduralPart => ({
  shape: 'cylinder', size, position, slot, rotation,
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

const usedSlots = (slots: MaterialSlot[], parts: ProceduralPart[]) => slots.filter((s) => parts.some((p) => p.slot === s.slot))

// ─── Claviers ─────────────────────────────────────────────────────────────────

type KeyboardFormatId = '60' | '75' | 'tkl' | 'full' | 'split' | 'slim'
type LightingId = 'sans' | 'rgb'

/** Bloc de touches : de `a` à `b` (fractions de la largeur utile), sur les rangées listées (0 = rangée avant). */
interface KeyBlock { a: number; b: number; rows: number[] }

interface KeyboardSpec {
  id: KeyboardFormatId
  label: string
  name: string
  description: string
  /** Largeur × profondeur du boîtier (d'une moitié pour le split). */
  size: [number, number]
  /** Hauteur du boîtier et des touches. */
  caseH: number
  capH: number
  rows: number
  blocks: KeyBlock[]
  colors: { body: string; keys: string; accent: string }
  tags: string[]
}

const all = (n: number) => Array.from({ length: n }, (_, i) => i)

const KEYBOARDS: KeyboardSpec[] = [
  {
    id: '60', label: '60 %', name: 'Clavier 60 %', description: 'Clavier mécanique 60 %, sans rangée de fonctions',
    size: [0.295, 0.105], caseH: 0.022, capH: 0.009, rows: 5, blocks: [{ a: 0, b: 1, rows: all(5) }],
    colors: { body: INK, keys: '#3A3850', accent: '#24E1FF' }, tags: ['60', 'compact', 'mécanique'],
  },
  {
    id: '75', label: '75 %', name: 'Clavier 75 %', description: 'Clavier mécanique compact',
    size: [0.32, 0.12], caseH: 0.025, capH: 0.009, rows: 6, blocks: [{ a: 0, b: 1, rows: all(6) }],
    colors: { body: '#E9E5DD', keys: SHELL, accent: '#FF6B35' }, tags: ['75', 'compact', 'mécanique'],
  },
  {
    id: 'tkl', label: 'TKL', name: 'Clavier TKL', description: 'Clavier mécanique sans pavé numérique',
    size: [0.36, 0.14], caseH: 0.026, capH: 0.009, rows: 6,
    blocks: [{ a: 0, b: 0.8, rows: all(6) }, { a: 0.83, b: 1, rows: [3, 4, 5] }, { a: 0.83, b: 1, rows: [0, 1] }],
    colors: { body: '#C9C6C0', keys: '#F5F2EC', accent: '#E8553B' }, tags: ['tkl', 'tenkeyless', 'mécanique'],
  },
  {
    id: 'full', label: 'Complet', name: 'Clavier complet', description: 'Clavier mécanique complet avec pavé numérique',
    size: [0.44, 0.14], caseH: 0.026, capH: 0.009, rows: 6,
    blocks: [
      { a: 0, b: 0.66, rows: all(6) },
      { a: 0.685, b: 0.8, rows: [3, 4, 5] },
      { a: 0.685, b: 0.8, rows: [0, 1] },
      { a: 0.825, b: 1, rows: all(5) },
    ],
    colors: { body: INK, keys: '#4A4860', accent: '#FFCF5A' }, tags: ['100', 'complet', 'pavé numérique', 'mécanique'],
  },
  {
    id: 'split', label: 'Split', name: 'Clavier split ergonomique', description: 'Clavier ergonomique en deux moitiés écartées',
    size: [0.17, 0.12], caseH: 0.022, capH: 0.009, rows: 5, blocks: [{ a: 0, b: 1, rows: all(5) }],
    colors: { body: '#F5F2EC', keys: '#DCE9E4', accent: '#7E9C8F' }, tags: ['split', 'ergonomique', 'mécanique'],
  },
  {
    id: 'slim', label: 'Extra-plat', name: 'Clavier extra-plat', description: 'Clavier sans fil extra-plat, touches ciseaux',
    size: [0.279, 0.115], caseH: 0.006, capH: 0.0016, rows: 6, blocks: [{ a: 0, b: 1, rows: all(6) }],
    colors: { body: '#D6D4D0', keys: '#FBFBFA', accent: '#FBFBFA' }, tags: ['plat', 'sans fil', 'magic keyboard', 'bureautique'],
  },
]

const LIGHTINGS: { id: LightingId; label: string }[] = [
  { id: 'sans', label: 'Sans' },
  { id: 'rgb', label: 'RGB' },
]

export const keyboardFamily: CatalogFamily = {
  id: 'keyboard',
  name: 'Clavier',
  category: 'peripherals',
  axes: [
    { id: 'format', label: 'Format', values: KEYBOARDS.map(({ id, label }) => ({ id, label })) },
    { id: 'lighting', label: 'Éclairage', values: LIGHTINGS.map(({ id, label }) => ({ id, label })) },
  ],
  defaults: { format: '75', lighting: 'sans' },
}

/** Un boîtier de clavier centré en (0, 0) : coque, rangées de touches, Échap et Entrée en accent. */
function keyboardHalf(spec: KeyboardSpec, rgb: boolean, keys = { esc: true, enter: true }): ProceduralPart[] {
  const [w, d] = spec.size
  const margin = spec.id === 'slim' ? 0.008 : 0.01
  const innerW = w - margin * 2
  const innerD = d - margin * 2
  const rowD = innerD / spec.rows
  const capY = spec.caseH + spec.capH / 2
  const left = -innerW / 2
  const rowZ = (row: number) => innerD / 2 - rowD * (row + 0.5)
  const radius = spec.id === 'slim' ? 0.004 : 0.006
  const parts: ProceduralPart[] = [box([w, spec.caseH, d], [0, spec.caseH / 2, 0], 'body', Math.min(radius, spec.caseH / 2))]
  if (rgb) parts.push(box([w + 0.003, 0.004, d + 0.003], [0, 0.003, 0], 'glow', 0.002))

  // Largeur d'une touche standard, déduite du bloc principal (≈ 15 touches par rangée).
  const main = spec.blocks[0]!
  const keyW = ((main.b - main.a) * innerW) / 15
  for (const block of spec.blocks) {
    for (const row of block.rows) {
      const x0 = left + block.a * innerW
      const x1 = left + block.b * innerW
      let start = x0
      let end = x1
      const top = keys.esc && block === main && row === spec.rows - 1
      const enter = keys.enter && block === main && row === 2
      if (top) start += keyW * 1.25 // place d'Échap
      if (enter) end -= keyW * 2.25 // place d'Entrée
      parts.push(box([r3(end - start - 0.002), spec.capH, r3(rowD * 0.84)], [(start + end) / 2, capY, rowZ(row)], 'keys', 0.0015))
      if (top) parts.push(box([r3(keyW * 1.05), spec.capH, r3(rowD * 0.84)], [x0 + keyW * 0.55, capY, rowZ(row)], 'accent', 0.0015))
      if (enter) parts.push(box([r3(keyW * 2.05), spec.capH, r3(rowD * 0.84)], [x1 - keyW * 1.05, capY, rowZ(row)], 'accent', 0.0015))
    }
  }
  return parts
}

/** Tourne les pièces autour de Y puis les translate (moitiés du clavier split). */
function placeY(parts: ProceduralPart[], angle: number, offset: Vec3): ProceduralPart[] {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return parts.map((p) => {
    const [x, y, z] = p.position
    return {
      ...p,
      position: [r3(x * c + z * s + offset[0]), r3(y + offset[1]), r3(-x * s + z * c + offset[2])],
      rotation: [0, r3((p.rotation?.[1] ?? 0) + angle), 0],
    }
  })
}

function keyboardParts(spec: KeyboardSpec, rgb: boolean): ProceduralPart[] {
  if (spec.id !== 'split') return keyboardHalf(spec, rgb)
  // Échap sur la moitié gauche, Entrée sur la droite ; moitiés écartées et ouvertes vers l'extérieur.
  const leftHalf = keyboardHalf(spec, rgb, { esc: true, enter: false })
  const rightHalf = keyboardHalf(spec, rgb, { esc: false, enter: true })
  return [...placeY(leftHalf, 0.16, [-0.115, 0, 0]), ...placeY(rightHalf, -0.16, [0.115, 0, 0])]
}

function keyboardId(spec: KeyboardSpec, lighting: LightingId) {
  const suffix = lighting === 'rgb' ? '-rgb' : ''
  return { id: `keyboard-${spec.id}${suffix}`, slug: `clavier-${spec.id}${suffix}` }
}

export const keyboardItems: CatalogItem[] = KEYBOARDS.flatMap((spec) =>
  LIGHTINGS.map((lighting): CatalogItem => {
    const rgb = lighting.id === 'rgb'
    const parts = keyboardParts(spec, rgb)
    return {
      ...keyboardId(spec, lighting.id),
      name: rgb ? `${spec.name} RGB` : spec.name,
      category: 'peripherals',
      description: `${spec.description}${rgb ? ', éclairage RGB' : ''}.`,
      dimensions: extents(parts),
      defaultScale: 1,
      placement: 'surface',
      materials: usedSlots(
        [
          { slot: 'body', label: 'Boîtier', default: spec.colors.body, customizable: true, ...(spec.id === 'slim' ? { metalness: 0.35, roughness: 0.45 } : {}) },
          { slot: 'keys', label: 'Touches', default: spec.colors.keys, customizable: true },
          { slot: 'accent', label: 'Touches accent', default: spec.colors.accent, customizable: true },
          { slot: 'glow', label: 'Éclairage', default: '#FF4FD8', customizable: true, emissive: 1.2 },
        ],
        parts,
      ),
      model: { type: 'procedural', parts },
      tags: ['clavier', 'keyboard', ...spec.tags, ...(rgb ? ['rgb', 'gaming'] : [])],
      family: { id: keyboardFamily.id, options: { format: spec.id, lighting: lighting.id } },
    }
  }),
)

// ─── Souris ───────────────────────────────────────────────────────────────────

interface MouseSpec {
  id: string
  /** Identifiant et slug (`mouse` existait avant la famille : des scènes y font référence). */
  itemId: string
  slug: string
  label: string
  name: string
  description: string
  materials: MaterialSlot[]
  parts: ProceduralPart[]
  tags: string[]
}

/** Molette : cylindre couché, axe selon X. */
const wheel = (z: number, y: number, d = 0.012): ProceduralPart => cyl([d, 0.006, d], [0, y, z], 'accent', [0, 0, Math.PI / 2])

const MICE: MouseSpec[] = [
  {
    id: 'ergo', itemId: 'mouse', slug: 'souris', label: 'Ergonomique', name: 'Souris ergonomique',
    description: 'Souris ergonomique sculptée, appui pouce.',
    materials: [
      { slot: 'body', label: 'Coque', default: SHELL, customizable: true },
      { slot: 'accent', label: 'Molette', default: INK, customizable: true },
    ],
    parts: [
      box([0.06, 0.03, 0.1], [0, 0.015, 0], 'body', 0.012),
      box([0.05, 0.008, 0.06], [0.002, 0.032, -0.012], 'body', 0.004),
      wheel(0.022, 0.033),
    ],
    tags: ['ergonomique', 'bureautique'],
  },
  {
    id: 'gaming', itemId: 'mouse-gaming', slug: 'souris-gaming', label: 'Gaming', name: 'Souris gaming',
    description: 'Souris gaming légère, boutons latéraux et logo lumineux.',
    materials: [
      { slot: 'body', label: 'Coque', default: INK, customizable: true },
      { slot: 'accent', label: 'Molette et boutons', default: '#16151F', customizable: true },
      { slot: 'glow', label: 'Éclairage', default: '#24E1FF', customizable: true, emissive: 1.3 },
    ],
    parts: [
      box([0.064, 0.026, 0.122], [0, 0.013, 0], 'body', 0.01),
      box([0.056, 0.012, 0.07], [0, 0.03, -0.018], 'body', 0.006),
      box([0.002, 0.006, 0.05], [0, 0.03, 0.035], 'accent'),
      wheel(0.03, 0.03, 0.014),
      box([0.004, 0.007, 0.018], [-0.0325, 0.02, 0.008], 'accent', 0.002),
      box([0.004, 0.007, 0.018], [-0.0325, 0.02, -0.014], 'accent', 0.002),
      box([0.018, 0.002, 0.018], [0, 0.0365, -0.03], 'glow', 0.001),
      box([0.066, 0.003, 0.124], [0, 0.0015, 0], 'glow', 0.002),
    ],
    tags: ['gaming', 'rgb', 'fps'],
  },
  {
    id: 'plate', itemId: 'mouse-slim', slug: 'souris-plate', label: 'Plate', name: 'Souris plate',
    description: 'Souris sans fil très fine, surface tactile.',
    materials: [
      { slot: 'body', label: 'Surface', default: '#FBFBFA', customizable: true, roughness: 0.25 },
      { slot: 'base', label: 'Base', default: '#D6D4D0', customizable: true, metalness: 0.35, roughness: 0.45 },
    ],
    parts: [
      box([0.054, 0.006, 0.11], [0, 0.003, 0], 'base', 0.003),
      box([0.057, 0.016, 0.114], [0, 0.013, 0], 'body', 0.008),
    ],
    tags: ['plate', 'sans fil', 'magic mouse', 'tactile'],
  },
  {
    id: 'verticale', itemId: 'mouse-vertical', slug: 'souris-verticale', label: 'Verticale', name: 'Souris verticale',
    description: 'Souris verticale, poignée de main de côté pour soulager le poignet.',
    materials: [
      { slot: 'body', label: 'Coque', default: '#3A3850', customizable: true },
      { slot: 'base', label: 'Socle', default: INK, customizable: true },
      { slot: 'accent', label: 'Molette', default: '#A497FF', customizable: true },
    ],
    parts: [
      box([0.075, 0.01, 0.115], [0, 0.005, 0], 'base', 0.004),
      box([0.048, 0.068, 0.108], [-0.004, 0.043, 0], 'body', 0.014, [0, 0, -0.35]),
      cyl([0.012, 0.006, 0.012], [0.024, 0.06, 0.028], 'accent', [0, 0, Math.PI / 2 - 0.35]),
    ],
    tags: ['verticale', 'ergonomique', 'poignet'],
  },
  {
    id: 'trackball', itemId: 'mouse-trackball', slug: 'trackball', label: 'Trackball', name: 'Trackball',
    description: 'Trackball à commande au pouce : la souris ne bouge pas, la bille roule.',
    materials: [
      { slot: 'body', label: 'Coque', default: '#E9E5DD', customizable: true },
      { slot: 'ball', label: 'Bille', default: '#FF6B35', customizable: true, roughness: 0.2 },
      { slot: 'accent', label: 'Molette', default: INK, customizable: true },
    ],
    parts: [
      box([0.09, 0.034, 0.13], [0.006, 0.017, 0], 'body', 0.016),
      box([0.06, 0.01, 0.07], [0.012, 0.038, -0.018], 'body', 0.005),
      box([0.034, 0.034, 0.034], [-0.03, 0.03, 0.028], 'ball', 0.0169),
      wheel(0.03, 0.037),
    ],
    tags: ['trackball', 'ergonomique', 'bille'],
  },
  {
    id: 'trackpad', itemId: 'trackpad', slug: 'pave-tactile', label: 'Pavé tactile', name: 'Pavé tactile',
    description: 'Grand pavé tactile sans fil, multi-gestes.',
    materials: [
      { slot: 'body', label: 'Surface', default: '#FBFBFA', customizable: true, roughness: 0.3 },
      { slot: 'base', label: 'Cadre', default: '#D6D4D0', customizable: true, metalness: 0.35, roughness: 0.45 },
    ],
    parts: [
      box([0.16, 0.009, 0.115], [0, 0.0055, 0], 'base', 0.006, [0.05, 0, 0]),
      box([0.154, 0.002, 0.109], [0, 0.011, 0], 'body', 0.001, [0.05, 0, 0]),
    ],
    tags: ['pavé tactile', 'trackpad', 'magic trackpad', 'sans fil'],
  },
]

export const mouseFamily: CatalogFamily = {
  id: 'mouse',
  name: 'Souris',
  category: 'peripherals',
  axes: [{ id: 'model', label: 'Modèle', values: MICE.map(({ id, label }) => ({ id, label })) }],
  defaults: { model: 'ergo' },
}

export const mouseItems: CatalogItem[] = MICE.map((spec) => ({
  id: spec.itemId,
  slug: spec.slug,
  name: spec.name,
  category: 'peripherals',
  description: spec.description,
  dimensions: extents(spec.parts),
  defaultScale: 1,
  placement: 'surface',
  materials: spec.materials,
  model: { type: 'procedural', parts: spec.parts },
  tags: ['souris', 'mouse', ...spec.tags],
  family: { id: mouseFamily.id, options: { model: spec.id } },
}))
