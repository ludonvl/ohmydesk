import { deskFamily, deskItems } from './families/desks'
import { neonFamily, neonItems } from './families/neons'
import { posterFamily, posterItems } from './families/posters'
import type { CatalogCategory, CatalogFamily, CatalogItem, ProceduralPart, Vec3 } from './types'

export const catalogCategories: CatalogCategory[] = [
  { slug: 'desks', name: 'Bureaux', description: 'Plans de travail et bureaux' },
  { slug: 'screens', name: 'Écrans', description: 'Moniteurs et écrans' },
  { slug: 'peripherals', name: 'Périphériques', description: 'Claviers, souris, tapis' },
  { slug: 'seating', name: 'Sièges', description: 'Chaises et fauteuils' },
  { slug: 'computers', name: 'Ordinateurs', description: 'Tours et machines' },
  { slug: 'audio', name: 'Audio', description: 'Enceintes et casques' },
  { slug: 'lighting', name: 'Lumières', description: 'Lampes et éclairages' },
  { slug: 'plants', name: 'Plantes', description: 'Plantes vertes' },
  { slug: 'decor', name: 'Déco', description: 'Objets décoratifs, figurines, posters' },
  { slug: 'storage', name: 'Rangement', description: 'Étagères et rangements' },
]

const box = (size: Vec3, position: Vec3, slot: string, radius?: number, rotation?: Vec3): ProceduralPart => ({
  shape: 'box', size, position, slot, radius, rotation,
})
const cyl = (size: Vec3, position: Vec3, slot: string, rotation?: Vec3): ProceduralPart => ({
  shape: 'cylinder', size, position, slot, rotation,
})

const INK = '#2E2C3D'
const SHELL = '#FBF8F3'

/**
 * Catalogue : modèles procéduraux stylisés (boîtes arrondies et cylindres) en attendant les GLB définitifs.
 * Quand un GLB est publié (scripts/build-models.ts → npm run assets:upload), on ajoute `glb` à l'objet ;
 * `model` reste en place comme repli et pour les vignettes SVG.
 */
export const catalogItems: CatalogItem[] = [
  ...deskItems,
  {
    id: 'monitor-27',
    slug: 'ecran-27',
    name: 'Écran 27"',
    category: 'screens',
    description: 'Moniteur 27 pouces sur pied central.',
    dimensions: { width: 0.62, height: 0.59, depth: 0.2 },
    defaultScale: 1,
    placement: 'surface',
    materials: [
      { slot: 'frame', label: 'Châssis', default: INK, customizable: true },
      { slot: 'screen', label: "Fond d'écran", default: '#7C6BFF', customizable: true, emissive: 0.9, roughness: 0.3 },
    ],
    model: {
      type: 'procedural',
      parts: [
        box([0.24, 0.015, 0.18], [0, 0.0075, -0.02], 'frame', 0.005),
        box([0.05, 0.32, 0.03], [0, 0.175, -0.07], 'frame'),
        box([0.62, 0.37, 0.03], [0, 0.4, -0.04], 'frame', 0.008),
        box([0.59, 0.34, 0.004], [0, 0.4, -0.0235], 'screen'),
      ],
    },
    tags: ['écran', 'moniteur', 'monitor'],
  },
  {
    id: 'keyboard-75',
    slug: 'clavier-75',
    name: 'Clavier 75 %',
    category: 'peripherals',
    description: 'Clavier mécanique compact.',
    dimensions: { width: 0.32, height: 0.035, depth: 0.12 },
    defaultScale: 1,
    placement: 'surface',
    materials: [
      { slot: 'body', label: 'Boîtier', default: '#E9E5DD', customizable: true },
      { slot: 'keys', label: 'Touches', default: SHELL, customizable: true },
      { slot: 'accent', label: 'Touche accent', default: '#FF6B35', customizable: true },
    ],
    model: {
      type: 'procedural',
      parts: [
        box([0.32, 0.025, 0.12], [0, 0.0125, 0], 'body', 0.006),
        box([0.3, 0.006, 0.1], [0, 0.028, 0], 'keys'),
        box([0.035, 0.008, 0.03], [0.12, 0.032, 0.03], 'accent'),
      ],
    },
    tags: ['clavier', 'keyboard', 'mécanique'],
  },
  {
    id: 'mouse',
    slug: 'souris',
    name: 'Souris',
    category: 'peripherals',
    description: 'Souris ergonomique.',
    dimensions: { width: 0.06, height: 0.03, depth: 0.1 },
    defaultScale: 1,
    placement: 'surface',
    materials: [{ slot: 'body', label: 'Coque', default: SHELL, customizable: true }],
    model: { type: 'procedural', parts: [box([0.06, 0.03, 0.1], [0, 0.015, 0], 'body', 0.012)] },
    tags: ['souris', 'mouse'],
  },
  {
    id: 'desk-mat',
    slug: 'tapis-de-bureau',
    name: 'Tapis de bureau',
    category: 'peripherals',
    description: 'Grand tapis de souris 80 × 35 cm.',
    dimensions: { width: 0.8, height: 0.004, depth: 0.35 },
    defaultScale: 1,
    placement: 'surface',
    surface: { height: 0.004 },
    materials: [{ slot: 'mat', label: 'Tapis', default: INK, customizable: true }],
    model: { type: 'procedural', parts: [box([0.8, 0.004, 0.35], [0, 0.002, 0], 'mat')] },
    tags: ['tapis', 'desk mat'],
  },
  {
    id: 'chair-ergo',
    slug: 'chaise-ergonomique',
    name: 'Chaise ergonomique',
    category: 'seating',
    description: 'Chaise de bureau à roulettes avec accoudoirs.',
    dimensions: { width: 0.6, height: 1.15, depth: 0.6 },
    defaultScale: 1,
    placement: 'floor',
    materials: [
      { slot: 'main', label: 'Assise', default: '#FF6B35', customizable: true },
      { slot: 'frame', label: 'Structure', default: INK, customizable: true },
    ],
    model: {
      type: 'procedural',
      parts: [
        cyl([0.56, 0.04, 0.56], [0, 0.03, 0], 'frame'),
        cyl([0.05, 0.38, 0.05], [0, 0.24, 0], 'frame'),
        box([0.5, 0.08, 0.48], [0, 0.47, 0], 'main', 0.03),
        box([0.04, 0.2, 0.3], [-0.27, 0.56, -0.02], 'frame', 0.01),
        box([0.04, 0.2, 0.3], [0.27, 0.56, -0.02], 'frame', 0.01),
        box([0.48, 0.62, 0.06], [0, 0.85, -0.24], 'main', 0.025),
      ],
    },
    tags: ['chaise', 'siège', 'chair'],
  },
  {
    id: 'lamp-architect',
    slug: 'lampe-architecte',
    name: "Lampe d'archi",
    category: 'lighting',
    description: "Lampe d'architecte à bras articulé.",
    dimensions: { width: 0.14, height: 0.46, depth: 0.27 },
    defaultScale: 1,
    placement: 'surface',
    materials: [
      { slot: 'shade', label: 'Abat-jour', default: '#FFCF5A', customizable: true },
      { slot: 'frame', label: 'Bras', default: INK, customizable: true },
      { slot: 'bulb', label: 'Ampoule', default: '#FFF4D6', customizable: false, emissive: 1.4 },
    ],
    model: {
      type: 'procedural',
      parts: [
        cyl([0.14, 0.025, 0.14], [0, 0.0125, 0], 'frame'),
        box([0.018, 0.42, 0.018], [0, 0.235, 0], 'frame'),
        box([0.018, 0.018, 0.22], [0, 0.44, 0.1], 'frame'),
        cyl([0.13, 0.08, 0.13], [0, 0.42, 0.2], 'shade'),
        cyl([0.08, 0.01, 0.08], [0, 0.375, 0.2], 'bulb'),
      ],
    },
    tags: ['lampe', 'lumière', 'lamp'],
  },
  ...neonItems,
  {
    id: 'plant-monstera',
    slug: 'monstera',
    name: 'Monstera',
    category: 'plants',
    description: 'Grande plante verte en pot.',
    dimensions: { width: 0.5, height: 0.92, depth: 0.5 },
    defaultScale: 1,
    placement: 'floor',
    materials: [
      { slot: 'pot', label: 'Pot', default: SHELL, customizable: true },
      { slot: 'leaves', label: 'Feuillage', default: '#3FAE7A', customizable: true, roughness: 0.8 },
      { slot: 'leaves2', label: 'Feuillage clair', default: '#5CC992', customizable: true, roughness: 0.8 },
    ],
    model: {
      type: 'procedural',
      parts: [
        cyl([0.32, 0.34, 0.32], [0, 0.17, 0], 'pot'),
        box([0.5, 0.34, 0.5], [0, 0.5, 0], 'leaves', 0.08),
        box([0.32, 0.28, 0.32], [0.04, 0.78, -0.02], 'leaves2', 0.07),
      ],
    },
    tags: ['plante', 'monstera', 'vert'],
  },
  {
    id: 'plant-succulent',
    slug: 'succulente',
    name: 'Succulente',
    category: 'plants',
    description: 'Petite plante grasse pour le bureau.',
    dimensions: { width: 0.11, height: 0.16, depth: 0.11 },
    defaultScale: 1,
    placement: 'surface',
    materials: [
      { slot: 'pot', label: 'Pot', default: '#E3A587', customizable: true },
      { slot: 'leaves', label: 'Feuillage', default: '#5E8C61', customizable: true, roughness: 0.8 },
    ],
    glb: { path: 'models/succulent-v1.glb' },
    model: {
      type: 'procedural',
      parts: [
        cyl([0.09, 0.08, 0.09], [0, 0.04, 0], 'pot'),
        box([0.11, 0.08, 0.11], [0, 0.12, 0], 'leaves', 0.03),
      ],
    },
    tags: ['plante', 'succulente', 'cactus'],
  },
  {
    id: 'pc-tower',
    slug: 'tour-pc',
    name: 'Tour PC',
    category: 'computers',
    description: 'Boîtier moyen tour avec panneau lumineux.',
    dimensions: { width: 0.22, height: 0.46, depth: 0.44 },
    defaultScale: 1,
    placement: 'floor',
    materials: [
      { slot: 'case', label: 'Boîtier', default: INK, customizable: true },
      { slot: 'glow', label: 'Éclairage', default: '#5EE6B5', customizable: true, emissive: 1.1 },
    ],
    model: {
      type: 'procedural',
      parts: [
        box([0.22, 0.46, 0.44], [0, 0.23, 0], 'case', 0.01),
        box([0.004, 0.34, 0.32], [0.111, 0.25, 0], 'glow'),
      ],
    },
    tags: ['pc', 'ordinateur', 'tour', 'gaming'],
  },
  {
    id: 'mug',
    slug: 'tasse',
    name: 'Tasse',
    category: 'decor',
    description: 'Tasse en grès.',
    dimensions: { width: 0.11, height: 0.1, depth: 0.085 },
    defaultScale: 1,
    placement: 'surface',
    materials: [{ slot: 'body', label: 'Tasse', default: '#4CC9A0', customizable: true }],
    glb: { path: 'models/mug-v1.glb' },
    model: {
      type: 'procedural',
      parts: [
        cyl([0.085, 0.1, 0.085], [0, 0.05, 0], 'body'),
        box([0.02, 0.06, 0.015], [0.052, 0.05, 0], 'body', 0.005),
      ],
    },
    tags: ['tasse', 'café', 'mug'],
  },
  {
    id: 'speaker',
    slug: 'enceinte',
    name: 'Enceinte',
    category: 'audio',
    description: 'Enceinte de bureau compacte.',
    dimensions: { width: 0.14, height: 0.24, depth: 0.15 },
    defaultScale: 1,
    placement: 'surface',
    materials: [
      { slot: 'body', label: 'Caisson', default: SHELL, customizable: true },
      { slot: 'cone', label: 'Membrane', default: INK, customizable: true },
    ],
    model: {
      type: 'procedural',
      parts: [
        box([0.14, 0.24, 0.15], [0, 0.12, 0], 'body', 0.01),
        cyl([0.09, 0.006, 0.09], [0, 0.09, 0.076], 'cone', [Math.PI / 2, 0, 0]),
        cyl([0.035, 0.006, 0.035], [0, 0.18, 0.076], 'cone', [Math.PI / 2, 0, 0]),
      ],
    },
    tags: ['enceinte', 'audio', 'speaker'],
  },
  {
    id: 'shelf-wall',
    slug: 'etagere-murale',
    name: 'Étagère murale',
    category: 'storage',
    description: 'Planche murale avec quelques livres.',
    dimensions: { width: 0.9, height: 0.26, depth: 0.22 },
    defaultScale: 1,
    placement: 'wall',
    surface: { height: 0.015 },
    materials: [
      { slot: 'wood', label: 'Planche', default: SHELL, customizable: true },
      { slot: 'book1', label: 'Livre 1', default: '#FF6B35', customizable: true },
      { slot: 'book2', label: 'Livre 2', default: '#A497FF', customizable: true },
      { slot: 'book3', label: 'Livre 3', default: '#4CC9A0', customizable: true },
    ],
    model: {
      type: 'procedural',
      parts: [
        box([0.9, 0.03, 0.22], [0, 0, 0.11], 'wood', 0.005),
        box([0.04, 0.22, 0.16], [-0.35, 0.125, 0.1], 'book1'),
        box([0.035, 0.19, 0.16], [-0.305, 0.11, 0.1], 'book2'),
        box([0.05, 0.24, 0.16], [-0.26, 0.135, 0.1], 'book3'),
        box([0.035, 0.2, 0.16], [-0.215, 0.115, 0.1], 'book1'),
      ],
    },
    tags: ['étagère', 'livres', 'rangement'],
  },
  ...posterItems,
  {
    id: 'rug',
    slug: 'tapis',
    name: 'Tapis',
    category: 'decor',
    description: 'Tapis 160 × 120 cm.',
    dimensions: { width: 1.6, height: 0.012, depth: 1.2 },
    defaultScale: 1,
    placement: 'floor',
    materials: [{ slot: 'main', label: 'Tapis', default: '#A497FF', customizable: true, roughness: 0.95 }],
    model: { type: 'procedural', parts: [box([1.6, 0.012, 1.2], [0, 0.006, 0], 'main', 0.004)] },
    tags: ['tapis', 'rug'],
  },
  {
    id: 'mascot-cubi',
    slug: 'mascotte-cubi',
    name: 'Mascotte Cubi',
    category: 'decor',
    description: 'Petite figurine cubique, à poser partout.',
    dimensions: { width: 0.08, height: 0.08, depth: 0.08 },
    defaultScale: 1,
    placement: 'surface',
    materials: [
      { slot: 'body', label: 'Corps', default: '#A497FF', customizable: true },
      { slot: 'eyes', label: 'Yeux', default: '#16151F', customizable: true },
    ],
    model: {
      type: 'procedural',
      parts: [
        box([0.08, 0.08, 0.08], [0, 0.04, 0], 'body', 0.015),
        box([0.012, 0.016, 0.004], [-0.018, 0.05, 0.0405], 'eyes'),
        box([0.012, 0.016, 0.004], [0.018, 0.05, 0.0405], 'eyes'),
      ],
    },
    tags: ['figurine', 'mascotte', 'déco'],
  },
]

export const catalogById: ReadonlyMap<string, CatalogItem> = new Map(catalogItems.map((item) => [item.id, item]))

export function getCatalogItem(id: string): CatalogItem | undefined {
  return catalogById.get(id)
}

export const catalogFamilies: CatalogFamily[] = [deskFamily, neonFamily, posterFamily]
const familyById: ReadonlyMap<string, CatalogFamily> = new Map(catalogFamilies.map((f) => [f.id, f]))

export function getFamily(id: string | undefined): CatalogFamily | undefined {
  return id ? familyById.get(id) : undefined
}

export function getFamilyItems(familyId: string): CatalogItem[] {
  return catalogItems.filter((item) => item.family?.id === familyId)
}

/**
 * Variante d'une famille correspondant le mieux à `options` : correspondance exacte si elle existe,
 * sinon celle qui partage le plus d'options, en privilégiant les axes listés en premier dans `options`.
 */
export function findFamilyVariant(familyId: string, options: Record<string, string>): CatalogItem | undefined {
  const keys = Object.keys(options)
  let best: CatalogItem | undefined
  let bestScore = -1
  for (const item of getFamilyItems(familyId)) {
    const score = keys.reduce((n, key, i) => n + (item.family!.options[key] === options[key] ? 2 ** (keys.length - i) : 0), 0)
    if (score > bestScore) [best, bestScore] = [item, score]
  }
  return best
}

export function getCategoryName(slug: string): string {
  return catalogCategories.find((c) => c.slug === slug)?.name ?? slug
}
