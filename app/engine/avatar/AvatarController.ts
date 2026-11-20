import { Box3, Group, Vector3 } from 'three'
import type { Avatar } from '#shared/avatar/schema'
import type { Room } from '#shared/types/scene'
import type { ObjectManager } from '../ObjectManager'
import { AvatarFigure } from './AvatarFigure'
import type { Point } from './NavGrid'
import { NavGrid } from './NavGrid'

const WALK_SPEED = 0.75
const TURN_SPEED = 5
/** Hauteur du pivot du bassin au-dessus des pieds (voir `rig.ts`), et demi-épaisseur du bassin. */
const HIPS_HEIGHT = 0.8
const PELVIS = 0.07

interface Seat {
  objectId: string
  /** Position des pieds de la figurine une fois assise (bassin au-dessus de l'assise). */
  seated: Point
  /** Hauteur du dessus de l'assise. */
  top: number
  /** Orientation de la figurine assise (vers l'avant du siège). */
  facing: number
  /** Case libre devant le siège, d'où la figurine s'assoit et se relève. */
  approach: Point
  /** Siège tourné vers un bureau : la figurine y tape au clavier. */
  atDesk: boolean
}

interface Spot {
  at: Point
  facing: number
}

type Action =
  | { kind: 'idle'; time: number }
  | { kind: 'walk'; path: Point[]; then: Action }
  | { kind: 'turn'; facing: number; then: Action }
  | { kind: 'sit'; seat: Seat; stage: 'down' | 'hold' | 'up'; time: number }
  | { kind: 'look'; time: number }
  | { kind: 'wave'; started: boolean }

export type AvatarBehavior = 'wander' | 'static'

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z)
const pick = <T>(items: T[]): T | undefined => items[Math.floor(Math.random() * items.length)]

/**
 * Fait vivre l'avatar dans la pièce : il se promène, s'assoit (et tape au clavier s'il est face à un bureau),
 * regarde les objets et salue la caméra. Les déplacements suivent une grille de navigation
 * recalculée à chaque changement de la scène.
 */
export class AvatarController {
  readonly root = new Group()
  private figure: AvatarFigure | null = null
  private grid: NavGrid | null = null
  private seats: Seat[] = []
  private spots: Spot[] = []
  private pos: Point = { x: 0, z: 0 }
  private yaw = 0
  private y = 0
  private action: Action = { kind: 'idle', time: 1 }
  private placed = false
  private appear = 1
  private leaving = false
  private lastKind: Action['kind'] | null = null

  behavior: AvatarBehavior = 'wander'
  reducedMotion = false

  constructor(
    private objects: ObjectManager,
    private getRoom: () => Room | null,
    /** Azimut de la caméra (radians) : direction vers laquelle se tourner pour saluer. */
    private getCameraYaw: () => number,
  ) {
    this.root.name = 'avatar-controller'  }

  get active() {
    return this.figure !== null
  }

  /**
   * Fait apparaître (petit « pop ») ou disparaître l'avatar. Il apparaît sur place s'il était en train
   * de disparaître, sinon à l'avant de la pièce, tourné vers la caméra.
   */
  setAvatar(avatar: Avatar | null) {
    if (!avatar) {
      if (this.figure) this.leaving = true
      return
    }
    this.leaving = false
    if (this.figure) {
      this.figure.setAvatar(avatar)
    } else {
      this.figure = new AvatarFigure(avatar)
      this.figure.idleMotion = !this.reducedMotion
      this.figure.root.scale.setScalar(this.reducedMotion ? 1 : 0.001)
      this.appear = this.reducedMotion ? 1 : 0
      this.root.add(this.figure.root)
      this.placed = false
      this.refresh()
    }
  }

  /** Échelle d'apparition/disparition (0 → 1). Retourne false une fois l'avatar retiré. */
  private animatePresence(dt: number): boolean {
    const figure = this.figure
    if (!figure) return false
    if (this.leaving) {
      this.appear = this.reducedMotion ? 0 : Math.max(0, this.appear - dt / 0.25)
      if (this.appear <= 0) {
        figure.dispose()
        this.figure = null
        this.leaving = false
        return false
      }
    } else if (this.appear < 1) {
      this.appear = Math.min(1, this.appear + dt / 0.45)
    }
    // Léger dépassement à l'arrivée (easeOutBack), puis taille normale.
    const t = this.appear
    const c = 1.7
    const scale = this.leaving ? t * t : 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2
    figure.root.scale.setScalar(Math.max(0.001, scale))
    return true
  }

  setVisible(visible: boolean) {
    this.root.visible = visible
  }

  /** Recalcule obstacles, sièges et points d'intérêt (après chaque synchronisation de la scène). */
  refresh() {
    const room = this.getRoom()
    if (!room || !this.figure) return
    const obstacles: Box3[] = []
    const desks: Box3[] = []
    const seats: Seat[] = []
    const spots: Spot[] = []
    const instances = this.objects.loadedInstances()
    const boxes = new Map<string, Box3>()

    for (const inst of instances) {
      inst.group.updateWorldMatrix(true, true)
      const box = new Box3().setFromObject(inst.group)
      if (box.isEmpty()) continue
      boxes.set(inst.id, box)
      if (inst.item.category === 'desks') desks.push(box)
      // Tapis (au ras du sol) et objets accrochés en hauteur : on passe dessous ou dessus.
      if (box.max.y < 0.06 || box.min.y > 1.0) continue
      obstacles.push(box)
    }
    const grid = new NavGrid(room, obstacles)

    for (const inst of instances) {
      const box = boxes.get(inst.id)
      if (!box) continue
      const facing = inst.group.rotation.y
      const forward = { x: Math.sin(facing), z: Math.cos(facing) }
      const seatAnchor = inst.item.anchors?.find((a) => a.name === 'seat')
      if (seatAnchor) {
        const p = inst.group.localToWorld(new Vector3(...seatAnchor.position))
        const seated = { x: p.x - forward.x * 0.06, z: p.z - forward.z * 0.06 }
        // On s'assoit depuis l'avant du siège ; s'il est glissé sous un bureau, depuis le côté, puis l'arrière.
        const side = { x: forward.z, z: -forward.x }
        const candidates = [
          { x: p.x + forward.x * 0.5, z: p.z + forward.z * 0.5 },
          { x: p.x + side.x * 0.55, z: p.z + side.z * 0.55 },
          { x: p.x - side.x * 0.55, z: p.z - side.z * 0.55 },
          { x: p.x - forward.x * 0.6, z: p.z - forward.z * 0.6 },
        ]
        let approach: Point | null = null
        for (const c of candidates) {
          const free = grid.nearestFree(c)
          if (free && dist(free, c) <= 0.3) {
            approach = free
            break
          }
        }
        if (!approach) continue
        const ahead = new Vector3(p.x + forward.x * 0.55, 0.5, p.z + forward.z * 0.55)
        const atDesk = desks.some((d) => ahead.x > d.min.x - 0.1 && ahead.x < d.max.x + 0.1 && ahead.z > d.min.z - 0.1 && ahead.z < d.max.z + 0.1)
        seats.push({ objectId: inst.id, seated, top: p.y, facing, approach, atDesk })
        continue
      }
      // Objets qu'on va regarder de près : plantes, déco, rangements, lampes, posters et néons.
      if (!['plants', 'decor', 'storage', 'lighting'].includes(inst.item.category) && inst.item.placement !== 'wall') continue
      if (box.max.y < 0.06) continue
      const center = box.getCenter(new Vector3())
      const reach = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2 + 0.4
      const target = { x: center.x + forward.x * reach, z: center.z + forward.z * reach }
      const at = grid.nearestFree(target)
      if (!at || dist(at, target) > 0.4) continue
      spots.push({ at, facing: Math.atan2(center.x - at.x, center.z - at.z) })
    }

    this.grid = grid
    this.seats = seats
    this.spots = spots

    // L'avatar assis sur un siège disparu, ou debout sur une case devenue occupée : on le replace.
    const sittingOn = this.action.kind === 'sit' ? this.action.seat : null
    const seatGone = sittingOn && !seats.some((s) => s.objectId === sittingOn.objectId)
    if (!this.placed || seatGone || (!sittingOn && !grid.isFree(this.pos))) this.place(room)
    else if (this.action.kind === 'walk') this.action = { kind: 'idle', time: 0.3 }
  }

  /** Avance le comportement. Retourne true tant que l'avatar est affiché (rendu continu). */
  update(dt: number): boolean {
    if (!this.root.visible) return false
    // Le rendu de l'image où l'avatar vient d'être retiré est nécessaire, d'où `hadFigure`.
    const hadFigure = this.figure !== null
    if (!this.animatePresence(dt)) return hadFigure
    const figure = this.figure
    if (!figure || !this.grid) return false
    figure.speed = 0
    if (this.behavior === 'static') {
      figure.sitting = false
      figure.look = 'free'
    } else {
      this.step(dt, figure)
    }
    figure.update(dt)
    figure.root.position.set(this.pos.x, this.y, this.pos.z)
    figure.root.rotation.y = this.yaw
    return true
  }

  private step(dt: number, figure: AvatarFigure) {
    const a = this.action
    switch (a.kind) {
      case 'idle':
        figure.look = 'free'
        a.time -= dt
        if (a.time <= 0) this.next()
        break

      case 'look':
        figure.look = 'free'
        a.time -= dt
        if (a.time <= 0) this.next()
        break

      case 'turn':
        figure.look = 'ahead'
        if (this.turnTowards(a.facing, dt)) this.action = a.then
        break

      case 'walk': {
        const target = a.path[0]
        if (!target) {
          this.action = a.then
          break
        }
        figure.look = 'ahead'
        const dx = target.x - this.pos.x
        const dz = target.z - this.pos.z
        const d = Math.hypot(dx, dz)
        if (d < 0.02) {
          a.path.shift()
          break
        }
        this.turnTowards(Math.atan2(dx, dz), dt)
        // Ralentit dans les virages serrés pour ne pas glisser de côté.
        const misalign = Math.abs(wrap(Math.atan2(dx, dz) - this.yaw))
        const speed = WALK_SPEED * Math.max(0.15, 1 - misalign / 1.2)
        const move = Math.min(d, speed * dt)
        this.pos.x += (dx / d) * move
        this.pos.z += (dz / d) * move
        figure.speed = speed
        break
      }

      case 'sit': {
        const { seat } = a
        figure.look = seat.atDesk && a.stage === 'hold' ? 'down' : 'free'
        if (a.stage === 'down') {
          figure.sitting = true
          figure.typing = seat.atDesk
          if (figure.sitWeight >= 1) a.stage = 'hold'
        } else if (a.stage === 'hold') {
          a.time -= dt
          if (a.time <= 0) a.stage = 'up'
        } else {
          figure.sitting = false
          figure.typing = false
          if (figure.sitWeight <= 0) {
            this.pos = { ...seat.approach }
            this.next()
            break
          }
        }
        // Glisse de la case d'approche jusqu'à l'assise en descendant le bassin.
        const k = figure.sitWeight
        const ease = k * k * (3 - 2 * k)
        this.pos = {
          x: seat.approach.x + (seat.seated.x - seat.approach.x) * ease,
          z: seat.approach.z + (seat.seated.z - seat.approach.z) * ease,
        }
        this.y = (seat.top + PELVIS - HIPS_HEIGHT) * ease
        this.turnTowards(seat.facing, dt)
        break
      }

      case 'wave':
        figure.look = 'ahead'
        if (!a.started) {
          figure.wave()
          a.started = true
        } else if (!figure.waving) this.next()
        break
    }
    if (a.kind !== 'sit') this.y = 0
  }

  /** Choisit l'action suivante (pondérée, en évitant de répéter la même deux fois de suite). */
  private next() {
    const grid = this.grid
    if (!grid) return
    const options: { weight: number; make: () => Action | null }[] = [
      { weight: this.seats.length ? 4 : 0, make: () => this.goSit() },
      { weight: this.spots.length ? 2.5 : 0, make: () => this.goLook() },
      { weight: 2, make: () => this.goWander() },
      { weight: this.lastKind === 'wave' ? 0 : 1, make: () => ({ kind: 'turn', facing: this.getCameraYaw(), then: { kind: 'wave', started: false } }) },
      { weight: 1, make: () => ({ kind: 'idle', time: 2 + Math.random() * 3 }) },
    ]
    for (let attempt = 0; attempt < 6; attempt++) {
      const total = options.reduce((s, o) => s + o.weight, 0)
      let r = Math.random() * total
      const option = options.find((o) => (r -= o.weight) < 0) ?? options[options.length - 1]!
      const action = option.make()
      if (action) {
        this.lastKind = action.kind === 'walk' ? action.then.kind : action.kind === 'turn' ? action.then.kind : action.kind
        if (this.reducedMotion && this.lastKind === 'wave') continue
        this.action = action
        return
      }
    }
    this.action = { kind: 'idle', time: 2 }
  }

  private goSit(): Action | null {
    const seat = pick(this.seats)
    if (!seat) return null
    const sit: Action = { kind: 'sit', seat, stage: 'down', time: seat.atDesk ? 10 + Math.random() * 12 : 5 + Math.random() * 6 }
    return this.walkTo(seat.approach, { kind: 'turn', facing: seat.facing, then: sit })
  }

  private goLook(): Action | null {
    const spot = pick(this.spots)
    if (!spot) return null
    return this.walkTo(spot.at, { kind: 'turn', facing: spot.facing, then: { kind: 'look', time: 2.5 + Math.random() * 3 } })
  }

  private goWander(): Action | null {
    const free = this.grid?.freePoints() ?? []
    const far = free.filter((p) => dist(p, this.pos) > 0.8)
    const target = pick(far.length ? far : free)
    return target ? this.walkTo(target, { kind: 'idle', time: 1 + Math.random() * 2 }) : null
  }

  private walkTo(target: Point, then: Action): Action | null {
    if (dist(target, this.pos) < 0.05) return then
    const path = this.grid?.findPath(this.pos, target)
    return path ? { kind: 'walk', path, then } : null
  }

  /** Tourne vers `facing` ; retourne true une fois aligné. */
  private turnTowards(facing: number, dt: number): boolean {
    const diff = wrap(facing - this.yaw)
    const stepMax = TURN_SPEED * dt
    this.yaw = wrap(this.yaw + Math.max(-stepMax, Math.min(stepMax, diff)))
    return Math.abs(diff) <= stepMax + 1e-3
  }

  /** Place l'avatar sur une case libre, de préférence à l'avant de la pièce, face à la caméra. */
  private place(room: Room) {
    const home = this.grid?.nearestFree({ x: 0, z: room.depth / 4 }) ?? { x: 0, z: 0 }
    this.pos = { ...home }
    this.y = 0
    this.yaw = this.getCameraYaw()
    this.placed = true
    if (this.figure) {
      this.figure.sitting = false
      this.figure.typing = false
    }
    this.action = { kind: 'idle', time: 1.5 }
  }

  dispose() {
    this.figure?.dispose()
    this.figure = null
    this.root.removeFromParent()
  }
}
