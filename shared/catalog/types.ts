export type Vec3 = [number, number, number]

export type PartShape = 'box' | 'cylinder'

/**
 * Pièce géométrique d'un modèle procédural.
 * `size` = [largeur, hauteur, profondeur] (pour un cylindre : [diamètre, hauteur, diamètre]).
 * `position` = centre de la pièce, relatif à l'origine de l'objet (centre de la base, au sol).
 * La face avant d'un objet regarde vers +Z.
 */
export interface ProceduralPart {
  shape: PartShape
  size: Vec3
  position: Vec3
  rotation?: Vec3
  slot: string
  /** Rayon d'arrondi des arêtes (boîtes uniquement). */
  radius?: number
}

/**
 * Source du modèle 3D. Remplacer un modèle procédural par un GLB ne change rien
 * à la logique de l'éditeur : seuls `model` et éventuellement `slotMaterials` évoluent.
 */
export type ModelSource =
  | { type: 'procedural'; parts: ProceduralPart[] }
  | {
      type: 'gltf'
      url: string
      /** Correspondance slot → noms de matériaux du GLB. Par défaut : matériau nommé comme le slot. */
      slotMaterials?: Record<string, string[]>
    }

export interface MaterialSlot {
  slot: string
  label: string
  default: string
  customizable: boolean
  emissive?: number
  roughness?: number
  metalness?: number
}

/** floor : posé au sol · surface : posé sur un objet support (bureau, étagère) ou au sol · wall : accroché à un mur */
export type Placement = 'floor' | 'surface' | 'wall'

export type CategorySlug =
  | 'desks'
  | 'screens'
  | 'peripherals'
  | 'seating'
  | 'computers'
  | 'audio'
  | 'lighting'
  | 'plants'
  | 'decor'
  | 'storage'

export interface CatalogCategory {
  slug: CategorySlug
  name: string
  description: string
}

export interface CatalogItem {
  id: string
  slug: string
  name: string
  category: CategorySlug
  description: string
  model: ModelSource
  thumbnailUrl?: string
  /** Dimensions en mètres (avant mise à l'échelle). */
  dimensions: { width: number; height: number; depth: number }
  defaultScale: number
  materials: MaterialSlot[]
  placement: Placement
  /** Si défini, d'autres objets « surface » peuvent être posés dessus. */
  surface?: { height: number }
  anchors?: { name: string; position: Vec3 }[]
  tags: string[]
}
