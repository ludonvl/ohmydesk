import type { CatalogFamily, CatalogItem, MaterialSlot, ProceduralPart, Vec3 } from '../types'

/**
 * Famille « Bureau » : chaque combinaison plateau × piètement est un objet du catalogue.
 * Les pièces restent des boîtes alignées sur les axes : les vignettes isométriques (shared/iso.ts)
 * les dessinent sans approximation.
 *
 * Repère : origine au centre de l'encombrement, au sol ; face avant vers +Z.
 */

const HEIGHT = 0.75
const TOP_THICKNESS = 0.03
/** Dessous du plateau. */
const UNDER = HEIGHT - TOP_THICKNESS
/** Retrait des supports par rapport au bord du plateau, dans le sens de leur longueur. */
const EDGE = 0.04

type TopId = 'compact' | 'classique' | 'grand' | 'angle'
type BaseId = 'fins' | 'treteaux' | 'luge' | 'panneaux' | 'caisson' | 'assis-debout'

interface TopSpec {
  id: TopId
  label: string
  /** Complément du nom de l'objet (vide pour le plateau par défaut). */
  suffix: string
  width: number
  depth: number
  /** Retour d'angle à gauche, vers l'avant (plateau en L). */
  corner?: { width: number }
  tags: string[]
}

interface BaseSpec {
  id: BaseId
  label: string
  name: string
  description: string
  /** Distance entre le bord latéral du plateau et l'axe d'un support. */
  inset: number
  colors: { top: string; legs: string; accent?: string }
  tags: string[]
}

const TOPS: TopSpec[] = [
  { id: 'compact', label: 'Compact', suffix: 'compact', width: 1.0, depth: 0.6, tags: ['petit', 'compact'] },
  { id: 'classique', label: 'Classique', suffix: '', width: 1.4, depth: 0.7, tags: [] },
  { id: 'grand', label: 'Grand', suffix: 'grand format', width: 1.8, depth: 0.8, tags: ['grand', 'large'] },
  { id: 'angle', label: 'En angle', suffix: 'en angle', width: 1.6, depth: 1.4, corner: { width: 0.6 }, tags: ['angle', 'L', 'corner'] },
]

const BASES: BaseSpec[] = [
  {
    id: 'fins', label: 'Pieds fins', name: 'Bureau pieds fins', description: 'quatre pieds fins',
    inset: 0.045, colors: { top: '#FBF8F3', legs: '#2E2C3D' }, tags: ['minimal'],
  },
  {
    id: 'treteaux', label: 'Tréteaux', name: 'Bureau tréteaux', description: 'tréteaux en bois',
    inset: 0.2, colors: { top: '#C99D70', legs: '#F5F2EC' }, tags: ['tréteaux', 'bois', 'scandinave'],
  },
  {
    id: 'luge', label: 'Luge', name: 'Bureau luge', description: 'piètement luge en métal',
    inset: 0.035, colors: { top: '#2E2C3D', legs: '#D9D4CC' }, tags: ['luge', 'métal', 'industriel'],
  },
  {
    id: 'panneaux', label: 'Panneaux', name: 'Bureau panneaux', description: 'joues pleines et voile de fond',
    inset: 0.025, colors: { top: '#F5F2EC', legs: '#7E9C8F' }, tags: ['panneaux', 'joues'],
  },
  {
    id: 'caisson', label: 'Caisson', name: 'Bureau à caisson', description: 'caisson trois tiroirs',
    inset: 0.025, colors: { top: '#C99D70', legs: '#F5F2EC', accent: '#7E9C8F' }, tags: ['caisson', 'tiroirs', 'rangement'],
  },
  {
    id: 'assis-debout', label: 'Assis-debout', name: 'Bureau assis-debout', description: 'colonnes motorisées',
    inset: 0.12, colors: { top: '#E9DFD0', legs: '#2E2C3D' }, tags: ['assis-debout', 'standing desk', 'réglable'],
  },
]

export const deskFamily: CatalogFamily = {
  id: 'desk',
  name: 'Bureau',
  category: 'desks',
  axes: [
    { id: 'base', label: 'Piètement', values: BASES.map(({ id, label }) => ({ id, label })) },
    { id: 'top', label: 'Plateau', values: TOPS.map(({ id, label }) => ({ id, label })) },
  ],
  defaults: { base: 'fins', top: 'classique' },
}

/* ------------------------------------------------------------------ */
/* Supports                                                            */
/* ------------------------------------------------------------------ */

/**
 * Ligne d'appui sous le plateau : un support (paire de pieds, joue, tréteau…) s'étend le long de `axis`,
 * de `from` à `to`, à la coordonnée `at` sur l'autre axe.
 */
interface Station {
  axis: 'x' | 'z'
  at: number
  from: number
  to: number
  /** Coordonnée (le long de `axis`) de la face visible depuis l'avant ou l'intérieur du bureau. */
  face: number
}

const box = (size: Vec3, position: Vec3, slot: string, radius?: number): ProceduralPart => ({ shape: 'box', size, position, slot, radius })

/** Pièce exprimée dans le repère d'une station : `along` / `u` le long du support, `across` / `v` en travers. */
function piece(st: Station, along: number, height: number, across: number, u: number, y: number, slot: string, v = 0, radius?: number) {
  return st.axis === 'z'
    ? box([across, height, along], [st.at + v, y, u], slot, radius)
    : box([along, height, across], [u, y, st.at + v], slot, radius)
}

const span = (st: Station) => st.to - st.from
const mid = (st: Station) => (st.from + st.to) / 2

function legs(st: Station): ProceduralPart[] {
  const s = 0.045
  return [st.from + s / 2, st.to - s / 2].map((u) => piece(st, s, UNDER, s, u, UNDER / 2, 'legs'))
}

function sled(st: Station): ProceduralPart[] {
  const t = 0.03
  const post = UNDER - 2 * t
  return [
    piece(st, span(st), t, t, mid(st), t / 2, 'legs'),
    piece(st, span(st), t, t, mid(st), UNDER - t / 2, 'legs'),
    piece(st, t, post, t, st.from + t / 2, t + post / 2, 'legs'),
    piece(st, t, post, t, st.to - t / 2, t + post / 2, 'legs'),
  ]
}

function trestle(st: Station): ProceduralPart[] {
  const s = 0.05
  const cap = 0.05
  const u0 = st.from + 0.08
  const u1 = st.to - 0.08
  return [
    piece(st, span(st), cap, 0.06, mid(st), UNDER - cap / 2, 'legs'),
    piece(st, s, UNDER - cap, s, u0, (UNDER - cap) / 2, 'legs'),
    piece(st, s, UNDER - cap, s, u1, (UNDER - cap) / 2, 'legs'),
    piece(st, u1 - u0, 0.04, 0.04, (u0 + u1) / 2, 0.22, 'legs'),
  ]
}

function panel(st: Station): ProceduralPart[] {
  return [piece(st, span(st) + 2 * EDGE - 0.02, UNDER, 0.03, mid(st), UNDER / 2, 'legs', 0, 0.004)]
}

/** Caisson de 42 cm de large, posé contre le bord gauche, tiroirs tournés vers `face`. */
function drawers(st: Station, inward: number): ProceduralPart[] {
  const width = 0.42
  const v = inward * (width / 2 - 0.0125)
  const parts = [piece(st, span(st), UNDER, width, mid(st), UNDER / 2, 'legs', v, 0.006)]
  const gap = 0.015
  const frontH = (UNDER - 0.04 - 2 * gap) / 3
  const dir = Math.sign(st.face - mid(st)) || 1
  for (let i = 0; i < 3; i++) {
    const y = 0.02 + frontH / 2 + i * (frontH + gap)
    parts.push(piece(st, 0.012, frontH, width - 0.04, st.face + dir * 0.006, y, 'accent', v, 0.004))
  }
  return parts
}

function column(st: Station): ProceduralPart[] {
  const u = mid(st)
  const lowTop = 0.42
  return [
    piece(st, span(st), 0.04, 0.07, u, 0.02, 'legs', 0, 0.01),
    piece(st, 0.09, lowTop - 0.04, 0.075, u, 0.04 + (lowTop - 0.04) / 2, 'legs'),
    piece(st, 0.075, UNDER - 0.03 - lowTop, 0.06, u, lowTop + (UNDER - 0.03 - lowTop) / 2, 'legs'),
    piece(st, span(st) - 0.1, 0.03, 0.05, u, UNDER - 0.015, 'legs'),
  ]
}

/* ------------------------------------------------------------------ */
/* Assemblage                                                          */
/* ------------------------------------------------------------------ */

function stations(top: TopSpec, base: BaseSpec): { left: Station; right: Station; front?: Station; back: number } {
  const halfW = top.width / 2
  if (!top.corner) {
    const halfD = top.depth / 2
    const z = { from: -halfD + EDGE, to: halfD - EDGE, face: halfD - EDGE }
    return {
      left: { axis: 'z', at: -halfW + base.inset, ...z },
      right: { axis: 'z', at: halfW - base.inset, ...z },
      back: -halfD,
    }
  }
  // Plateau en L : partie principale au fond (profondeur 0,7), retour à gauche jusqu'à l'avant.
  const halfD = top.depth / 2
  const mainBack = -halfD
  const mainFront = 0
  const z = { from: mainBack + EDGE, to: mainFront - EDGE, face: mainFront - EDGE }
  return {
    left: { axis: 'z', at: -halfW + base.inset, ...z },
    right: { axis: 'z', at: halfW - base.inset, ...z },
    front: {
      axis: 'x',
      at: halfD - base.inset,
      from: -halfW + EDGE,
      to: -halfW + top.corner.width - EDGE,
      face: -halfW + top.corner.width - EDGE,
    },
    back: mainBack,
  }
}

function topParts(top: TopSpec): ProceduralPart[] {
  const y = HEIGHT - TOP_THICKNESS / 2
  if (!top.corner) return [box([top.width, TOP_THICKNESS, top.depth], [0, y, 0], 'top', 0.01)]
  const halfD = top.depth / 2
  const mainDepth = halfD
  return [
    box([top.width, TOP_THICKNESS, mainDepth], [0, y, -halfD + mainDepth / 2], 'top', 0.01),
    box([top.corner.width, TOP_THICKNESS, halfD], [-top.width / 2 + top.corner.width / 2, y, halfD / 2], 'top', 0.01),
  ]
}

function baseParts(top: TopSpec, base: BaseSpec): ProceduralPart[] {
  const st = stations(top, base)
  const all = [st.left, st.right, ...(st.front ? [st.front] : [])]
  switch (base.id) {
    case 'fins':
      return all.flatMap(legs)
    case 'luge':
      return all.flatMap(sled)
    case 'treteaux':
      return all.flatMap(trestle)
    case 'panneaux': {
      const modesty = 0.35
      const x0 = st.left.at + 0.015
      const x1 = st.right.at - 0.015
      return [
        ...all.flatMap(panel),
        box([x1 - x0, modesty, 0.018], [(x0 + x1) / 2, UNDER - modesty / 2, st.back + 0.12], 'legs'),
      ]
    }
    case 'caisson': {
      const left: Station = { ...st.left, at: -top.width / 2 + base.inset }
      return [...drawers(left, 1), ...panel(st.right), ...(st.front ? panel(st.front) : [])]
    }
    case 'assis-debout': {
      const x0 = st.left.at
      const x1 = st.right.at
      const beam = 0.05
      return [
        ...all.flatMap(column),
        box([x1 - x0, beam, beam], [(x0 + x1) / 2, UNDER - 0.03 - beam / 2, mid(st.left)], 'legs'),
        // Boîtier de commande, sous le bord avant droit.
        box([0.1, 0.022, 0.045], [st.right.at - 0.18, UNDER - 0.011, st.right.to - 0.01], 'legs', 0.006),
      ]
    }
  }
}

function materials(base: BaseSpec): MaterialSlot[] {
  const slots: MaterialSlot[] = [
    { slot: 'top', label: 'Plateau', default: base.colors.top, customizable: true },
    { slot: 'legs', label: base.id === 'caisson' ? 'Structure' : 'Piètement', default: base.colors.legs, customizable: true },
  ]
  if (base.colors.accent) slots.push({ slot: 'accent', label: 'Tiroirs', default: base.colors.accent, customizable: true })
  return slots
}

/** Identifiant historique conservé pour le bureau par défaut : les scènes existantes y font référence. */
function deskId(top: TopSpec, base: BaseSpec) {
  return top.id === 'classique' && base.id === 'fins' ? 'desk-basic' : `desk-${top.id}-${base.id}`
}

const cm = (m: number) => Math.round(m * 100)

function topSize(top: TopSpec) {
  return top.corner ? `en L ${cm(top.width)} × ${cm(top.depth)} cm` : `${cm(top.width)} × ${cm(top.depth)} cm`
}

export const deskItems: CatalogItem[] = BASES.flatMap((base) =>
  TOPS.map((top): CatalogItem => ({
    id: deskId(top, base),
    slug: deskId(top, base) === 'desk-basic' ? 'bureau-classique' : `bureau-${base.id}-${top.id}`,
    name: top.suffix ? `${base.name} ${top.suffix}` : base.name,
    category: 'desks',
    description: `Plateau ${topSize(top)}, ${base.description}.`,
    dimensions: { width: top.width, height: HEIGHT, depth: top.depth },
    defaultScale: 1,
    placement: 'floor',
    surface: { height: HEIGHT },
    materials: materials(base),
    model: { type: 'procedural', parts: [...topParts(top), ...baseParts(top, base)] },
    tags: ['bureau', 'plateau', 'table', ...base.tags, ...top.tags],
    family: { id: deskFamily.id, options: { base: base.id, top: top.id } },
  })),
)
