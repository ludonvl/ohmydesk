import type { CatalogFamily, CatalogItem, MaterialSlot, Placement, ProceduralPart, Vec3 } from '../types'

/**
 * Familles déco : « Objet de bureau », « Figurine », « Déco murale » (modèle) et « Tapis » (forme × taille).
 * Repère : origine au centre de la base, posée sur la surface ou au sol ; face avant vers +Z.
 * Déco murale : origine au centre, contre le mur (z = 0), comme les posters.
 * Les vignettes isométriques ignorent les inclinaisons (cadre photo, crayons) et le verre (opacité < 0,5).
 */

const INK = '#2E2C3D'
const WHITE = '#FBF8F3'
const GOLD = '#E0B04A'
const r3 = (v: number) => Math.round(v * 10000) / 10000
const rv = (v: Vec3): Vec3 => [r3(v[0]), r3(v[1]), r3(v[2])]
const FACE: Vec3 = [Math.PI / 2, 0, 0]

const box = (size: Vec3, position: Vec3, slot: string, radius?: number, rotation?: Vec3): ProceduralPart => ({
  shape: 'box', size: rv(size), position: rv(position), slot, radius, rotation: rotation && rv(rotation),
})
const cyl = (size: Vec3, position: Vec3, slot: string, rotation?: Vec3): ProceduralPart => ({
  shape: 'cylinder', size: rv(size), position: rv(position), slot, rotation: rotation && rv(rotation),
})
/** Disque face à l'avant (cylindre couché, axe selon Z) : `depth` = épaisseur. */
const disc = (d: number, depth: number, position: Vec3, slot: string) => cyl([d, depth, d], position, slot, FACE)
const ball = (d: number, position: Vec3, slot: string, h = d, w = d): ProceduralPart => box([w, h, d], position, slot, Math.min(d, h, w) / 2 - 0.0002)

function tube(points: [number, number][], radius: number, slot: string, position: Vec3 = [0, 0, 0], closed = false): ProceduralPart {
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  return {
    shape: 'tube',
    slot,
    position: rv(position),
    size: [r3(Math.max(...xs) - Math.min(...xs) + radius * 2), r3(Math.max(...ys) - Math.min(...ys) + radius * 2), radius * 2],
    tube: { points: points.map(([x, y]) => [r3(x), r3(y)]), radius, smooth: true, closed },
  }
}

function extents(parts: ProceduralPart[]) {
  let [x, y0, y1, z] = [0, 0, 0, 0]
  for (const p of parts) {
    let [w, h, d] = p.size
    if (p.rotation && Math.abs(Math.abs(p.rotation[0]) - Math.PI / 2) < 0.01) [h, d] = [d, h]
    x = Math.max(x, Math.abs(p.position[0]) + w / 2)
    y0 = Math.min(y0, p.position[1] - h / 2)
    y1 = Math.max(y1, p.position[1] + h / 2)
    z = Math.max(z, Math.abs(p.position[2]) + d / 2)
  }
  return { width: r3(x * 2), height: r3(y1 - y0), depth: r3(z * 2) }
}

const slot = (id: string, label: string, color: string, extra: Partial<MaterialSlot> = {}): MaterialSlot => ({ slot: id, label, default: color, customizable: true, ...extra })
const metal = { metalness: 0.5, roughness: 0.35 }

interface DecorSpec {
  id: string
  /** Identifiant du catalogue (`mug`, `mascot-cubi`… existaient avant les familles). */
  itemId: string
  slug: string
  label: string
  name: string
  description: string
  materials: MaterialSlot[]
  parts: ProceduralPart[]
  glb?: CatalogItem['glb']
  light?: CatalogItem['light']
  tags: string[]
}

function decorFamily(id: string, name: string, specs: DecorSpec[], placement: Placement, tags: string[]) {
  const family: CatalogFamily = {
    id,
    name,
    category: 'decor',
    axes: [{ id: 'model', label: 'Modèle', values: specs.map((s) => ({ id: s.id, label: s.label })) }],
    defaults: { model: specs[0]!.id },
  }
  const items = specs.map((spec): CatalogItem => ({
    id: spec.itemId,
    slug: spec.slug,
    name: spec.name,
    category: 'decor',
    description: spec.description,
    dimensions: extents(spec.parts),
    defaultScale: 1,
    placement,
    materials: spec.materials,
    ...(spec.glb ? { glb: spec.glb } : {}),
    ...(spec.light ? { light: spec.light } : {}),
    model: { type: 'procedural', parts: spec.parts },
    tags: [...tags, ...spec.tags],
    family: { id, options: { model: spec.id } },
  }))
  return { family, items }
}

// ─── Objets de bureau ─────────────────────────────────────────────────────────

/** Livre posé à plat : couvertures, dos et tranche de pages. */
function book(w: number, t: number, d: number, y: number, x: number, z: number, cover: string): ProceduralPart[] {
  const c = 0.003
  return [
    box([w, c, d], [x, y + c / 2, z], cover),
    box([w, c, d], [x, y + t - c / 2, z], cover),
    box([c * 2, t, d], [x - w / 2 + c, y + t / 2, z], cover),
    box([w - c * 2, t - c * 2, d - 0.004], [x + c / 2, y + t / 2, z], 'pages'),
  ]
}

/** Cube casse-tête : 9 facettes colorées sur les faces avant, dessus et droite. */
function puzzleCube(): ProceduralPart[] {
  const s = 0.057
  const f = s / 3
  const sticker = f * 0.84
  const parts: ProceduralPart[] = [box([s, s, s], [0, s / 2, 0], 'body', 0.004)]
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const u = (i - 1) * f
      const v = (j - 1) * f
      parts.push(box([sticker, sticker, 0.001], [u, s / 2 + v, s / 2 + 0.0005], ['c1', 'c2', 'c3'][(i + j * 2) % 3]!, 0.0015))
      parts.push(box([sticker, 0.001, sticker], [u, s + 0.0005, v], ['c4', 'c1', 'c5'][(i * 2 + j) % 3]!, 0.0015))
      parts.push(box([0.001, sticker, sticker], [s / 2 + 0.0005, s / 2 + v, u], ['c6', 'c4', 'c2'][(i + j) % 3]!, 0.0015))
    }
  }
  return parts
}

const DESK_OBJECTS: DecorSpec[] = [
  {
    id: 'tasse', itemId: 'mug', slug: 'tasse', label: 'Tasse', name: 'Tasse',
    description: 'Tasse en grès.',
    materials: [slot('body', 'Tasse', '#4CC9A0')],
    glb: { path: 'models/mug-v1.glb' },
    parts: [cyl([0.085, 0.1, 0.085], [0, 0.05, 0], 'body'), box([0.02, 0.06, 0.015], [0.052, 0.05, 0], 'body', 0.005)],
    tags: ['tasse', 'café', 'mug'],
  },
  {
    id: 'livres', itemId: 'decor-books', slug: 'pile-de-livres', label: 'Livres', name: 'Pile de livres',
    description: 'Trois livres empilés.',
    materials: [slot('book1', 'Livre 1', '#FF6B35'), slot('book2', 'Livre 2', '#2E4A6B'), slot('book3', 'Livre 3', '#7E9C8F'), slot('pages', 'Pages', '#F6EFE2', { roughness: 0.9 })],
    parts: [
      ...book(0.24, 0.035, 0.17, 0, 0, 0, 'book1'),
      ...book(0.21, 0.028, 0.15, 0.035, 0.008, -0.006, 'book2'),
      ...book(0.18, 0.04, 0.13, 0.063, -0.01, 0.004, 'book3'),
    ],
    tags: ['livres', 'lecture', 'pile'],
  },
  {
    id: 'crayons', itemId: 'decor-pencil-cup', slug: 'pot-a-crayons', label: 'Pot à crayons', name: 'Pot à crayons',
    description: 'Pot en céramique rempli de crayons et de stylos.',
    materials: [slot('pot', 'Pot', '#E9E5DD'), slot('pen1', 'Crayons', '#FFCF5A'), slot('pen2', 'Stylos', INK), slot('pen3', 'Feutres', '#FF6B6B')],
    parts: [
      cyl([0.075, 0.1, 0.075], [0, 0.05, 0], 'pot'),
      ...([[-0.014, -0.01, 0.17, 'pen1', [0.12, 0, 0.15]], [0.012, 0.008, 0.16, 'pen2', [-0.1, 0, -0.12]], [0.004, -0.016, 0.15, 'pen3', [0.1, 0, -0.08]], [-0.01, 0.014, 0.18, 'pen1', [-0.08, 0, 0.1]], [0.018, -0.004, 0.14, 'pen2', [0, 0, -0.18]]] as const).map(
        ([x, z, h, s, rot]) => cyl([0.008, h, 0.008], [x, 0.01 + h / 2, z], s, [...rot]),
      ),
    ],
    tags: ['crayons', 'stylos', 'pot', 'papeterie'],
  },
  {
    id: 'cadre', itemId: 'decor-photo-frame', slug: 'cadre-photo', label: 'Cadre photo', name: 'Cadre photo',
    description: 'Cadre photo à poser, avec un paysage.',
    materials: [slot('frame', 'Cadre', '#C99D70'), slot('art', 'Ciel', '#DCE9E4'), slot('accent', 'Collines', '#7E9C8F'), slot('accent2', 'Montagnes', '#2E4A45')],
    parts: [
      box([0.15, 0.2, 0.014], [0, 0.098, 0], 'frame', 0.003, [-0.18, 0, 0]),
      { shape: 'box', size: [0.12, 0.17, 0.002], position: rv([0, 0.099, 0.009]), slot: 'art', art: 'montagnes', rotation: [-0.18, 0, 0] },
      box([0.03, 0.15, 0.006], [0, 0.07, -0.04], 'frame', 0.002, [0.35, 0, 0]),
    ],
    tags: ['cadre', 'photo', 'souvenir'],
  },
  {
    id: 'bougie', itemId: 'decor-candle', slug: 'bougie', label: 'Bougie', name: 'Bougie',
    description: 'Bougie parfumée en pot de verre, flamme allumée.',
    materials: [
      slot('jar', 'Pot', '#E3A587', { opacity: 0.55, roughness: 0.1 }),
      slot('wax', 'Cire', '#F6EFE2'),
      { slot: 'flame', label: 'Flamme', default: '#FFB347', customizable: false, emissive: 1.6 },
    ],
    parts: [
      cyl([0.08, 0.09, 0.08], [0, 0.045, 0], 'jar'),
      cyl([0.072, 0.07, 0.072], [0, 0.037, 0], 'wax'),
      cyl([0.002, 0.012, 0.002], [0, 0.078, 0], 'wax'),
      ball(0.012, [0, 0.092, 0], 'flame', 0.022),
    ],
    light: { slot: 'flame', intensity: 0.35, distance: 0.9, position: [0, 0.12, 0] },
    tags: ['bougie', 'flamme', 'cosy', 'ambiance'],
  },
  {
    id: 'sablier', itemId: 'decor-hourglass', slug: 'sablier', label: 'Sablier', name: 'Sablier',
    description: 'Sablier en verre et bois, sable qui s’écoule.',
    materials: [
      slot('frame', 'Bois', '#8A5A3C'),
      slot('glass', 'Verre', '#E6F2F4', { opacity: 0.35, roughness: 0.05 }),
      slot('sand', 'Sable', '#E9C27A'),
    ],
    parts: [
      cyl([0.08, 0.014, 0.08], [0, 0.007, 0], 'frame'),
      cyl([0.08, 0.014, 0.08], [0, 0.173, 0], 'frame'),
      ...[0, 1, 2].map((i) => cyl([0.007, 0.152, 0.007], [Math.cos((i * 2 * Math.PI) / 3) * 0.033, 0.09, Math.sin((i * 2 * Math.PI) / 3) * 0.033], 'frame')),
      ball(0.054, [0, 0.05, 0], 'glass', 0.07),
      ball(0.054, [0, 0.13, 0], 'glass', 0.07),
      ball(0.044, [0, 0.032, 0], 'sand', 0.03),
      ball(0.03, [0, 0.112, 0], 'sand', 0.016),
      cyl([0.002, 0.07, 0.002], [0, 0.07, 0], 'sand'),
    ],
    tags: ['sablier', 'temps', 'vintage'],
  },
  {
    id: 'globe', itemId: 'decor-globe', slug: 'globe-terrestre', label: 'Globe', name: 'Globe terrestre',
    description: 'Petit globe terrestre sur pied, méridien en laiton.',
    materials: [slot('ocean', 'Océans', '#4A90C8'), slot('land', 'Continents', '#9BC27A'), slot('frame', 'Pied et méridien', GOLD, metal)],
    parts: [
      cyl([0.1, 0.012, 0.1], [0, 0.006, 0], 'frame'),
      cyl([0.012, 0.05, 0.012], [0, 0.035, 0], 'frame'),
      ball(0.16, [0, 0.15, 0], 'ocean'),
      ball(0.07, [-0.04, 0.18, 0.045], 'land', 0.06, 0.05),
      ball(0.06, [0.05, 0.12, 0.05], 'land', 0.07, 0.045),
      ball(0.05, [0.02, 0.2, -0.055], 'land', 0.04),
      tube(Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2
        return [Math.cos(a) * 0.088, 0.15 + Math.sin(a) * 0.088] as [number, number]
      }), 0.003, 'frame', [0, 0, 0], true),
    ],
    tags: ['globe', 'monde', 'voyage', 'carte'],
  },
  {
    id: 'reveil', itemId: 'decor-alarm-clock', slug: 'reveil', label: 'Réveil', name: 'Réveil',
    description: 'Réveil rétro à deux cloches.',
    materials: [slot('body', 'Boîtier', '#FF6B6B', metal), slot('face', 'Cadran', WHITE), slot('hands', 'Aiguilles', INK)],
    parts: [
      disc(0.1, 0.04, [0, 0.065, 0], 'body'),
      disc(0.086, 0.002, [0, 0.065, 0.0205], 'face'),
      box([0.003, 0.03, 0.002], [0, 0.077, 0.023], 'hands'),
      box([0.022, 0.003, 0.002], [0.01, 0.065, 0.0235], 'hands'),
      ball(0.035, [-0.035, 0.115, 0], 'body', 0.02),
      ball(0.035, [0.035, 0.115, 0], 'body', 0.02),
      box([0.008, 0.02, 0.008], [-0.03, 0.01, 0], 'hands', 0.002),
      box([0.008, 0.02, 0.008], [0.03, 0.01, 0], 'hands', 0.002),
    ],
    tags: ['réveil', 'horloge', 'rétro'],
  },
  {
    id: 'manette', itemId: 'decor-gamepad', slug: 'manette', label: 'Manette', name: 'Manette de jeu',
    description: 'Manette de console posée sur le bureau.',
    materials: [slot('body', 'Coque', WHITE), slot('sticks', 'Joysticks', INK), slot('accent', 'Boutons', '#A497FF')],
    parts: [
      box([0.15, 0.03, 0.07], [0, 0.017, -0.01], 'body', 0.014),
      ball(0.05, [-0.052, 0.018, 0.025], 'body', 0.032, 0.045),
      ball(0.05, [0.052, 0.018, 0.025], 'body', 0.032, 0.045),
      cyl([0.016, 0.014, 0.016], [-0.035, 0.035, 0.008], 'sticks'),
      cyl([0.016, 0.014, 0.016], [0.022, 0.035, 0.018], 'sticks'),
      box([0.022, 0.006, 0.006], [-0.045, 0.033, -0.022], 'sticks', 0.002),
      box([0.006, 0.006, 0.022], [-0.045, 0.033, -0.022], 'sticks', 0.002),
      ...([[0.045, -0.035], [0.057, -0.023], [0.033, -0.023], [0.045, -0.011]] as const).map(([x, z]) => ball(0.009, [x, 0.033, z], 'accent', 0.006)),
    ],
    tags: ['manette', 'jeu vidéo', 'console', 'gaming'],
  },
  {
    id: 'cube', itemId: 'decor-puzzle-cube', slug: 'cube-casse-tete', label: 'Cube casse-tête', name: 'Cube casse-tête',
    description: 'Cube casse-tête 3 × 3 en cours de résolution.',
    materials: [
      slot('body', 'Corps', '#16151F'),
      slot('c1', 'Couleur 1', '#E8553B'),
      slot('c2', 'Couleur 2', '#FFCF5A'),
      slot('c3', 'Couleur 3', '#4CC9A0'),
      slot('c4', 'Couleur 4', '#5AB0FF'),
      slot('c5', 'Couleur 5', WHITE),
      slot('c6', 'Couleur 6', '#FF8A5C'),
    ],
    parts: puzzleCube(),
    tags: ['cube', 'casse-tête', 'jeu'],
  },
  {
    id: 'gourde', itemId: 'decor-bottle', slug: 'gourde', label: 'Gourde', name: 'Gourde',
    description: 'Gourde isotherme avec anse.',
    materials: [slot('body', 'Gourde', '#7E9C8F', { roughness: 0.4 }), slot('cap', 'Bouchon', INK)],
    parts: [
      cyl([0.072, 0.22, 0.072], [0, 0.11, 0], 'body'),
      cyl([0.05, 0.012, 0.05], [0, 0.226, 0], 'body'),
      cyl([0.056, 0.03, 0.056], [0, 0.247, 0], 'cap'),
      tube([[-0.02, 0.255], [0, 0.285], [0.02, 0.255]], 0.004, 'cap'),
    ],
    tags: ['gourde', 'bouteille', 'eau'],
  },
]

export const { family: deskObjectFamily, items: deskObjectItems } = decorFamily('desk-object', 'Objet de bureau', DESK_OBJECTS, 'surface', ['déco', 'bureau'])

// ─── Figurines ────────────────────────────────────────────────────────────────

const FIGURINES: DecorSpec[] = [
  {
    id: 'cubi', itemId: 'mascot-cubi', slug: 'mascotte-cubi', label: 'Cubi', name: 'Mascotte Cubi',
    description: 'Petite figurine cubique, à poser partout.',
    materials: [slot('body', 'Corps', '#A497FF'), slot('eyes', 'Yeux', '#16151F')],
    parts: [
      box([0.08, 0.08, 0.08], [0, 0.04, 0], 'body', 0.015),
      box([0.012, 0.016, 0.004], [-0.018, 0.05, 0.0405], 'eyes'),
      box([0.012, 0.016, 0.004], [0.018, 0.05, 0.0405], 'eyes'),
    ],
    tags: ['mascotte', 'cubi'],
  },
  {
    id: 'robot', itemId: 'figurine-robot', slug: 'figurine-robot', label: 'Robot', name: 'Figurine robot',
    description: 'Petit robot rétro aux yeux lumineux.',
    materials: [slot('body', 'Carrosserie', '#C9C6C0', metal), slot('accent', 'Détails', '#FF6B35'), { slot: 'eyes', label: 'Yeux', default: '#24E1FF', customizable: true, emissive: 1.4 }],
    parts: [
      box([0.018, 0.03, 0.02], [-0.016, 0.015, 0], 'accent', 0.004),
      box([0.018, 0.03, 0.02], [0.016, 0.015, 0], 'accent', 0.004),
      box([0.065, 0.06, 0.045], [0, 0.06, 0], 'body', 0.006),
      box([0.03, 0.02, 0.002], [0, 0.065, 0.023], 'accent', 0.002),
      box([0.014, 0.045, 0.014], [-0.042, 0.065, 0], 'body', 0.005),
      box([0.014, 0.045, 0.014], [0.042, 0.065, 0], 'body', 0.005),
      box([0.055, 0.045, 0.045], [0, 0.115, 0], 'body', 0.008),
      ball(0.012, [-0.013, 0.118, 0.023], 'eyes', 0.012, 0.012),
      ball(0.012, [0.013, 0.118, 0.023], 'eyes', 0.012, 0.012),
      cyl([0.004, 0.025, 0.004], [0, 0.15, 0], 'body'),
      ball(0.012, [0, 0.165, 0], 'accent'),
    ],
    tags: ['robot', 'rétro', 'sci-fi'],
  },
  {
    id: 'chat', itemId: 'figurine-lucky-cat', slug: 'chat-porte-bonheur', label: 'Chat porte-bonheur', name: 'Chat porte-bonheur',
    description: 'Chat porte-bonheur qui lève la patte.',
    materials: [slot('body', 'Pelage', WHITE, { roughness: 0.3 }), slot('accent', 'Collier et oreilles', '#E8553B'), slot('bell', 'Grelot', GOLD, metal), slot('eyes', 'Yeux', INK)],
    parts: [
      box([0.075, 0.07, 0.06], [0, 0.035, 0], 'body', 0.025),
      ball(0.07, [0, 0.1, 0.005], 'body', 0.06),
      box([0.018, 0.022, 0.012], [-0.022, 0.135, 0.005], 'accent', 0.005),
      box([0.018, 0.022, 0.012], [0.022, 0.135, 0.005], 'accent', 0.005),
      box([0.06, 0.008, 0.05], [0, 0.07, 0.008], 'accent', 0.004),
      ball(0.014, [0, 0.064, 0.034], 'bell'),
      box([0.008, 0.004, 0.002], [-0.015, 0.105, 0.04], 'eyes', 0.0015),
      box([0.008, 0.004, 0.002], [0.015, 0.105, 0.04], 'eyes', 0.0015),
      box([0.02, 0.045, 0.02], [0.04, 0.115, 0.012], 'body', 0.009),
      box([0.02, 0.016, 0.02], [-0.02, 0.03, 0.03], 'body', 0.007),
    ],
    tags: ['chat', 'porte-bonheur', 'japon', 'maneki-neko'],
  },
  {
    id: 'dino', itemId: 'figurine-dino', slug: 'figurine-dinosaure', label: 'Dinosaure', name: 'Figurine dinosaure',
    description: 'Petit dinosaure à long cou et crête dorsale.',
    materials: [slot('body', 'Corps', '#4CC9A0'), slot('accent', 'Crête', '#FFCF5A'), slot('eyes', 'Yeux', INK)],
    parts: [
      ...([[-0.025, -0.015], [-0.025, 0.015], [0.025, -0.015], [0.025, 0.015]] as const).map(([x, z]) => box([0.016, 0.03, 0.016], [x, 0.015, z], 'body', 0.006)),
      ball(0.06, [0, 0.045, 0], 'body', 0.04, 0.085),
      tube([[0.03, 0.05], [0.05, 0.08], [0.055, 0.12]], 0.011, 'body'),
      ball(0.026, [0.062, 0.128, 0], 'body', 0.022, 0.036),
      ball(0.006, [0.07, 0.134, 0.011], 'eyes'),
      tube([[-0.035, 0.045], [-0.06, 0.035], [-0.085, 0.02]], 0.009, 'body'),
      ...[-0.03, -0.012, 0.006, 0.022].map((x, i) => box([0.012, 0.014 - i * 0.002, 0.004], [x, 0.069 - i * 0.002, 0], 'accent', 0.0019)),
    ],
    tags: ['dinosaure', 'dino', 'jouet'],
  },
  {
    id: 'astronaute', itemId: 'figurine-astronaut', slug: 'figurine-astronaute', label: 'Astronaute', name: 'Figurine astronaute',
    description: 'Astronaute en combinaison, visière dorée.',
    materials: [slot('body', 'Combinaison', WHITE), slot('visor', 'Visière', GOLD, { metalness: 0.7, roughness: 0.2 }), slot('accent', 'Sac et bottes', '#9AA0AC')],
    parts: [
      box([0.02, 0.03, 0.024], [-0.014, 0.015, 0], 'accent', 0.006),
      box([0.02, 0.03, 0.024], [0.014, 0.015, 0], 'accent', 0.006),
      box([0.05, 0.05, 0.034], [0, 0.055, 0], 'body', 0.012),
      box([0.04, 0.045, 0.02], [0, 0.06, -0.025], 'accent', 0.006),
      box([0.016, 0.04, 0.016], [-0.032, 0.055, 0], 'body', 0.007),
      box([0.016, 0.04, 0.016], [0.032, 0.055, 0], 'body', 0.007),
      ball(0.05, [0, 0.105, 0], 'body'),
      ball(0.026, [0, 0.106, 0.016], 'visor', 0.026, 0.034),
    ],
    tags: ['astronaute', 'espace', 'nasa'],
  },
  {
    id: 'canard', itemId: 'figurine-duck', slug: 'canard-en-plastique', label: 'Canard', name: 'Canard en plastique',
    description: 'Canard de bain, compagnon de débogage.',
    materials: [slot('body', 'Corps', '#FFCF5A', { roughness: 0.3 }), slot('beak', 'Bec', '#FF8A3D'), slot('eyes', 'Yeux', INK)],
    parts: [
      ball(0.09, [0, 0.03, 0], 'body', 0.06, 0.075),
      box([0.02, 0.02, 0.03], [0, 0.045, -0.045], 'body', 0.009),
      ball(0.05, [0, 0.08, 0.022], 'body'),
      box([0.024, 0.01, 0.024], [0, 0.076, 0.054], 'beak', 0.0045),
      ball(0.008, [-0.017, 0.09, 0.04], 'eyes'),
      ball(0.008, [0.017, 0.09, 0.04], 'eyes'),
    ],
    tags: ['canard', 'rubber duck', 'débogage', 'bain'],
  },
]

export const { family: figurineFamily, items: figurineItems } = decorFamily('figurine', 'Figurine', FIGURINES, 'surface', ['figurine', 'déco', 'jouet'])

// ─── Déco murale ──────────────────────────────────────────────────────────────

/** Panneau perforé : grille de trous. */
const pegHoles = (w: number, h: number, step: number): ProceduralPart[] => {
  const out: ProceduralPart[] = []
  for (let x = -w / 2 + step; x < w / 2 - step / 2; x += step) for (let y = -h / 2 + step; y < h / 2 - step / 2; y += step) out.push(disc(0.008, 0.001, [x, y, 0.0185], 'holes'))
  return out
}

const WALL_DECOR: DecorSpec[] = [
  {
    id: 'horloge', itemId: 'wall-clock', slug: 'horloge-murale', label: 'Horloge', name: 'Horloge murale',
    description: 'Horloge murale ronde, cadran épuré.',
    materials: [slot('frame', 'Cadre', INK), slot('face', 'Cadran', WHITE), slot('hands', 'Aiguilles', '#E8553B')],
    parts: [
      disc(0.32, 0.035, [0, 0, 0.0175], 'frame'),
      disc(0.29, 0.002, [0, 0, 0.0355], 'face'),
      ...Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        return box([0.008, i % 3 ? 0.012 : 0.024, 0.002], [Math.sin(a) * 0.125, Math.cos(a) * 0.125, 0.0375], 'frame', undefined, [0, 0, -a])
      }),
      box([0.006, 0.09, 0.002], [0, 0.04, 0.039], 'frame', undefined, [0, 0, -0.5]),
      box([0.004, 0.12, 0.002], [0.04, 0, 0.0405], 'hands', undefined, [0, 0, -Math.PI / 2]),
      disc(0.014, 0.004, [0, 0, 0.041], 'hands'),
    ],
    tags: ['horloge', 'pendule', 'heure'],
  },
  {
    id: 'miroir', itemId: 'wall-mirror', slug: 'miroir-rond', label: 'Miroir', name: 'Miroir rond',
    description: 'Grand miroir rond au cadre fin en laiton.',
    materials: [slot('frame', 'Cadre', GOLD, metal), { slot: 'mirror', label: 'Miroir', default: '#CFDCE2', customizable: false, metalness: 0.25, roughness: 0.12 }],
    // Pas de carte d'environnement dans la scène : un miroir 100 % métal serait noir, on simule un verre clair brillant.
    parts: [disc(0.6, 0.02, [0, 0, 0.01], 'frame'), disc(0.57, 0.004, [0, 0, 0.021], 'mirror')],
    tags: ['miroir', 'rond', 'laiton'],
  },
  {
    id: 'liege', itemId: 'wall-corkboard', slug: 'tableau-liege', label: 'Tableau en liège', name: 'Tableau en liège',
    description: 'Tableau en liège avec notes et photos épinglées.',
    materials: [slot('frame', 'Cadre', '#C99D70'), slot('cork', 'Liège', '#C69C6D', { roughness: 0.95 }), slot('note1', 'Notes 1', '#FFE45C'), slot('note2', 'Notes 2', '#FF9EC4'), slot('note3', 'Photos', WHITE), slot('pins', 'Punaises', '#E8553B')],
    parts: [
      box([0.6, 0.4, 0.02], [0, 0, 0.01], 'frame', 0.004),
      box([0.56, 0.36, 0.004], [0, 0, 0.021], 'cork'),
      ...([[-0.2, 0.08, 'note1', 0.08, 0.08], [-0.08, 0.1, 'note3', 0.09, 0.11], [0.06, 0.07, 'note2', 0.08, 0.08], [0.19, 0.09, 'note1', 0.07, 0.07], [-0.15, -0.08, 'note2', 0.08, 0.08], [0.0, -0.09, 'note3', 0.12, 0.09], [0.17, -0.08, 'note1', 0.08, 0.08]] as const).flatMap(([x, y, s, w, h], i) => [
        box([w, h, 0.001], [x, y, 0.0235], s, undefined, [0, 0, ((i % 3) - 1) * 0.08]),
        ball(0.009, [x, y + h / 2 - 0.012, 0.027], 'pins', 0.009),
      ]),
    ],
    tags: ['liège', 'notes', 'memo', 'tableau'],
  },
  {
    id: 'pegboard', itemId: 'wall-pegboard', slug: 'panneau-perfore', label: 'Panneau perforé', name: 'Panneau perforé',
    description: 'Panneau perforé avec tablette, crochets et accessoires.',
    materials: [slot('board', 'Panneau', '#F5F2EC'), slot('holes', 'Trous', '#B8B4AD'), slot('accent', 'Accessoires', INK), slot('accent2', 'Accessoires 2', '#FF8A5C')],
    parts: [
      box([0.6, 0.4, 0.018], [0, 0, 0.009], 'board', 0.004),
      ...pegHoles(0.6, 0.4, 0.05),
      box([0.24, 0.012, 0.1], [-0.13, -0.06, 0.068], 'accent', 0.002),
      cyl([0.06, 0.08, 0.06], [-0.18, -0.014, 0.06], 'accent2'),
      ...book(0.1, 0.03, 0.08, -0.054, -0.07, 0.06, 'accent2').map((p) => ({ ...p, slot: p.slot === 'pages' ? 'board' : p.slot })),
      box([0.008, 0.008, 0.05], [0.14, 0.12, 0.043], 'accent'),
      tube([[0.11, 0.12], [0.11, 0.02], [0.14, -0.03], [0.17, 0.02], [0.17, 0.12]], 0.006, 'accent2', [0, 0, 0.065]),
      box([0.3, 0.03, 0.004], [0.08, -0.15, 0.022], 'accent', 0.002),
    ],
    tags: ['panneau perforé', 'pegboard', 'organisation', 'atelier'],
  },
  {
    id: 'vinyles', itemId: 'wall-vinyls', slug: 'vinyles-muraux', label: 'Vinyles', name: 'Vinyles muraux',
    description: 'Trois disques vinyles accrochés en ligne.',
    materials: [slot('vinyl', 'Disques', '#16151F', { roughness: 0.25 }), slot('label1', 'Étiquette 1', '#FF6B35'), slot('label2', 'Étiquette 2', '#A497FF'), slot('label3', 'Étiquette 3', '#FFCF5A')],
    parts: [-0.34, 0, 0.34].flatMap((x, i) => [
      disc(0.3, 0.004, [x, 0, 0.006], 'vinyl'),
      disc(0.1, 0.002, [x, 0, 0.0085], `label${i + 1}`),
      disc(0.008, 0.002, [x, 0, 0.01], 'vinyl'),
    ]),
    tags: ['vinyle', 'disque', 'musique', 'rétro'],
  },
]

export const { family: wallDecorFamily, items: wallDecorItems } = decorFamily('wall-decor', 'Déco murale', WALL_DECOR, 'wall', ['déco', 'mural'])

// ─── Tapis ────────────────────────────────────────────────────────────────────

type RugShapeId = 'uni' | 'rond' | 'raye' | 'bordure'
type RugSizeId = 'petit' | 'moyen' | 'grand'

const RUG_SHAPES: { id: RugShapeId; label: string; name: string }[] = [
  { id: 'uni', label: 'Uni', name: 'Tapis' },
  { id: 'rond', label: 'Rond', name: 'Tapis rond' },
  { id: 'raye', label: 'Rayé', name: 'Tapis rayé' },
  { id: 'bordure', label: 'Bordure', name: 'Tapis à bordure' },
]

/** Rectangle (L × l) ou diamètre pour le rond. */
const RUG_SIZES: { id: RugSizeId; label: string; rect: [number, number]; round: number }[] = [
  { id: 'petit', label: 'Petit', rect: [1.2, 0.8], round: 1.0 },
  { id: 'moyen', label: 'Moyen', rect: [1.6, 1.2], round: 1.4 },
  { id: 'grand', label: 'Grand', rect: [2.0, 1.4], round: 1.8 },
]

export const rugFamily: CatalogFamily = {
  id: 'rug',
  name: 'Tapis',
  category: 'decor',
  axes: [
    { id: 'shape', label: 'Motif', values: RUG_SHAPES.map(({ id, label }) => ({ id, label })) },
    { id: 'size', label: 'Taille', values: RUG_SIZES.map(({ id, label }) => ({ id, label })) },
  ],
  defaults: { shape: 'uni', size: 'moyen' },
}

const RUG_H = 0.012

function rugParts(shape: RugShapeId, size: (typeof RUG_SIZES)[number]): ProceduralPart[] {
  const [w, d] = size.rect
  switch (shape) {
    case 'uni':
      return [box([w, RUG_H, d], [0, RUG_H / 2, 0], 'main', 0.004)]
    case 'rond':
      return [cyl([size.round, RUG_H, size.round], [0, RUG_H / 2, 0], 'main'), cyl([size.round * 0.62, 0.001, size.round * 0.62], [0, RUG_H + 0.0005, 0], 'main2')]
    case 'raye': {
      const n = 7
      const sw = w / (n * 2 + 1)
      return [
        box([w, RUG_H, d], [0, RUG_H / 2, 0], 'main', 0.004),
        ...Array.from({ length: n }, (_, i) => box([sw, 0.001, d - 0.02], [-w / 2 + sw * (i * 2 + 1.5), RUG_H + 0.0005, 0], 'main2')),
      ]
    }
    case 'bordure':
      return [box([w, RUG_H, d], [0, RUG_H / 2, 0], 'main2', 0.004), box([w - 0.16, 0.001, d - 0.16], [0, RUG_H + 0.0005, 0], 'main')]
  }
}

const RUG_COLORS: Record<RugShapeId, [string, string?]> = {
  uni: ['#A497FF'],
  rond: ['#E9DFD0', '#C9A26B'],
  raye: ['#F5F2EC', '#2E2C3D'],
  bordure: ['#7E9C8F', '#E9DFD0'],
}

export const rugItems: CatalogItem[] = RUG_SHAPES.flatMap((shape) =>
  RUG_SIZES.map((size): CatalogItem => {
    const parts = rugParts(shape.id, size)
    const [c1, c2] = RUG_COLORS[shape.id]
    const legacy = shape.id === 'uni' && size.id === 'moyen'
    const dims = shape.id === 'rond' ? `Ø ${size.round * 100} cm` : `${size.rect[0] * 100} × ${size.rect[1] * 100} cm`
    return {
      id: legacy ? 'rug' : `rug-${shape.id}-${size.id}`,
      slug: legacy ? 'tapis' : `tapis-${shape.id}-${size.id}`,
      name: `${shape.name} ${size.label.toLowerCase()}`,
      category: 'decor',
      description: `${shape.name} ${dims}.`,
      dimensions: extents(parts),
      defaultScale: 1,
      placement: 'floor',
      surface: { height: RUG_H },
      materials: [
        { slot: 'main', label: shape.id === 'bordure' ? 'Centre' : 'Tapis', default: c1, customizable: true, roughness: 0.95 },
        ...(c2 ? [{ slot: 'main2', label: shape.id === 'bordure' ? 'Bordure' : 'Motif', default: c2, customizable: true, roughness: 0.95 }] : []),
      ],
      model: { type: 'procedural', parts },
      tags: ['tapis', 'rug', 'sol', ...(shape.id === 'rond' ? ['rond'] : []), ...(shape.id === 'raye' ? ['rayé', 'rayures'] : [])],
      family: { id: rugFamily.id, options: { shape: shape.id, size: size.id } },
    }
  }),
)
