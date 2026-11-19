import type { CatalogFamily, CatalogItem, MaterialSlot, ProceduralPart, Vec3 } from '../types'

/**
 * Famille « Écran » : modèle (taille, format, courbure) × orientation × pied.
 * Seuls les écrans plats existent en portrait : les dalles incurvées restent en paysage.
 * Repère : origine au centre du pied, posé sur la surface ; face avant (dalle) vers +Z.
 * Les dalles incurvées sont découpées en segments tournés autour de Y ; les vignettes isométriques
 * les dessinent sans la rotation, ce qui donne une courbe en escalier discrète.
 */

const INK = '#2E2C3D'
const SHELL = '#F5F2EC'

type ModelId = '24' | '27' | '32' | 'ultrawide' | 'superwide'
type OrientationId = 'paysage' | 'portrait'
type StandId = 'central' | 'v' | 'bras'

interface ModelSpec {
  id: ModelId
  label: string
  name: string
  description: string
  /** Dalle visible (largeur développée × hauteur), en mètres. */
  panel: [number, number]
  /** Rayon de courbure (ex. 1,8 m pour un 1800R) ; absent = dalle plate. */
  curve?: number
  colors: { frame: string; screen: string }
  tags: string[]
}

const MODELS: ModelSpec[] = [
  {
    id: '24', label: '24"', name: 'Écran 24"', description: 'Moniteur 24 pouces, bordures fines',
    panel: [0.53, 0.3], colors: { frame: SHELL, screen: '#5AB0FF' }, tags: ['24', 'bureautique'],
  },
  {
    id: '27', label: '27"', name: 'Écran 27"', description: 'Moniteur 27 pouces',
    panel: [0.59, 0.34], colors: { frame: INK, screen: '#7C6BFF' }, tags: ['27'],
  },
  {
    id: '32', label: '32" 4K', name: 'Écran 32" 4K', description: 'Grand moniteur 32 pouces 4K',
    panel: [0.7, 0.4], colors: { frame: INK, screen: '#FF8A5C' }, tags: ['32', '4k', 'grand'],
  },
  {
    id: 'ultrawide', label: '34" incurvé', name: 'Écran 34" incurvé', description: 'Ultra-large 21:9 incurvé 1800R',
    panel: [0.8, 0.34], curve: 1.8, colors: { frame: INK, screen: '#24E1FF' }, tags: ['34', 'ultrawide', 'incurvé', 'gaming'],
  },
  {
    id: 'superwide', label: '49" super-large', name: 'Écran 49" super-large', description: 'Super ultra-large 32:9 incurvé 1000R',
    panel: [1.19, 0.34], curve: 1.0, colors: { frame: INK, screen: '#FF4FD8' }, tags: ['49', 'super ultrawide', 'incurvé', 'gaming'],
  },
]

const STANDS: { id: StandId; label: string; suffix: string; description: string; color?: string }[] = [
  { id: 'central', label: 'Pied central', suffix: '', description: 'sur pied central' },
  { id: 'v', label: 'Pied en V', suffix: 'pied en V', description: 'sur pied en V' },
  { id: 'bras', label: 'Bras', suffix: 'sur bras', description: 'sur bras articulé', color: '#C9C6C0' },
]

const ORIENTATIONS: { id: OrientationId; label: string }[] = [
  { id: 'paysage', label: 'Paysage' },
  { id: 'portrait', label: 'Portrait' },
]

export const screenFamily: CatalogFamily = {
  id: 'screen',
  name: 'Écran',
  category: 'screens',
  axes: [
    { id: 'model', label: 'Modèle', values: MODELS.map(({ id, label }) => ({ id, label })) },
    { id: 'orientation', label: 'Orientation', values: ORIENTATIONS.map(({ id, label }) => ({ id, label })) },
    { id: 'stand', label: 'Pied', values: STANDS.map(({ id, label }) => ({ id, label })) },
  ],
  defaults: { model: '27', orientation: 'paysage', stand: 'central' },
}

const BEZEL = 0.012
const FRAME_DEPTH = 0.03
/** Centre de la coque, en z (le pied est derrière, la dalle devant). */
const FRAME_Z = -0.04
/** Hauteur du bas de la dalle au-dessus de la surface. */
const LIFT = 0.12

const box = (size: Vec3, position: Vec3, slot: string, radius?: number, rotation?: Vec3): ProceduralPart => ({
  shape: 'box', size, position, slot, radius, rotation,
})
const cyl = (size: Vec3, position: Vec3, slot: string): ProceduralPart => ({ shape: 'cylinder', size, position, slot })
const r3 = (v: number) => Math.round(v * 10000) / 10000

/** Coque + dalle, plates ou incurvées (segments le long d'un arc de rayon `curve`). */
function panelParts(model: ModelSpec, centerY: number): ProceduralPart[] {
  const [pw, ph] = model.panel
  const fw = pw + BEZEL * 2
  const fh = ph + BEZEL * 2
  const screenZ = FRAME_Z + FRAME_DEPTH / 2 + 0.0015
  if (!model.curve) {
    return [
      box([fw, fh, FRAME_DEPTH], [0, centerY, FRAME_Z], 'frame', 0.008),
      box([pw, ph, 0.004], [0, centerY, screenZ], 'screen'),
    ]
  }
  const R = model.curve
  const n = Math.max(8, Math.round(fw / 0.07))
  const parts: ProceduralPart[] = []
  // Point de l'arc à l'angle `t` et à la distance `radius` du centre de courbure (devant l'écran, en z = FRAME_Z + R).
  const at = (t: number, radius: number): Vec3 => [r3(Math.sin(t) * radius), centerY, r3(FRAME_Z + R - Math.cos(t) * radius)]
  const offset = screenZ - FRAME_Z
  for (let i = 0; i < n; i++) {
    const theta = ((i - (n - 1) / 2) * (fw / n)) / R
    parts.push(box([r3((fw / n) * 1.04), fh, FRAME_DEPTH], at(theta, R), 'frame', 0.002, [0, r3(-theta), 0]))
    // La dalle couvre un arc plus court (sans les bordures), juste devant la coque.
    const ts = theta * (pw / fw)
    parts.push(box([r3((pw / n) * 1.04), ph, 0.004], at(ts, R - offset), 'screen', undefined, [0, r3(-ts), 0]))
  }
  return parts
}

function standParts(model: ModelSpec, standId: StandId, centerY: number): ProceduralPart[] {
  const [pw] = model.panel
  const back = FRAME_Z - FRAME_DEPTH / 2
  const neckTop = centerY + 0.04
  switch (standId) {
    case 'central': {
      const baseW = Math.min(0.32, Math.max(0.2, pw * 0.38))
      return [
        box([baseW, 0.015, 0.18], [0, 0.0075, -0.02], 'stand', 0.005),
        box([0.05, neckTop - 0.015, 0.03], [0, 0.015 + (neckTop - 0.015) / 2, back - 0.015], 'stand'),
      ]
    }
    case 'v': {
      const spread = Math.min(0.42, Math.max(0.26, pw * 0.42))
      const leg = spread * 0.62
      const angle = 0.62
      return [
        box([0.03, 0.014, leg], [-Math.sin(angle) * leg * 0.5, 0.007, back - 0.02 + Math.cos(angle) * leg * 0.5], 'stand', 0.004, [0, r3(-angle), 0]),
        box([0.03, 0.014, leg], [Math.sin(angle) * leg * 0.5, 0.007, back - 0.02 + Math.cos(angle) * leg * 0.5], 'stand', 0.004, [0, r3(angle), 0]),
        box([0.06, 0.02, 0.06], [0, 0.01, back - 0.02], 'stand', 0.006),
        box([0.045, neckTop - 0.02, 0.03], [0, 0.02 + (neckTop - 0.02) / 2, back - 0.02], 'stand'),
      ]
    }
    case 'bras': {
      const poleZ = back - 0.16
      const poleH = centerY + 0.12
      const armY = centerY + 0.02
      return [
        cyl([0.11, 0.012, 0.11], [0, 0.006, poleZ], 'stand'),
        cyl([0.032, poleH, 0.032], [0, poleH / 2, poleZ], 'stand'),
        box([0.035, 0.03, back - 0.01 - poleZ], [0, armY, (poleZ + back - 0.01) / 2], 'stand', 0.006),
        box([0.1, 0.1, 0.012], [0, centerY, back - 0.006], 'stand', 0.004),
      ]
    }
  }
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

function materials(model: ModelSpec, stand: (typeof STANDS)[number]): MaterialSlot[] {
  return [
    { slot: 'frame', label: 'Châssis', default: model.colors.frame, customizable: true },
    { slot: 'screen', label: "Fond d'écran", default: model.colors.screen, customizable: true, emissive: 0.9, roughness: 0.3 },
    { slot: 'stand', label: 'Pied', default: stand.color ?? model.colors.frame, customizable: true },
  ]
}

/** Identifiants publiés avant l'axe Orientation, conservés : des scènes y font référence. */
function screenId(model: ModelSpec, orientation: OrientationId, stand: StandId) {
  if (model.id === '27' && orientation === 'paysage' && stand === 'central') return { id: 'monitor-27', slug: 'ecran-27' }
  if (orientation === 'paysage') return { id: `monitor-${model.id}-${stand}`, slug: `ecran-${model.id}-${stand}` }
  if (model.id === '24') return { id: `monitor-vertical-${stand}`, slug: `ecran-vertical-${stand}` }
  return { id: `monitor-${model.id}-portrait-${stand}`, slug: `ecran-${model.id}-portrait-${stand}` }
}

export const screenItems: CatalogItem[] = MODELS.flatMap((base) =>
  ORIENTATIONS.filter((o) => o.id === 'paysage' || !base.curve).flatMap((orientation) => {
    const portrait = orientation.id === 'portrait'
    // En portrait, la dalle pivote d'un quart de tour : largeur et hauteur s'échangent.
    const model: ModelSpec = portrait ? { ...base, panel: [base.panel[1], base.panel[0]] } : base
    return STANDS.map((stand): CatalogItem => {
      const centerY = LIFT + model.panel[1] / 2 + BEZEL
      const parts = [...standParts(model, stand.id, centerY), ...panelParts(model, centerY)]
      const name = portrait ? `${model.name} vertical` : model.name
      return {
        ...screenId(model, orientation.id, stand.id),
        name: stand.suffix ? `${name} ${stand.suffix}` : name,
        category: 'screens',
        description: `${model.description}${portrait ? ', en mode portrait' : ''}, ${stand.description}.`,
        dimensions: extents(parts),
        defaultScale: 1,
        placement: 'surface',
        materials: materials(model, stand),
        model: { type: 'procedural', parts },
        tags: ['écran', 'moniteur', 'monitor', ...model.tags, ...(portrait ? ['vertical', 'portrait', 'code', 'lecture'] : [])],
        family: { id: screenFamily.id, options: { model: model.id, orientation: orientation.id, stand: stand.id } },
      }
    })
  }),
)
