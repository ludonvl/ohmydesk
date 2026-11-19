import type { CatalogFamily, CatalogItem, MaterialSlot, Placement, ProceduralPart, Vec3 } from '../types'

/**
 * Famille « Lampe » : lampes de bureau, lampadaires et éclairages muraux.
 * Repère : origine au centre de la base, au sol ou sur la surface ; face avant vers +Z. Modèles muraux :
 * origine au centre, contre le mur (z = 0), comme les posters.
 * Chaque lampe (sauf la lampe d'archi, d'avant la famille, laissée telle quelle pour ne pas changer
 * l'éclairage des scènes existantes) émet une lumière ponctuelle de la couleur de son slot lumineux.
 * Les vignettes isométriques ignorent les rotations (pieds du trépied, hexagones) : pièces dessinées droites.
 */

const INK = '#2E2C3D'
const WHITE = '#F5F2EC'
const WARM = '#FFF4D6'
const r3 = (v: number) => Math.round(v * 10000) / 10000
const rv = (v: Vec3): Vec3 => [r3(v[0]), r3(v[1]), r3(v[2])]

const box = (size: Vec3, position: Vec3, slot: string, radius?: number, rotation?: Vec3): ProceduralPart => ({
  shape: 'box', size: rv(size), position: rv(position), slot, radius, rotation,
})
const cyl = (size: Vec3, position: Vec3, slot: string): ProceduralPart => ({ shape: 'cylinder', size: rv(size), position: rv(position), slot })
/** Sphère : boîte arrondie au maximum. */
const ball = (d: number, position: Vec3, slot: string, h = d): ProceduralPart => box([d, h, d], position, slot, Math.min(d, h) / 2 - 0.0002)

function tube(points: [number, number][], radius: number, slot: string, position: Vec3 = [0, 0, 0], opts: { smooth?: boolean; closed?: boolean; rotation?: Vec3 } = {}): ProceduralPart {
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  return {
    shape: 'tube',
    slot,
    position: rv(position),
    rotation: opts.rotation,
    size: [r3(Math.max(...xs) - Math.min(...xs) + radius * 2), r3(Math.max(...ys) - Math.min(...ys) + radius * 2), radius * 2],
    tube: { points: points.map(([x, y]) => [r3(x), r3(y)]), radius, smooth: opts.smooth ?? true, closed: opts.closed },
  }
}

/** Encombrement : les tubes comptent par leurs points (le lampadaire arc déborde d'un seul côté). */
function extents(parts: ProceduralPart[]) {
  let [x, y0, y1, z] = [0, 0, 0, 0]
  const grow = (px: number, py0: number, py1: number, pz: number) => {
    x = Math.max(x, Math.abs(px))
    y0 = Math.min(y0, py0)
    y1 = Math.max(y1, py1)
    z = Math.max(z, Math.abs(pz))
  }
  for (const p of parts) {
    const [w, h, d] = p.size
    if (p.tube && !p.rotation) {
      for (const [tx, ty] of p.tube.points) grow(p.position[0] + tx + Math.sign(tx) * p.tube.radius, p.position[1] + ty, p.position[1] + ty, p.position[2] + d / 2)
    } else {
      grow(Math.abs(p.position[0]) + w / 2, p.position[1] - h / 2, p.position[1] + h / 2, Math.abs(p.position[2]) + d / 2)
    }
  }
  return { width: r3(x * 2), height: r3(y1 - y0), depth: r3(z * 2) }
}

interface LampSpec {
  id: string
  /** `lamp-architect` existait avant la famille : des scènes y font référence. */
  itemId: string
  slug: string
  label: string
  name: string
  description: string
  placement: Placement
  materials: MaterialSlot[]
  parts: ProceduralPart[]
  light?: CatalogItem['light']
  tags: string[]
}

const glow = (slot: string, label: string, color: string, emissive = 1.3, customizable = true): MaterialSlot => ({ slot, label, default: color, customizable, emissive })

// Lampadaire arc : tracé du mât (plan XY), abat-jour au bout.
const ARC: [number, number][] = [[0, 0.05], [0, 0.9], [0.06, 1.55], [0.35, 1.95], [0.75, 2.02], [1.02, 1.86], [1.06, 1.74]]
const ARC_END: Vec3 = [1.06, 1.62, 0]

// Lampadaire trépied : trois pieds (tubes tournés autour de Y) qui se rejoignent sous l'abat-jour.
const TRIPOD_TOP = 1.18
const tripodLeg = (angle: number) => tube([[0, TRIPOD_TOP], [0.3, 0]], 0.011, 'legs', [0, 0, 0], { smooth: false, rotation: [0, r3(angle), 0] })

// Panneaux hexagonaux muraux : un hexagone = trois rectangles tournés de 60°.
const HEX_R = 0.1
const HEX_CENTERS: [number, number, string][] = [
  [-1.6 * HEX_R, -0.47 * HEX_R, 'c1'],
  [0, 0.47 * HEX_R, 'c2'],
  [1.6 * HEX_R, -0.47 * HEX_R, 'c3'],
  [0, -1.42 * HEX_R, 'c1'],
  [1.6 * HEX_R, 1.42 * HEX_R, 'c1'],
]
const hexagon = ([cx, cy, slot]: [number, number, string]): ProceduralPart[] =>
  [0, Math.PI / 3, (2 * Math.PI) / 3].map((a) => box([HEX_R, HEX_R * Math.sqrt(3), 0.012], [cx, cy, 0.006], slot, undefined, [0, 0, r3(a)]))

// Guirlande : fil en chaînette, ampoules suspendues.
const GARLAND_W = 1.2
const sag = (x: number) => 0.08 - 0.16 * (1 - (x / (GARLAND_W / 2)) ** 2)
const GARLAND_PTS: [number, number][] = Array.from({ length: 13 }, (_, i) => {
  const x = -GARLAND_W / 2 + (GARLAND_W * i) / 12
  return [x, sag(x)]
})

const LAMPS: LampSpec[] = [
  {
    id: 'archi', itemId: 'lamp-architect', slug: 'lampe-architecte', label: "D'archi", name: "Lampe d'archi",
    description: "Lampe d'architecte à bras articulé.",
    placement: 'surface',
    materials: [
      { slot: 'shade', label: 'Abat-jour', default: '#FFCF5A', customizable: true },
      { slot: 'frame', label: 'Bras', default: INK, customizable: true },
      glow('bulb', 'Ampoule', WARM, 1.4, false),
    ],
    parts: [
      cyl([0.14, 0.025, 0.14], [0, 0.0125, 0], 'frame'),
      box([0.018, 0.42, 0.018], [0, 0.235, 0], 'frame'),
      box([0.018, 0.018, 0.22], [0, 0.44, 0.1], 'frame'),
      cyl([0.13, 0.08, 0.13], [0, 0.42, 0.2], 'shade'),
      cyl([0.08, 0.01, 0.08], [0, 0.375, 0.2], 'bulb'),
    ],
    tags: ['architecte', 'articulée'],
  },
  {
    id: 'champignon', itemId: 'lamp-mushroom', slug: 'lampe-champignon', label: 'Champignon', name: 'Lampe champignon',
    description: 'Petite lampe champignon au dôme arrondi, lumière douce.',
    placement: 'surface',
    materials: [
      { slot: 'shade', label: 'Dôme et pied', default: '#FF8A5C', customizable: true, roughness: 0.3 },
      glow('bulb', 'Lumière', '#FFE2B8', 1.2),
    ],
    parts: [
      cyl([0.13, 0.018, 0.13], [0, 0.009, 0], 'shade'),
      cyl([0.035, 0.2, 0.035], [0, 0.11, 0], 'shade'),
      cyl([0.15, 0.006, 0.15], [0, 0.213, 0], 'bulb'),
      box([0.22, 0.1, 0.22], [0, 0.26, 0], 'shade', 0.0499),
    ],
    light: { slot: 'bulb', intensity: 0.7, distance: 1.2, position: [0, 0.18, 0] },
    tags: ['champignon', 'mushroom', 'vintage', 'rétro'],
  },
  {
    id: 'globe', itemId: 'lamp-globe', slug: 'lampe-globe', label: 'Globe', name: 'Lampe globe',
    description: 'Boule en verre opalin sur socle en bois.',
    placement: 'surface',
    materials: [
      { slot: 'base', label: 'Socle', default: '#C99D70', customizable: true },
      glow('globe', 'Globe', WARM, 0.9),
    ],
    parts: [cyl([0.12, 0.05, 0.12], [0, 0.025, 0], 'base'), ball(0.2, [0, 0.145, 0], 'globe')],
    light: { slot: 'globe', intensity: 0.8, distance: 1.4, position: [0, 0.15, 0.12] },
    tags: ['globe', 'boule', 'opaline'],
  },
  {
    id: 'led', itemId: 'lamp-led', slug: 'lampe-led', label: 'LED fine', name: 'Lampe LED fine',
    description: 'Lampe de bureau LED minimaliste, tête plate en porte-à-faux.',
    placement: 'surface',
    materials: [
      { slot: 'frame', label: 'Structure', default: WHITE, customizable: true, metalness: 0.3, roughness: 0.4 },
      glow('bulb', 'LED', '#F2F6FF', 1.5),
    ],
    parts: [
      box([0.16, 0.012, 0.16], [0, 0.006, -0.03], 'frame', 0.004),
      box([0.014, 0.42, 0.014], [0, 0.222, -0.09], 'frame', 0.004),
      box([0.05, 0.012, 0.36], [0, 0.43, 0.08], 'frame', 0.004),
      box([0.034, 0.003, 0.3], [0, 0.4225, 0.1], 'bulb'),
    ],
    light: { slot: 'bulb', intensity: 0.8, distance: 1.2, position: [0, 0.38, 0.12] },
    tags: ['led', 'minimaliste', 'moderne'],
  },
  {
    id: 'chevet', itemId: 'lamp-bedside', slug: 'lampe-chevet', label: 'Abat-jour', name: 'Lampe à abat-jour',
    description: 'Lampe à abat-jour en tissu, pied en céramique.',
    placement: 'surface',
    materials: [
      { slot: 'base', label: 'Pied', default: '#7E9C8F', customizable: true, roughness: 0.3 },
      { slot: 'shade', label: 'Abat-jour', default: '#F6E3D4', customizable: true, roughness: 0.95 },
      glow('bulb', 'Lumière', '#FFE2B8', 1.1, false),
    ],
    parts: [
      ball(0.13, [0, 0.07, 0], 'base', 0.14),
      cyl([0.02, 0.12, 0.02], [0, 0.19, 0], 'base'),
      cyl([0.13, 0.004, 0.13], [0, 0.248, 0], 'bulb'),
      cyl([0.22, 0.16, 0.22], [0, 0.33, 0], 'shade'),
    ],
    light: { slot: 'bulb', intensity: 0.7, distance: 1.3, position: [0, 0.3, 0] },
    tags: ['chevet', 'abat-jour', 'tissu', 'salon'],
  },
  {
    id: 'lave', itemId: 'lamp-lava', slug: 'lampe-a-lave', label: 'À lave', name: 'Lampe à lave',
    description: 'Lampe à lave rétro : bulles de cire dans un liquide coloré.',
    placement: 'surface',
    materials: [
      { slot: 'base', label: 'Socle', default: '#C9C6C0', customizable: true, metalness: 0.5, roughness: 0.35 },
      { slot: 'liquid', label: 'Liquide', default: '#6B4FD8', customizable: true, emissive: 0.6, opacity: 0.6 },
      glow('wax', 'Cire', '#FF6B9A', 1.2),
    ],
    parts: [
      cyl([0.11, 0.1, 0.11], [0, 0.05, 0], 'base'),
      cyl([0.085, 0.24, 0.085], [0, 0.22, 0], 'liquid'),
      ball(0.05, [0.005, 0.14, 0], 'wax', 0.06),
      ball(0.035, [-0.01, 0.23, 0.005], 'wax'),
      ball(0.028, [0.012, 0.3, -0.004], 'wax', 0.034),
      cyl([0.06, 0.05, 0.06], [0, 0.365, 0], 'base'),
    ],
    light: { slot: 'wax', intensity: 0.4, distance: 0.9, position: [0, 0.22, 0.08] },
    tags: ['lave', 'lava', 'rétro', '70s'],
  },
  {
    id: 'barres', itemId: 'lamp-light-bars', slug: 'barres-lumineuses', label: 'Barres RGB', name: 'Barres lumineuses RGB',
    description: 'Paire de barres lumineuses RGB, à placer de part et d’autre de l’écran.',
    placement: 'surface',
    materials: [{ slot: 'base', label: 'Socles', default: INK, customizable: true }, glow('glow', 'Lumière', '#A497FF', 1.4)],
    parts: [-1, 1].flatMap((sx) => [
      box([0.08, 0.015, 0.08], [sx * 0.26, 0.0075, 0], 'base', 0.005),
      box([0.034, 0.32, 0.034], [sx * 0.26, 0.175, 0], 'glow', 0.012),
    ]),
    light: { slot: 'glow', intensity: 1.0, distance: 1.4, position: [0, 0.2, 0.06] },
    tags: ['rgb', 'gaming', 'ambiance', 'barres'],
  },
  {
    id: 'arc', itemId: 'lamp-arc', slug: 'lampadaire-arc', label: 'Lampadaire arc', name: 'Lampadaire arc',
    description: 'Lampadaire à grand arc, socle en marbre, abat-jour en surplomb.',
    placement: 'floor',
    materials: [
      { slot: 'base', label: 'Socle', default: '#E9E5DD', customizable: true, roughness: 0.25 },
      { slot: 'frame', label: 'Arc', default: '#C9C6C0', customizable: true, metalness: 0.6, roughness: 0.3 },
      { slot: 'shade', label: 'Abat-jour', default: INK, customizable: true },
      glow('bulb', 'Lumière', WARM, 1.3, false),
    ],
    parts: [
      box([0.3, 0.06, 0.24], [0, 0.03, 0], 'base', 0.01),
      tube(ARC, 0.012, 'frame'),
      box([0.36, 0.17, 0.36], [ARC_END[0], ARC_END[1], 0], 'shade', 0.08),
      cyl([0.18, 0.008, 0.18], [ARC_END[0], ARC_END[1] - 0.085, 0], 'bulb'),
    ],
    light: { slot: 'bulb', intensity: 1.4, distance: 2.6, position: [ARC_END[0], ARC_END[1] - 0.2, 0] },
    tags: ['lampadaire', 'arc', 'sol', 'salon'],
  },
  {
    id: 'trepied', itemId: 'lamp-tripod', slug: 'lampadaire-trepied', label: 'Trépied', name: 'Lampadaire trépied',
    description: 'Lampadaire à trois pieds en bois, abat-jour tambour.',
    placement: 'floor',
    materials: [
      { slot: 'legs', label: 'Pieds', default: '#A0683E', customizable: true },
      { slot: 'shade', label: 'Abat-jour', default: WHITE, customizable: true, roughness: 0.95 },
      glow('bulb', 'Lumière', '#FFE2B8', 1.1, false),
    ],
    parts: [
      tripodLeg(-Math.PI / 2),
      tripodLeg(Math.PI / 6),
      tripodLeg((5 * Math.PI) / 6),
      cyl([0.025, 0.2, 0.025], [0, TRIPOD_TOP + 0.08, 0], 'legs'),
      cyl([0.22, 0.004, 0.22], [0, TRIPOD_TOP + 0.17, 0], 'bulb'),
      cyl([0.4, 0.28, 0.4], [0, TRIPOD_TOP + 0.3, 0], 'shade'),
    ],
    light: { slot: 'bulb', intensity: 1.2, distance: 2.4, position: [0, TRIPOD_TOP + 0.15, 0] },
    tags: ['lampadaire', 'trépied', 'sol', 'scandinave'],
  },
  {
    id: 'hexagones', itemId: 'lamp-hex-panels', slug: 'panneaux-hexagonaux', label: 'Hexagones', name: 'Panneaux hexagonaux',
    description: 'Cinq panneaux lumineux hexagonaux à composer au mur.',
    placement: 'wall',
    materials: [glow('c1', 'Panneaux 1', '#24E1FF', 1.0), glow('c2', 'Panneau 2', '#FF4FD8', 1.0), glow('c3', 'Panneau 3', '#A497FF', 1.0)],
    parts: HEX_CENTERS.flatMap(hexagon),
    light: { slot: 'c1', intensity: 1.2, distance: 1.6, position: [0, 0, 0.15] },
    tags: ['hexagone', 'panneaux', 'mural', 'rgb', 'gaming', 'nanoleaf'],
  },
  {
    id: 'guirlande', itemId: 'lamp-string', slug: 'guirlande-lumineuse', label: 'Guirlande', name: 'Guirlande lumineuse',
    description: 'Guirlande de petites ampoules, suspendue au mur.',
    placement: 'wall',
    materials: [{ slot: 'wire', label: 'Fil', default: INK, customizable: true }, glow('bulbs', 'Ampoules', '#FFD98A', 1.4)],
    parts: [
      tube(GARLAND_PTS, 0.002, 'wire', [0, 0, 0.02]),
      ...GARLAND_PTS.slice(1, -1).map(([x, y]) => ball(0.024, [x, y - 0.025, 0.02], 'bulbs', 0.032)),
    ],
    light: { slot: 'bulbs', intensity: 0.9, distance: 1.4, position: [0, -0.05, 0.15] },
    tags: ['guirlande', 'ampoules', 'mural', 'ambiance', 'cosy'],
  },
]

export const lampFamily: CatalogFamily = {
  id: 'lamp',
  name: 'Lampe',
  category: 'lighting',
  axes: [{ id: 'model', label: 'Modèle', values: LAMPS.map(({ id, label }) => ({ id, label })) }],
  defaults: { model: 'archi' },
}

export const lampItems: CatalogItem[] = LAMPS.map((spec) => ({
  id: spec.itemId,
  slug: spec.slug,
  name: spec.name,
  category: 'lighting',
  description: spec.description,
  dimensions: extents(spec.parts),
  defaultScale: 1,
  placement: spec.placement,
  materials: spec.materials,
  model: { type: 'procedural', parts: spec.parts },
  ...(spec.light ? { light: spec.light } : {}),
  tags: ['lampe', 'lumière', 'éclairage', 'lamp', ...spec.tags],
  family: { id: lampFamily.id, options: { model: spec.id } },
}))
