import type { Material, Vector2 } from 'three'
import {
  Box3,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Vector3,
} from 'three'
import type { Room } from '#shared/types/scene'
import type { RoomTheme } from '#shared/themes'
import { resolveRoomColors } from '#shared/themes'
import { createFloorSurface } from './floorTextures'

export const SLAB_THICKNESS = 0.12
export const WALL_THICKNESS = 0.08

export interface WallInfo {
  /** Normale intérieure (vers le centre de la pièce). */
  inward: Vector3
  /** Coordonnée de la face intérieure sur l'axe de la normale. */
  face: number
  axis: 'x' | 'z'
}

/** Sol (socle de diorama), murs, grille d'aide et ombre de contact sous la maquette. */
export class EnvironmentManager {
  readonly group = new Group()
  private walls: { mesh: Mesh; info: WallInfo }[] = []
  private grid: LineSegments | null = null
  private room: Room | null = null
  private gridVisible = false

  build(room: Room, theme: RoomTheme) {
    this.clear()
    this.room = room
    const { width: W, depth: D, height: H } = room

    const colors = resolveRoomColors(room)

    // Socle : dessus = revêtement du sol, tranches = couleur plus sombre.
    const surface = createFloorSurface(room.floorType, colors.floor, W, D)
    const top = new MeshStandardMaterial({
      color: surface.map ? '#ffffff' : colors.floor,
      map: surface.map,
      roughness: surface.roughness,
    })
    const edge = new MeshStandardMaterial({ color: colors.floorEdge, roughness: 0.9 })
    const slab = new Mesh(new BoxGeometry(W, SLAB_THICKNESS, D), [edge, edge, top, edge, edge, edge])
    slab.position.y = -SLAB_THICKNESS / 2
    slab.receiveShadow = true
    slab.userData.isFloor = true
    this.group.add(slab)

    if (room.walls) {
      const wallMat = new MeshStandardMaterial({ color: colors.wall, roughness: 0.95 })
      const t = WALL_THICKNESS
      const h = H + SLAB_THICKNESS
      const y = (H - SLAB_THICKNESS) / 2
      const defs: { size: [number, number, number]; pos: [number, number, number]; info: WallInfo }[] = [
        { size: [t, h, D + 2 * t], pos: [-W / 2 - t / 2, y, 0], info: { inward: new Vector3(1, 0, 0), face: -W / 2, axis: 'x' } },
        { size: [t, h, D + 2 * t], pos: [W / 2 + t / 2, y, 0], info: { inward: new Vector3(-1, 0, 0), face: W / 2, axis: 'x' } },
        { size: [W + 2 * t, h, t], pos: [0, y, -D / 2 - t / 2], info: { inward: new Vector3(0, 0, 1), face: -D / 2, axis: 'z' } },
        { size: [W + 2 * t, h, t], pos: [0, y, D / 2 + t / 2], info: { inward: new Vector3(0, 0, -1), face: D / 2, axis: 'z' } },
      ]
      for (const def of defs) {
        const mesh = new Mesh(new BoxGeometry(...def.size), wallMat)
        mesh.position.set(...def.pos)
        mesh.receiveShadow = true
        mesh.userData.wall = def.info
        this.group.add(mesh)
        this.walls.push({ mesh, info: def.info })
      }
    }

    this.grid = this.createGrid(W, D, theme.grid)
    this.grid.visible = this.gridVisible
    this.group.add(this.grid)

    this.group.add(this.createContactShadow(W, D))
  }

  setGridVisible(visible: boolean) {
    this.gridVisible = visible
    if (this.grid) this.grid.visible = visible
  }

  /** N'affiche que les murs du fond par rapport à la caméra, pour toujours voir l'intérieur. */
  updateWallVisibility(cameraDir: Vector2) {
    for (const { mesh, info } of this.walls) {
      mesh.visible = info.inward.x * cameraDir.x + info.inward.z * cameraDir.y > 0.02
    }
  }

  visibleWalls(): Mesh[] {
    return this.walls.filter((w) => w.mesh.visible).map((w) => w.mesh)
  }

  bounds(): Box3 {
    const r = this.room
    if (!r) return new Box3(new Vector3(-1, 0, -1), new Vector3(1, 1, 1))
    const top = r.walls ? r.height : 1.2
    return new Box3(new Vector3(-r.width / 2, -SLAB_THICKNESS, -r.depth / 2), new Vector3(r.width / 2, top, r.depth / 2))
  }

  private createGrid(W: number, D: number, color: string): LineSegments {
    const step = 0.25
    const pts: number[] = []
    for (let x = -W / 2 + step; x < W / 2 - 1e-6; x += step) pts.push(x, 0.002, -D / 2, x, 0.002, D / 2)
    for (let z = -D / 2 + step; z < D / 2 - 1e-6; z += step) pts.push(-W / 2, 0.002, z, W / 2, 0.002, z)
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(pts, 3))
    return new LineSegments(geo, new LineBasicMaterial({ color, transparent: true, opacity: 0.14, depthWrite: false }))
  }

  private createContactShadow(W: number, D: number): Mesh {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')!
    const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.18, size / 2, size / 2, size / 2)
    g.addColorStop(0, 'rgba(22,21,31,0.30)')
    g.addColorStop(1, 'rgba(22,21,31,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    const texture = new CanvasTexture(canvas)
    const mesh = new Mesh(
      new PlaneGeometry(W * 1.7, D * 1.7),
      new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
    )
    mesh.rotation.x = -Math.PI / 2
    mesh.position.y = -SLAB_THICKNESS - 0.01
    mesh.renderOrder = -1
    return mesh
  }

  clear() {
    const materials = new Set<Material>()
    this.group.traverse((obj) => {
      const mesh = obj as Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const mat = mesh.material as Material | Material[] | undefined
      if (Array.isArray(mat)) mat.forEach((m) => materials.add(m))
      else if (mat) materials.add(mat)
    })
    materials.forEach((m) => {
      const map = (m as MeshBasicMaterial).map
      map?.dispose()
      m.dispose()
    })
    this.group.clear()
    this.walls = []
    this.grid = null
  }
}
