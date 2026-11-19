import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import type { FloorType } from '#shared/types/scene'

/**
 * Textures de sol générées dans un canvas à partir de la couleur choisie : pas de fichier à charger,
 * et chaque revêtement suit la couleur du sol. Chaque texture se répète sans couture (motif périodique).
 */

const SIZE = 512

interface FloorPattern {
  /** Côté réel du carreau de texture, en mètres. */
  tile: number
  roughness: number
  /** Écrit la couleur de chaque pixel (r, g, b entre 0 et 255) à partir de la couleur de base. */
  paint: (data: Uint8ClampedArray, base: [number, number, number]) => void
}

function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1, 7), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Hachage entier → [0, 1[ déterministe : le même sol est identique à chaque chargement. */
function hash(a: number, b = 0, c = 0): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35) ^ Math.imul(c + 0x27d4eb2f, 0x165667b1)
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d)
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39)
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296
}

const mod = (n: number, m: number) => ((n % m) + m) % m

function put(data: Uint8ClampedArray, x: number, y: number, base: [number, number, number], light: number) {
  const i = (y * SIZE + x) * 4
  data[i] = base[0] * light
  data[i + 1] = base[1] * light
  data[i + 2] = base[2] * light
  data[i + 3] = 255
}

/** Lames décalées : 8 rangées, 2 lames par rangée, joints sombres. */
const parquet: FloorPattern = {
  tile: 1.2,
  roughness: 0.6,
  paint(data, base) {
    const rows = 8
    const rowH = SIZE / rows
    for (let y = 0; y < SIZE; y++) {
      const row = Math.floor(y / rowH)
      const offset = hash(row, 7) * SIZE
      for (let x = 0; x < SIZE; x++) {
        const u = mod(x + offset, SIZE)
        const plank = Math.floor(u / (SIZE / 2))
        const inPlank = u % (SIZE / 2)
        const joint = y % rowH < 1.5 || inPlank < 1.5
        const tone = 0.9 + hash(row, plank) * 0.16
        const grain = 0.035 * Math.sin((y % rowH) * 0.9 + Math.sin(u * 0.03 + row) * 2.2)
        put(data, x, y, base, joint ? 0.72 : tone + grain)
      }
    }
  },
}

/** Point de Hongrie : colonnes de lames inclinées à 45°, sens alterné d'une colonne à l'autre. */
const chevron: FloorPattern = {
  tile: 0.8,
  roughness: 0.6,
  paint(data, base) {
    const colW = SIZE / 4
    const plankH = SIZE / 8
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const col = Math.floor(x / colW)
        const u = x % colW
        const dir = col % 2 === 0 ? 1 : -1
        const v = y + dir * u + (dir < 0 ? colW : 0)
        const idx = Math.floor(v / plankH)
        const inPlank = mod(v, plankH)
        const joint = inPlank < 1.5 || u < 1.5
        const tone = 0.9 + hash(col, mod(idx, SIZE / plankH)) * 0.16
        const grain = 0.03 * Math.sin(u * 0.35 + idx)
        put(data, x, y, base, joint ? 0.72 : tone + grain)
      }
    }
  },
}

/** Carreaux de 30 cm, joints clairs. */
const carrelage: FloorPattern = {
  tile: 0.6,
  roughness: 0.35,
  paint(data, base) {
    const n = 2
    const tileW = SIZE / n
    const grout = 4
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const tx = Math.floor(x / tileW)
        const ty = Math.floor(y / tileW)
        const gx = x % tileW
        const gy = y % tileW
        const joint = gx < grout / 2 || gx >= tileW - grout / 2 || gy < grout / 2 || gy >= tileW - grout / 2
        const tone = 0.95 + hash(tx, ty, 3) * 0.08 + (hash(x, y, 11) - 0.5) * 0.025
        put(data, x, y, base, joint ? 1.18 : tone)
      }
    }
  },
}

/** Valeur de bruit lissé périodique (grille de `cells` cases). */
function smoothNoise(x: number, y: number, cells: number, seed: number) {
  const fx = (x / SIZE) * cells
  const fy = (y / SIZE) * cells
  const x0 = Math.floor(fx)
  const y0 = Math.floor(fy)
  const sx = fx - x0
  const sy = fy - y0
  const ease = (t: number) => t * t * (3 - 2 * t)
  const at = (i: number, j: number) => hash(mod(i, cells), mod(j, cells), seed)
  const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * ease(sx)
  const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * ease(sx)
  return top + (bottom - top) * ease(sy)
}

/** Béton ciré : nuages doux et fines piqûres. */
const beton: FloorPattern = {
  tile: 2,
  roughness: 0.75,
  paint(data, base) {
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const clouds = smoothNoise(x, y, 4, 1) * 0.6 + smoothNoise(x, y, 16, 2) * 0.4
        const pit = hash(x, y, 5) > 0.992 ? -0.12 : 0
        put(data, x, y, base, 0.9 + clouds * 0.16 + (hash(x, y, 9) - 0.5) * 0.04 + pit)
      }
    }
  },
}

/** Moquette : grain fin et serré. */
const moquette: FloorPattern = {
  tile: 0.5,
  roughness: 1,
  paint(data, base) {
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const fiber = (hash(x, y, 13) - 0.5) * 0.14
        const tuft = smoothNoise(x, y, 64, 4) * 0.08
        put(data, x, y, base, 0.94 + fiber + tuft)
      }
    }
  },
}

const PATTERNS: Partial<Record<FloorType, FloorPattern>> = { parquet, chevron, carrelage, beton, moquette }

export interface FloorSurface {
  map: CanvasTexture | null
  roughness: number
}

/** Texture du dessus du sol, répétée pour couvrir `width` × `depth` mètres. `map` est null pour un sol uni. */
export function createFloorSurface(type: FloorType, color: string, width: number, depth: number): FloorSurface {
  const pattern = PATTERNS[type]
  if (!pattern) return { map: null, roughness: 0.85 }
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(SIZE, SIZE)
  pattern.paint(image.data, rgb(color))
  ctx.putImageData(image, 0, 0)
  const map = new CanvasTexture(canvas)
  map.colorSpace = SRGBColorSpace
  map.wrapS = map.wrapT = RepeatWrapping
  map.repeat.set(width / pattern.tile, depth / pattern.tile)
  map.anisotropy = 8
  return { map, roughness: pattern.roughness }
}
