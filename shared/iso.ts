import type { CatalogItem, ProceduralPart } from './catalog/types'
import type { SceneData } from './types/scene'
import { resolveRoomColors } from './themes'

/**
 * Rendu isométrique 2D (SVG) à partir des boîtes des modèles procéduraux.
 * Sert pour les vignettes du catalogue et les aperçus de setups côté serveur (SSR, cartes, placeholder)
 * sans démarrer de contexte WebGL. Vue fixe : azimut 45°, comme la caméra par défaut.
 */

export interface IsoPolygon {
  points: string
  fill: string
}

export interface IsoDrawing {
  viewBox: string
  polygons: IsoPolygon[]
}

interface IsoBox {
  x0: number; x1: number
  y0: number; y1: number
  z0: number; z1: number
  color: string
  shade?: [number, number]
}

const COS30 = Math.cos(Math.PI / 6)
const PX = 100

function project(x: number, y: number, z: number): [number, number] {
  return [(x - z) * COS30 * PX, ((x + z) * 0.5 - y) * PX]
}

export function shadeHex(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1, 7), 16)
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 - amount)))).toString(16).padStart(2, '0')
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`
}

function partToBox(
  part: ProceduralPart,
  color: string,
  origin: [number, number, number] = [0, 0, 0],
  rotationDeg = 0,
  scale = 1,
): IsoBox {
  let [w, h, d] = part.size
  // Pièce tournée d'un quart de tour autour de X (membranes d'enceinte…) : hauteur et profondeur s'échangent.
  if (part.rotation && Math.abs(Math.abs(part.rotation[0]) - Math.PI / 2) < 0.01) [h, d] = [d, h]
  const quarter = ((Math.round(rotationDeg / 90) % 4) + 4) % 4
  const theta = (quarter * Math.PI) / 2
  const [px, py, pz] = part.position
  const rx = px * Math.cos(theta) + pz * Math.sin(theta)
  const rz = -px * Math.sin(theta) + pz * Math.cos(theta)
  if (quarter % 2 === 1) [w, d] = [d, w]
  const cx = origin[0] + rx * scale
  const cy = origin[1] + py * scale
  const cz = origin[2] + rz * scale
  w *= scale; h *= scale; d *= scale
  return { x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2, z0: cz - d / 2, z1: cz + d / 2, color }
}

const EPS = 1e-4
function isBehind(a: IsoBox, b: IsoBox): boolean {
  return a.x1 <= b.x0 + EPS || a.z1 <= b.z0 + EPS || a.y1 <= b.y0 + EPS
}

function sortBoxes(boxes: IsoBox[]): IsoBox[] {
  const n = boxes.length
  const before: number[][] = Array.from({ length: n }, () => [])
  const indegree = new Array<number>(n).fill(0)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue
      const a = boxes[i]!, b = boxes[j]!
      if (isBehind(a, b) && !isBehind(b, a)) {
        before[i]!.push(j)
        indegree[j]!++
      }
    }
  }
  const key = (b: IsoBox) => b.x0 + b.y0 + b.z0
  const ready = boxes.map((_, i) => i).filter((i) => indegree[i] === 0)
  const out: IsoBox[] = []
  const done = new Array<boolean>(n).fill(false)
  while (out.length < n) {
    if (!ready.length) {
      // Cycle (boîtes qui se chevauchent) : on débloque la plus « en arrière ».
      const rest = boxes.map((_, i) => i).filter((i) => !done[i])
      rest.sort((a, b) => key(boxes[a]!) - key(boxes[b]!))
      ready.push(rest[0]!)
    }
    ready.sort((a, b) => key(boxes[a]!) - key(boxes[b]!))
    const i = ready.shift()!
    if (done[i]) continue
    done[i] = true
    out.push(boxes[i]!)
    for (const j of before[i]!) {
      indegree[j]!--
      if (indegree[j] === 0 && !done[j]) ready.push(j)
    }
  }
  return out
}

function draw(boxes: IsoBox[], padding: number): IsoDrawing {
  const polygons: IsoPolygon[] = []
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  const fmt = (pts: [number, number, number][]) =>
    pts
      .map(([x, y, z]) => {
        const [sx, sy] = project(x, y, z)
        if (sx < minX) minX = sx
        if (sx > maxX) maxX = sx
        if (sy < minY) minY = sy
        if (sy > maxY) maxY = sy
        return `${sx.toFixed(1)},${sy.toFixed(1)}`
      })
      .join(' ')
  for (const b of sortBoxes(boxes)) {
    const [sz, sx] = b.shade ?? [0.12, 0.26]
    polygons.push({ points: fmt([[b.x0, b.y1, b.z0], [b.x1, b.y1, b.z0], [b.x1, b.y1, b.z1], [b.x0, b.y1, b.z1]]), fill: b.color })
    polygons.push({ points: fmt([[b.x0, b.y0, b.z1], [b.x1, b.y0, b.z1], [b.x1, b.y1, b.z1], [b.x0, b.y1, b.z1]]), fill: shadeHex(b.color, sz) })
    polygons.push({ points: fmt([[b.x1, b.y0, b.z0], [b.x1, b.y0, b.z1], [b.x1, b.y1, b.z1], [b.x1, b.y1, b.z0]]), fill: shadeHex(b.color, sx) })
  }
  if (!polygons.length) return { viewBox: '0 0 10 10', polygons }
  const vb = [minX - padding, minY - padding, maxX - minX + padding * 2, maxY - minY + padding * 2]
  return { viewBox: vb.map((v) => v.toFixed(1)).join(' '), polygons }
}

function slotColor(item: CatalogItem, slot: string, overrides?: Record<string, string>): string {
  return overrides?.[slot] ?? item.materials.find((m) => m.slot === slot)?.default ?? '#888888'
}

/** Vignette d'un objet du catalogue. */
export function catalogItemToIso(item: CatalogItem, overrides?: Record<string, string>): IsoDrawing {
  if (item.model.type !== 'procedural') return { viewBox: '0 0 10 10', polygons: [] }
  const boxes = item.model.parts.map((p) => partToBox(p, slotColor(item, p.slot, overrides)))
  const size = Math.max(item.dimensions.width, item.dimensions.height, item.dimensions.depth)
  return draw(boxes, size * 8)
}

/** Aperçu complet d'une scène (pièce + objets procéduraux). */
export function sceneToIso(scene: SceneData, catalog: ReadonlyMap<string, CatalogItem>): IsoDrawing {
  const colors = resolveRoomColors(scene.room)
  const { width: W, depth: D, height: H, walls } = scene.room
  const t = 0.08
  const boxes: IsoBox[] = [
    { x0: -W / 2, x1: W / 2, y0: -0.12, y1: 0, z0: -D / 2, z1: D / 2, color: colors.floor, shade: [0.14, 0.28] },
  ]
  if (walls) {
    boxes.push({ x0: -W / 2 - t, x1: -W / 2, y0: -0.12, y1: H, z0: -D / 2 - t, z1: D / 2, color: colors.wall, shade: [0.03, 0.08] })
    boxes.push({ x0: -W / 2, x1: W / 2, y0: -0.12, y1: H, z0: -D / 2 - t, z1: -D / 2, color: colors.wall, shade: [0.04, 0.08] })
  }
  for (const obj of scene.objects) {
    const item = catalog.get(obj.catalogId)
    if (!item || item.model.type !== 'procedural') continue
    if (!walls && item.placement === 'wall') continue
    for (const part of item.model.parts) {
      boxes.push(partToBox(part, slotColor(item, part.slot, obj.colors), obj.position, obj.rotation, obj.scale))
    }
  }
  return draw(boxes, 40)
}
