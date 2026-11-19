import type { CatalogFamily, CatalogItem, ProceduralPart } from '../types'

/**
 * Famille « Poster » : un cadre et un visuel peint (motif × format).
 * Le visuel est dessiné par le moteur 3D (app/engine/posterArt.ts) avec les couleurs des slots
 * `art` (fond), `accent` et `accent2` : changer une couleur repeint l'affiche.
 * Les vignettes isométriques n'ont pas de texture : quelques blocs (`isoOnly`) évoquent le motif.
 */

interface VisualSpec {
  id: string
  label: string
  name: string
  colors: { frame: string; art: string; accent: string; accent2: string }
  /** Évocation du motif dans les vignettes : rectangles en coordonnées du visuel (0..1, origine en bas à gauche). */
  hints: { rect: [number, number, number, number]; slot: 'accent' | 'accent2' }[]
  tags: string[]
}

const VISUALS: VisualSpec[] = [
  {
    id: 'bloc', label: 'Bloc', name: 'Poster bloc',
    colors: { frame: '#FBF8F3', art: '#FFCF5A', accent: '#FF6B35', accent2: '#2E2C3D' },
    hints: [{ rect: [0.27, 0.45, 0.73, 0.76], slot: 'accent' }, { rect: [0.27, 0.2, 0.6, 0.26], slot: 'accent2' }],
    tags: ['géométrique', 'minimal'],
  },
  {
    id: 'soleil', label: 'Coucher de soleil', name: 'Poster coucher de soleil',
    colors: { frame: '#FBF8F3', art: '#FBE3C8', accent: '#FF6B35', accent2: '#C8467A' },
    hints: [{ rect: [0.2, 0.42, 0.8, 0.72], slot: 'accent' }, { rect: [0, 0, 1, 0.34], slot: 'accent2' }],
    tags: ['soleil', 'sunset', 'rétro'],
  },
  {
    id: 'montagnes', label: 'Montagnes', name: 'Poster montagnes',
    colors: { frame: '#2E2C3D', art: '#DCE9E4', accent: '#7E9C8F', accent2: '#2E4A45' },
    hints: [{ rect: [0.1, 0.18, 0.55, 0.55], slot: 'accent' }, { rect: [0.4, 0, 1, 0.42], slot: 'accent2' }],
    tags: ['montagne', 'nature', 'paysage'],
  },
  {
    id: 'vagues', label: 'Vagues', name: 'Poster vagues',
    colors: { frame: '#FBF8F3', art: '#0F2A47', accent: '#24E1FF', accent2: '#F5F2EC' },
    hints: [
      { rect: [0, 0.55, 1, 0.62], slot: 'accent' },
      { rect: [0, 0.38, 1, 0.45], slot: 'accent2' },
      { rect: [0, 0.21, 1, 0.28], slot: 'accent' },
    ],
    tags: ['vague', 'océan', 'mer'],
  },
  {
    id: 'bauhaus', label: 'Bauhaus', name: 'Poster Bauhaus',
    colors: { frame: '#2E2C3D', art: '#F5F2EC', accent: '#E8553B', accent2: '#1F3A93' },
    hints: [
      { rect: [0.08, 0.52, 0.48, 0.92], slot: 'accent' },
      { rect: [0.52, 0.08, 0.92, 0.48], slot: 'accent2' },
      { rect: [0.52, 0.52, 0.92, 0.92], slot: 'accent2' },
    ],
    tags: ['bauhaus', 'géométrique', 'art'],
  },
  {
    id: 'arches', label: 'Arches', name: 'Poster arches',
    colors: { frame: '#FBF8F3', art: '#F6E3D4', accent: '#C86B4A', accent2: '#7E9C8F' },
    hints: [{ rect: [0.15, 0.2, 0.85, 0.7], slot: 'accent' }, { rect: [0.32, 0.2, 0.68, 0.5], slot: 'accent2' }],
    tags: ['arc-en-ciel', 'boho', 'arches'],
  },
]

type FormatId = 'portrait' | 'grand' | 'carre'
const FORMATS: { id: FormatId; label: string; width: number; height: number }[] = [
  { id: 'portrait', label: '50 × 70', width: 0.5, height: 0.7 },
  { id: 'grand', label: '70 × 100', width: 0.7, height: 1.0 },
  { id: 'carre', label: '50 × 50', width: 0.5, height: 0.5 },
]

export const posterFamily: CatalogFamily = {
  id: 'poster',
  name: 'Poster',
  category: 'decor',
  axes: [
    { id: 'visual', label: 'Visuel', values: VISUALS.map(({ id, label }) => ({ id, label })) },
    { id: 'format', label: 'Format', values: FORMATS.map(({ id, label }) => ({ id, label })) },
  ],
  defaults: { visual: 'bloc', format: 'portrait' },
}

const FRAME = 0.03
const FRAME_DEPTH = 0.02

function posterItem(visual: VisualSpec, format: (typeof FORMATS)[number]): CatalogItem {
  const { width: W, height: H } = format
  const artW = W - FRAME * 2
  const artH = H - FRAME * 2
  const hints: ProceduralPart[] = visual.hints.map(({ rect: [u0, v0, u1, v1], slot }) => ({
    shape: 'box',
    size: [(u1 - u0) * artW, (v1 - v0) * artH, 0.002],
    position: [-artW / 2 + ((u0 + u1) / 2) * artW, -artH / 2 + ((v0 + v1) / 2) * artH, FRAME_DEPTH + 0.0045],
    slot,
    isoOnly: true,
  }))
  // L'identifiant historique `poster` est conservé pour le visuel par défaut : des scènes y font référence.
  const isDefault = visual.id === 'bloc' && format.id === 'portrait'
  return {
    id: isDefault ? 'poster' : `poster-${visual.id}-${format.id}`,
    slug: isDefault ? 'poster' : `poster-${visual.id}-${format.id}`,
    name: format.id === 'portrait' ? visual.name : `${visual.name} ${format.id === 'carre' ? 'carré' : 'grand format'}`,
    category: 'decor',
    description: `Affiche encadrée ${Math.round(W * 100)} × ${Math.round(H * 100)} cm.`,
    dimensions: { width: W, height: H, depth: 0.03 },
    defaultScale: 1,
    placement: 'wall',
    materials: [
      { slot: 'frame', label: 'Cadre', default: visual.colors.frame, customizable: true },
      { slot: 'art', label: 'Fond', default: visual.colors.art, customizable: true },
      { slot: 'accent', label: 'Motif', default: visual.colors.accent, customizable: true },
      { slot: 'accent2', label: 'Motif 2', default: visual.colors.accent2, customizable: true },
    ],
    model: {
      type: 'procedural',
      parts: [
        { shape: 'box', size: [W, H, FRAME_DEPTH], position: [0, 0, FRAME_DEPTH / 2], slot: 'frame', radius: 0.004 },
        { shape: 'box', size: [artW, artH, 0.004], position: [0, 0, FRAME_DEPTH + 0.0015], slot: 'art', art: visual.id },
        ...hints,
      ],
    },
    tags: ['poster', 'affiche', 'cadre', ...visual.tags],
    family: { id: posterFamily.id, options: { visual: visual.id, format: format.id } },
  }
}

export const posterItems: CatalogItem[] = VISUALS.flatMap((visual) => FORMATS.map((format) => posterItem(visual, format)))
