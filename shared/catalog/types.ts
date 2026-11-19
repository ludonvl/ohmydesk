export type Vec3 = [number, number, number]

export type PartShape = 'box' | 'cylinder' | 'tube'

/**
 * Pièce géométrique d'un modèle procédural.
 * `size` = [largeur, hauteur, profondeur] (pour un cylindre : [diamètre, hauteur, diamètre] ;
 * pour un tube : encombrement du tracé, épaisseur comprise).
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
  /** Tube (néon) : tracé dans le plan XY, relatif à `position`. */
  tube?: {
    points: [number, number][]
    /** Rayon du tube, en mètres. */
    radius: number
    closed?: boolean
    /** Courbe lissée passant par les points (sinon segments droits, angles vifs). */
    smooth?: boolean
  }
  /**
   * Visuel peint sur la pièce (posters), identifiant d'un motif de `app/engine/posterArt.ts`.
   * Le motif est dessiné avec les couleurs des slots de l'objet, il suit donc la personnalisation.
   */
  art?: string
  /** Pièce dessinée seulement dans les vignettes isométriques (évocation d'un visuel peint). */
  isoOnly?: boolean
  /** Pièce absente des vignettes isométriques (ex. pièce tournée qu'elles ne savent pas dessiner). */
  noIso?: boolean
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
  /** Opacité (verre de vitrine) : < 1 rend le slot transparent ; absent des vignettes isométriques sous 0,5. */
  opacity?: number
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
  /**
   * Modèle GLB publié dans le stockage (Vercel Blob), chemin relatif à `assetsBaseUrl`, ex. `models/mug-v1.glb`.
   * Prioritaire sur `model`, qui reste le repli : GLB pas encore publié ou en échec, vignettes SVG (shared/iso.ts).
   * Publication : `npm run models:build` puis `npm run assets:upload`.
   */
  glb?: {
    path: string
    /** Correspondance slot → noms de matériaux du GLB. Par défaut : matériau nommé comme le slot. */
    slotMaterials?: Record<string, string[]>
  }
  thumbnailUrl?: string
  /** Dimensions en mètres (avant mise à l'échelle). */
  dimensions: { width: number; height: number; depth: number }
  defaultScale: number
  materials: MaterialSlot[]
  placement: Placement
  /** Lumière ponctuelle émise par l'objet (halo d'un néon), de la couleur du slot indiqué. */
  light?: { slot: string; intensity: number; distance: number; position: Vec3 }
  /** Si défini, d'autres objets « surface » peuvent être posés dessus. */
  surface?: { height: number }
  anchors?: { name: string; position: Vec3 }[]
  tags: string[]
  /**
   * Appartenance à une famille de variantes (voir `CatalogFamily`). Chaque variante reste un objet
   * du catalogue à part entière, avec son propre `id` : le format de scène ne change pas.
   */
  family?: { id: string; options: Record<string, string> }
}

/**
 * Famille de variantes d'un même objet (ex. bureaux : plateau × piètement).
 * Le catalogue affiche une vignette par valeur du premier axe ; l'inspecteur permet de changer chaque axe.
 */
export interface CatalogFamily {
  id: string
  name: string
  category: CategorySlug
  axes: {
    id: string
    label: string
    values: { id: string; label: string }[]
  }[]
  /** Options par défaut quand on n'a pas encore choisi (vignette du catalogue). */
  defaults: Record<string, string>
}
