import type { Box3 } from 'three'
import type { Room } from '#shared/types/scene'

const CELL = 0.1
/** Rayon de la figurine : marge gardée autour des obstacles et des murs. */
const RADIUS = 0.2

export type Point = { x: number; z: number }

/**
 * Grille de déplacement au sol (cases de 10 cm) : cases libres = ni mur ni obstacle,
 * en tenant compte du rayon de la figurine. Chemins par A* (8 directions),
 * puis lissés en ne gardant que les points nécessaires (ligne de vue).
 */
export class NavGrid {
  readonly cols: number
  readonly rows: number
  private free: Uint8Array
  private x0: number
  private z0: number

  constructor(room: Room, obstacles: Box3[]) {
    this.cols = Math.max(1, Math.floor(room.width / CELL))
    this.rows = Math.max(1, Math.floor(room.depth / CELL))
    this.x0 = -room.width / 2
    this.z0 = -room.depth / 2
    this.free = new Uint8Array(this.cols * this.rows)
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const { x, z } = this.center(c, r)
        const inside = Math.abs(x) <= room.width / 2 - RADIUS && Math.abs(z) <= room.depth / 2 - RADIUS
        this.free[r * this.cols + c] = inside && !obstacles.some((b) => x > b.min.x - RADIUS && x < b.max.x + RADIUS && z > b.min.z - RADIUS && z < b.max.z + RADIUS) ? 1 : 0
      }
    }
  }

  isFree(p: Point): boolean {
    const c = this.cell(p)
    return c !== null && this.free[c.r * this.cols + c.c] === 1
  }

  /** Cases libres, en coordonnées monde (tirage d'une destination de promenade). */
  freePoints(): Point[] {
    const out: Point[] = []
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) if (this.free[r * this.cols + c]) out.push(this.center(c, r))
    return out
  }

  /** Case libre la plus proche de `p` (spirale), ou null si la pièce est pleine. */
  nearestFree(p: Point): Point | null {
    const start = this.clampCell(p)
    const maxRing = Math.max(this.cols, this.rows)
    for (let ring = 0; ring <= maxRing; ring++) {
      let best: Point | null = null
      let bestD = Infinity
      for (let dr = -ring; dr <= ring; dr++) {
        for (let dc = -ring; dc <= ring; dc++) {
          if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue
          const c = start.c + dc
          const r = start.r + dr
          if (c < 0 || r < 0 || c >= this.cols || r >= this.rows || !this.free[r * this.cols + c]) continue
          const q = this.center(c, r)
          const d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2
          if (d < bestD) [best, bestD] = [q, d]
        }
      }
      if (best) return best
    }
    return null
  }

  /** Chemin de `from` à `to` (exclus `from`), ou null si inaccessible. */
  findPath(from: Point, to: Point): Point[] | null {
    // Départ sur une case occupée (près d'un siège, objet déplacé) : on rejoint d'abord la case libre la plus proche.
    if (!this.isFree(from)) {
      const exit = this.nearestFree(from)
      if (!exit) return null
      const rest = this.findPath(exit, to)
      return rest ? [exit, ...rest] : null
    }
    const s = this.cell(from) ?? this.clampCell(from)
    const g = this.cell(to)
    if (!g || !this.free[g.r * this.cols + g.c]) return null
    const n = this.cols * this.rows
    const start = s.r * this.cols + s.c
    const goal = g.r * this.cols + g.c
    if (start === goal) return [to]

    const cost = new Float32Array(n).fill(Infinity)
    const prev = new Int32Array(n).fill(-1)
    const closed = new Uint8Array(n)
    const open: { i: number; f: number }[] = [{ i: start, f: 0 }]
    cost[start] = 0
    const h = (i: number) => Math.hypot((i % this.cols) - g.c, Math.floor(i / this.cols) - g.r)

    while (open.length) {
      // File de priorité minimale : la grille est petite (≤ 80 × 80), un tri linéaire suffit.
      let k = 0
      for (let j = 1; j < open.length; j++) if (open[j]!.f < open[k]!.f) k = j
      const { i } = open.splice(k, 1)[0]!
      if (i === goal) break
      if (closed[i]) continue
      closed[i] = 1
      const c = i % this.cols
      const r = Math.floor(i / this.cols)
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue
          const nc = c + dc
          const nr = r + dr
          if (nc < 0 || nr < 0 || nc >= this.cols || nr >= this.rows) continue
          const j = nr * this.cols + nc
          // La case de départ peut être occupée (figurine qui se lève d'une chaise) ; les autres non.
          if (!this.free[j] || closed[j]) continue
          // Pas de diagonale qui coupe le coin d'un obstacle.
          if (dr && dc && (!this.free[r * this.cols + nc] || !this.free[nr * this.cols + c])) continue
          const next = cost[i]! + (dr && dc ? Math.SQRT2 : 1)
          if (next < cost[j]!) {
            cost[j] = next
            prev[j] = i
            open.push({ i: j, f: next + h(j) })
          }
        }
      }
    }
    if (prev[goal] === -1) return null

    const cells: number[] = []
    for (let i = goal; i !== start && i !== -1; i = prev[i]!) cells.push(i)
    cells.reverse()
    const points = cells.map((i) => this.center(i % this.cols, Math.floor(i / this.cols)))
    points[points.length - 1] = to
    return this.simplify(from, points)
  }

  /** Lissage : saute les points intermédiaires tant que la ligne droite reste sur des cases libres. */
  private simplify(from: Point, points: Point[]): Point[] {
    const out: Point[] = []
    let anchor = from
    let i = 0
    while (i < points.length) {
      let j = points.length - 1
      while (j > i && !this.lineFree(anchor, points[j]!)) j--
      out.push(points[j]!)
      anchor = points[j]!
      i = j + 1
    }
    return out
  }

  private lineFree(a: Point, b: Point): boolean {
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (CELL / 2))
    for (let s = 1; s <= steps; s++) {
      const t = s / steps
      if (!this.isFree({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t })) return false
    }
    return true
  }

  private center(c: number, r: number): Point {
    return { x: this.x0 + (c + 0.5) * CELL, z: this.z0 + (r + 0.5) * CELL }
  }

  private cell(p: Point): { c: number; r: number } | null {
    const c = Math.floor((p.x - this.x0) / CELL)
    const r = Math.floor((p.z - this.z0) / CELL)
    return c < 0 || r < 0 || c >= this.cols || r >= this.rows ? null : { c, r }
  }

  private clampCell(p: Point) {
    return {
      c: Math.min(this.cols - 1, Math.max(0, Math.floor((p.x - this.x0) / CELL))),
      r: Math.min(this.rows - 1, Math.max(0, Math.floor((p.z - this.z0) / CELL))),
    }
  }
}
