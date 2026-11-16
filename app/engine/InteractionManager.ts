import { MathUtils, Plane, Raycaster, Vector2, Vector3 } from 'three'
import type { CatalogItem } from '#shared/catalog/types'
import type { Room } from '#shared/types/scene'
import type { CameraManager } from './CameraManager'
import type { EnvironmentManager, WallInfo } from './EnvironmentManager'
import type { ObjectManager } from './ObjectManager'
import type { SelectionManager } from './SelectionManager'

export interface InteractionOptions {
  /** Sélection et déplacement des objets (éditeur). */
  editable: boolean
  /** Rotation de la caméra par glisser sur le vide. */
  orbit: boolean
  /** Zoom à la molette. */
  zoom: boolean
}

export interface Placement {
  position: Vector3
  rotation?: number
}

interface InteractionContext {
  camera: CameraManager
  objects: ObjectManager
  env: EnvironmentManager
  selection: SelectionManager
  catalog: ReadonlyMap<string, CatalogItem>
  getRoom: () => Room | null
  requestRender: () => void
  onSelect: (id: string | null) => void
  onObjectClick: (id: string) => void
  onTransformEnd: (id: string, position: [number, number, number], rotation: number) => void
}

interface DragState {
  pointerId: number
  id: string
  item: CatalogItem
  startX: number
  startY: number
  active: boolean
  offset: Vector3
}

const SNAP = 0.05
const DRAG_THRESHOLD = 4

/** Raycasting, sélection, glisser-déposer contraint (sol / surface / mur), orbite et zoom. */
export class InteractionManager {
  private raycaster = new Raycaster()
  private ndc = new Vector2()
  private floor = new Plane(new Vector3(0, 1, 0), 0)
  private drag: DragState | null = null
  private orbit: { pointerId: number; lastX: number } | null = null
  private snapEnabled = true

  constructor(
    private dom: HTMLCanvasElement,
    private ctx: InteractionContext,
    public options: InteractionOptions,
  ) {
    dom.addEventListener('pointerdown', this.onPointerDown)
    dom.addEventListener('pointermove', this.onPointerMove)
    dom.addEventListener('pointerup', this.onPointerUp)
    dom.addEventListener('pointercancel', this.onPointerUp)
    dom.addEventListener('wheel', this.onWheel, { passive: false })
  }

  setOptions(options: Partial<InteractionOptions>) {
    Object.assign(this.options, options)
  }

  /** Position de dépôt d'un objet du catalogue sous le pointeur (drag & drop depuis le catalogue). */
  placementAt(clientX: number, clientY: number, item: CatalogItem, excludeId?: string, offset?: Vector3): Placement | null {
    this.setRay(clientX, clientY)
    const room = this.ctx.getRoom()
    if (!room) return null

    if (item.placement === 'wall') {
      const hit = this.raycaster.intersectObjects(this.ctx.env.visibleWalls(), false)[0]
      if (!hit) return null
      const info = hit.object.userData.wall as WallInfo
      const p = hit.point.clone()
      if (info.axis === 'x') {
        p.x = info.face
        p.z = this.snap(MathUtils.clamp(p.z, -room.depth / 2 + 0.1, room.depth / 2 - 0.1))
      } else {
        p.z = info.face
        p.x = this.snap(MathUtils.clamp(p.x, -room.width / 2 + 0.1, room.width / 2 - 0.1))
      }
      p.y = this.snap(MathUtils.clamp(p.y, 0.2, room.height - 0.1))
      return { position: p, rotation: MathUtils.radToDeg(Math.atan2(info.inward.x, info.inward.z)) }
    }

    if (item.placement === 'surface') {
      const hits = this.raycaster.intersectObjects(this.ctx.objects.surfaceTargets(excludeId), true)
      for (const hit of hits) {
        if (!hit.face) continue
        const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld)
        if (normal.y > 0.7) {
          const p = hit.point.clone()
          if (offset) p.add(offset)
          p.x = this.snap(p.x)
          p.z = this.snap(p.z)
          return { position: p }
        }
      }
    }

    const p = new Vector3()
    if (!this.raycaster.ray.intersectPlane(this.floor, p)) return null
    if (offset) p.add(offset)
    const margin = 0.05
    p.x = this.snap(MathUtils.clamp(p.x, -room.width / 2 + margin, room.width / 2 - margin))
    p.z = this.snap(MathUtils.clamp(p.z, -room.depth / 2 + margin, room.depth / 2 - margin))
    p.y = 0
    return { position: p }
  }

  private setRay(clientX: number, clientY: number) {
    const rect = this.dom.getBoundingClientRect()
    this.ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
    this.raycaster.setFromCamera(this.ndc, this.ctx.camera.camera)
  }

  private snap(v: number) {
    return this.snapEnabled ? Math.round(v / SNAP) * SNAP : Math.round(v * 1000) / 1000
  }

  private pick(clientX: number, clientY: number): { id: string; point: Vector3 } | null {
    this.setRay(clientX, clientY)
    const hit = this.raycaster.intersectObjects(this.ctx.objects.root.children, true)[0]
    if (!hit) return null
    const id = this.ctx.objects.findObjectId(hit.object)
    return id ? { id, point: hit.point } : null
  }

  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    this.snapEnabled = !e.altKey
    const hit = this.pick(e.clientX, e.clientY)
    if (hit) {
      this.ctx.onObjectClick(hit.id)
      if (this.options.editable) {
        this.ctx.selection.select(hit.id)
        this.ctx.onSelect(hit.id)
        const inst = this.ctx.objects.get(hit.id)
        if (inst) {
          // Décalage entre le point saisi et l'origine de l'objet, pour qu'il ne « saute » pas sous le curseur.
          const plane = new Plane(new Vector3(0, 1, 0), -inst.group.position.y)
          const onPlane = new Vector3()
          this.raycaster.ray.intersectPlane(plane, onPlane)
          const offset = inst.group.position.clone().sub(onPlane)
          offset.y = 0
          this.drag = { pointerId: e.pointerId, id: hit.id, item: inst.item, startX: e.clientX, startY: e.clientY, active: false, offset }
          this.dom.setPointerCapture(e.pointerId)
        }
        this.ctx.requestRender()
        return
      }
    } else if (this.options.editable) {
      this.ctx.selection.select(null)
      this.ctx.onSelect(null)
      this.ctx.requestRender()
    }
    if (this.options.orbit) {
      this.orbit = { pointerId: e.pointerId, lastX: e.clientX }
      this.dom.setPointerCapture(e.pointerId)
      this.dom.style.cursor = 'grabbing'
    }
  }

  private onPointerMove = (e: PointerEvent) => {
    if (this.drag && e.pointerId === this.drag.pointerId) {
      const d = this.drag
      if (!d.active && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > DRAG_THRESHOLD) {
        d.active = true
        this.dom.style.cursor = 'grabbing'
      }
      if (!d.active) return
      this.snapEnabled = !e.altKey
      const placement = this.placementAt(e.clientX, e.clientY, d.item, d.id, d.item.placement === 'wall' ? undefined : d.offset)
      const group = this.ctx.objects.getObject3D(d.id)
      if (placement && group) {
        group.position.copy(placement.position)
        if (placement.rotation !== undefined) group.rotation.y = MathUtils.degToRad(placement.rotation)
        this.ctx.selection.refresh()
        this.ctx.requestRender()
      }
      return
    }
    if (this.orbit && e.pointerId === this.orbit.pointerId) {
      const dx = e.clientX - this.orbit.lastX
      this.orbit.lastX = e.clientX
      this.ctx.camera.orbitBy(-dx * 0.35)
      this.ctx.requestRender()
      return
    }
    if (e.pointerType === 'mouse') {
      const over = this.options.editable && this.pick(e.clientX, e.clientY)
      this.dom.style.cursor = over ? 'grab' : this.options.orbit ? 'grab' : 'default'
    }
  }

  private onPointerUp = (e: PointerEvent) => {
    if (this.drag && e.pointerId === this.drag.pointerId) {
      const d = this.drag
      this.drag = null
      if (this.dom.hasPointerCapture(e.pointerId)) this.dom.releasePointerCapture(e.pointerId)
      this.dom.style.cursor = ''
      const group = this.ctx.objects.getObject3D(d.id)
      if (d.active && group) {
        const p = group.position
        const round = (v: number) => Math.round(v * 1000) / 1000
        this.ctx.onTransformEnd(d.id, [round(p.x), round(p.y), round(p.z)], Math.round(MathUtils.radToDeg(group.rotation.y)))
      }
      return
    }
    if (this.orbit && e.pointerId === this.orbit.pointerId) {
      this.orbit = null
      if (this.dom.hasPointerCapture(e.pointerId)) this.dom.releasePointerCapture(e.pointerId)
      this.dom.style.cursor = ''
    }
  }

  private onWheel = (e: WheelEvent) => {
    if (!this.options.zoom) return
    e.preventDefault()
    this.ctx.camera.zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1)
    this.ctx.requestRender()
  }

  dispose() {
    this.dom.removeEventListener('pointerdown', this.onPointerDown)
    this.dom.removeEventListener('pointermove', this.onPointerMove)
    this.dom.removeEventListener('pointerup', this.onPointerUp)
    this.dom.removeEventListener('pointercancel', this.onPointerUp)
    this.dom.removeEventListener('wheel', this.onWheel)
  }
}
