import type { CatalogFamily, CatalogItem, MaterialSlot, ProceduralPart } from '../types'

/**
 * Famille « Néon » : une forme lumineuse (tube) sur un support en plexiglas, au mur ou à poser.
 * Les formes sont des tracés 2D (coordonnées libres, mises à l'échelle à la création) ;
 * le moteur 3D en fait des tubes émissifs, les vignettes isométriques une suite de petits cubes.
 */

type Point = [number, number]
interface Stroke {
  points: Point[]
  closed?: boolean
  smooth?: boolean
}

interface ShapeSpec {
  id: string
  label: string
  name: string
  color: string
  /** Plus grande dimension du tracé, en mètres. */
  size: number
  strokes: Stroke[]
  tags: string[]
}

const TAU = Math.PI * 2
const range = (n: number) => Array.from({ length: n }, (_, i) => i)
const circle = (cx: number, cy: number, r: number, n = 28): Point[] => range(n).map((i) => [cx + r * Math.cos((i / n) * TAU), cy + r * Math.sin((i / n) * TAU)])
const arc = (cx: number, cy: number, rx: number, ry: number, from: number, to: number, n = 24): Point[] =>
  range(n + 1).map((i) => {
    const a = from + ((to - from) * i) / n
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]
  })
const deg = (d: number) => (d * Math.PI) / 180

function heart(): Stroke[] {
  const points = range(48).map((i): Point => {
    const t = (i / 48) * TAU
    return [16 * Math.sin(t) ** 3, 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)]
  })
  return [{ points, closed: true, smooth: true }]
}

function star(): Stroke[] {
  const points = range(10).map((i): Point => {
    const a = deg(90) + (i * TAU) / 10
    const r = i % 2 === 0 ? 1 : 0.45
    return [r * Math.cos(a), r * Math.sin(a)]
  })
  return [{ points, closed: true }]
}

/** Croissant : grand arc extérieur, puis arc d'un cercle décalé qui revient par l'intérieur. */
function moon(): Stroke[] {
  const tip = deg(40)
  const outer = arc(0, 0, 1, 1, tip, TAU - tip, 32)
  const [ex, ey] = [Math.cos(tip), Math.sin(tip)]
  const c = 0.5
  const r = Math.hypot(ex - c, ey)
  const t = Math.atan2(ey, ex - c)
  const inner = arc(c, 0, r, r, TAU - t, t, 24).slice(1, -1)
  return [{ points: [...outer, ...inner], closed: true }]
}

function wave(): Stroke[] {
  const line = (y: number): Point[] => range(33).map((i) => {
    const x = -1 + i / 16
    return [x, y + 0.22 * Math.sin(x * Math.PI * 2)]
  })
  return [
    { points: line(0.28), smooth: true },
    { points: line(-0.28), smooth: true },
  ]
}

function planet(): Stroke[] {
  const tilt = deg(-14)
  // Anneau : seule la partie qui passe devant la planète et dépasse sur les côtés est dessinée.
  const ring = arc(0, 0, 1.15, 0.32, deg(160), deg(380), 36).map(([x, y]): Point => [
    x * Math.cos(tilt) - y * Math.sin(tilt),
    x * Math.sin(tilt) + y * Math.cos(tilt),
  ])
  return [
    { points: circle(0, 0, 0.62, 32), closed: true, smooth: true },
    { points: ring, smooth: true },
  ]
}

function smile(): Stroke[] {
  return [
    { points: circle(0, 0, 1, 36), closed: true, smooth: true },
    { points: [[-0.36, 0.42], [-0.36, 0.12]] },
    { points: [[0.36, 0.42], [0.36, 0.12]] },
    { points: arc(0, 0.05, 0.55, 0.5, deg(200), deg(340), 16), smooth: true },
  ]
}

const SHAPES: ShapeSpec[] = [
  { id: 'coeur', label: 'Cœur', name: 'Néon cœur', color: '#FF4FD8', size: 0.32, strokes: heart(), tags: ['cœur', 'love'] },
  {
    id: 'eclair', label: 'Éclair', name: 'Néon éclair', color: '#FFE45C', size: 0.36, tags: ['éclair', 'flash', 'gaming'],
    strokes: [{ points: [[-0.15, 1], [0.5, 1], [0.12, 0.22], [0.58, 0.22], [-0.38, -1], [-0.04, -0.08], [-0.5, -0.08]], closed: true }],
  },
  { id: 'etoile', label: 'Étoile', name: 'Néon étoile', color: '#24E1FF', size: 0.34, strokes: star(), tags: ['étoile', 'star'] },
  { id: 'lune', label: 'Lune', name: 'Néon lune', color: '#B9A8FF', size: 0.32, strokes: moon(), tags: ['lune', 'nuit', 'moon'] },
  { id: 'vague', label: 'Vagues', name: 'Néon vagues', color: '#4CF2C2', size: 0.4, strokes: wave(), tags: ['vague', 'onde', 'wave'] },
  { id: 'planete', label: 'Planète', name: 'Néon planète', color: '#FF6B35', size: 0.4, strokes: planet(), tags: ['planète', 'espace', 'saturne'] },
  { id: 'sourire', label: 'Sourire', name: 'Néon sourire', color: '#FFE45C', size: 0.3, strokes: smile(), tags: ['sourire', 'smiley'] },
]

type MountId = 'mural' | 'pose'
const MOUNTS: { id: MountId; label: string }[] = [
  { id: 'mural', label: 'Mural' },
  { id: 'pose', label: 'À poser' },
]

export const neonFamily: CatalogFamily = {
  id: 'neon',
  name: 'Néon',
  category: 'lighting',
  axes: [
    { id: 'shape', label: 'Forme', values: SHAPES.map(({ id, label }) => ({ id, label })) },
    { id: 'mount', label: 'Pose', values: MOUNTS.map(({ id, label }) => ({ id, label })) },
  ],
  defaults: { shape: 'coeur', mount: 'mural' },
}

const TUBE_RADIUS = 0.006
const PLATE_MARGIN = 0.035
const PLATE_THICKNESS = 0.006
const BASE_HEIGHT = 0.03

/** Tracés centrés sur l'origine, mis à l'échelle de `shape.size`, et leur encombrement. */
function normalize(shape: ShapeSpec) {
  const all = shape.strokes.flatMap((s) => s.points)
  const xs = all.map((p) => p[0])
  const ys = all.map((p) => p[1])
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const k = shape.size / Math.max(maxX - minX, maxY - minY)
  const [cx, cy] = [(minX + maxX) / 2, (minY + maxY) / 2]
  const round = (v: number) => Math.round(v * 10000) / 10000
  const strokes = shape.strokes.map((s) => ({ ...s, points: s.points.map(([x, y]): Point => [round((x - cx) * k), round((y - cy) * k)]) }))
  return { strokes, width: (maxX - minX) * k, height: (maxY - minY) * k }
}

function tubes(strokes: Stroke[], center: [number, number, number]): ProceduralPart[] {
  return strokes.map((stroke) => {
    const xs = stroke.points.map((p) => p[0])
    const ys = stroke.points.map((p) => p[1])
    const d = TUBE_RADIUS * 2
    return {
      shape: 'tube',
      slot: 'neon',
      position: center,
      size: [Math.max(...xs) - Math.min(...xs) + d, Math.max(...ys) - Math.min(...ys) + d, d],
      tube: { points: stroke.points, radius: TUBE_RADIUS, closed: stroke.closed, smooth: stroke.smooth },
    }
  })
}

const box = (size: [number, number, number], position: [number, number, number], slot: string, radius?: number): ProceduralPart => ({
  shape: 'box', size, position, slot, radius,
})

function materials(shape: ShapeSpec): MaterialSlot[] {
  return [
    { slot: 'neon', label: 'Néon', default: shape.color, customizable: true, emissive: 2.6 },
    { slot: 'plate', label: 'Support', default: '#2E2C3D', customizable: true, roughness: 0.25 },
  ]
}

function neonItem(shape: ShapeSpec, mount: MountId): CatalogItem {
  const { strokes, width, height } = normalize(shape)
  const plateW = Math.round((width + PLATE_MARGIN * 2) * 1000) / 1000
  const plateH = Math.round((height + PLATE_MARGIN * 2) * 1000) / 1000
  const common = {
    id: `neon-${shape.id}-${mount}`,
    slug: `neon-${shape.id}${mount === 'pose' ? '-a-poser' : ''}`,
    category: 'lighting' as const,
    defaultScale: 1,
    materials: materials(shape),
    family: { id: neonFamily.id, options: { shape: shape.id, mount } },
  }
  const size = `${Math.round(plateW * 100)} × ${Math.round(plateH * 100)} cm`

  if (mount === 'mural') {
    // Objet mural : origine au centre, dos contre le mur (z = 0), face vers +Z.
    const tubeZ = PLATE_THICKNESS + TUBE_RADIUS + 0.002
    return {
      ...common,
      name: shape.name,
      description: `Néon mural sur plexiglas, ${size}.`,
      dimensions: { width: plateW, height: plateH, depth: tubeZ + TUBE_RADIUS },
      placement: 'wall',
      model: {
        type: 'procedural',
        parts: [box([plateW, plateH, PLATE_THICKNESS], [0, 0, PLATE_THICKNESS / 2], 'plate', 0.0025), ...tubes(strokes, [0, 0, tubeZ])],
      },
      light: { slot: 'neon', intensity: 1.6, distance: 1.6, position: [0, 0, 0.12] },
      tags: ['néon', 'lumière', 'mural', ...shape.tags],
    }
  }

  // À poser : socle + plaque verticale, origine au centre du socle, au sol.
  const baseD = 0.07
  const centerY = BASE_HEIGHT - 0.008 + plateH / 2
  const tubeZ = PLATE_THICKNESS / 2 + TUBE_RADIUS + 0.002
  return {
    ...common,
    name: `${shape.name} à poser`,
    description: `Néon sur socle, ${size}.`,
    dimensions: { width: plateW, height: BASE_HEIGHT - 0.008 + plateH, depth: baseD },
    placement: 'surface',
    model: {
      type: 'procedural',
      parts: [
        box([plateW * 0.8, BASE_HEIGHT, baseD], [0, BASE_HEIGHT / 2, 0], 'plate', 0.006),
        box([plateW, plateH, PLATE_THICKNESS], [0, centerY, 0], 'plate', 0.0025),
        ...tubes(strokes, [0, centerY, tubeZ]),
      ],
    },
    light: { slot: 'neon', intensity: 1.2, distance: 1.2, position: [0, centerY, 0.12] },
    tags: ['néon', 'lumière', 'à poser', ...shape.tags],
  }
}

export const neonItems: CatalogItem[] = SHAPES.flatMap((shape) => MOUNTS.map((m) => neonItem(shape, m.id)))
