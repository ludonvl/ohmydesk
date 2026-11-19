import type { Box3 } from 'three'
import { MathUtils, OrthographicCamera, Vector2, Vector3 } from 'three'

/** Élévation d'une vraie vue isométrique : atan(1/√2) ≈ 35,26°. */
export const ISO_ELEVATION = Math.atan(1 / Math.SQRT2)

export interface CameraOptions {
  autoRotate: boolean
  autoRotateSpeed: number
  minZoom: number
  maxZoom: number
}

/**
 * Caméra orthographique isométrique. L'élévation est fixe ; seuls l'azimut et le zoom bougent.
 * Le cadrage est calculé pour que la pièce entière tienne à n'importe quel azimut (pas de « respiration » en rotation).
 */
export class CameraManager {
  readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 200)
  readonly target = new Vector3()

  azimuth = 45
  zoom = 1
  private targetAzimuth = 45
  private targetZoom = 1
  private viewSize = 4
  private aspect = 1
  private fitBox: Box3 | null = null
  private dirty = true

  options: CameraOptions = { autoRotate: false, autoRotateSpeed: 10, minZoom: 0.5, maxZoom: 3.5 }

  constructor() {
    this.place()
  }

  setOptions(options: Partial<CameraOptions>) {
    Object.assign(this.options, options)
    this.dirty = true
  }

  setSize(width: number, height: number) {
    this.aspect = width / Math.max(height, 1)
    if (this.fitBox) this.fit(this.fitBox)
    else this.updateProjection()
  }

  setState(azimuth: number, zoom: number) {
    this.azimuth = this.targetAzimuth = azimuth
    this.zoom = this.targetZoom = MathUtils.clamp(zoom, this.options.minZoom, this.options.maxZoom)
    this.place()
    this.updateProjection()
  }

  /** État brut, animations comprises (captures d'écran, voir Engine.capture). */
  saveState() {
    return { azimuth: this.azimuth, targetAzimuth: this.targetAzimuth, zoom: this.zoom, targetZoom: this.targetZoom }
  }

  restoreState(state: ReturnType<CameraManager['saveState']>) {
    Object.assign(this, state)
    this.place()
    this.updateProjection()
  }

  getState() {
    return { azimuth: ((Math.round(this.azimuth) % 360) + 360) % 360, zoom: Math.round(this.zoom * 100) / 100 }
  }

  /** Direction horizontale cible → caméra (x, z). */
  horizontalDirection(out = new Vector2()) {
    const az = MathUtils.degToRad(this.azimuth)
    return out.set(Math.sin(az), Math.cos(az))
  }

  fit(box: Box3, padding = 1.1) {
    this.fitBox = box.clone()
    box.getCenter(this.target)
    const corners = [
      new Vector3(box.min.x, box.min.y, box.min.z), new Vector3(box.max.x, box.min.y, box.min.z),
      new Vector3(box.min.x, box.max.y, box.min.z), new Vector3(box.max.x, box.max.y, box.min.z),
      new Vector3(box.min.x, box.min.y, box.max.z), new Vector3(box.max.x, box.min.y, box.max.z),
      new Vector3(box.min.x, box.max.y, box.max.z), new Vector3(box.max.x, box.max.y, box.max.z),
    ]
    // Étendue maximale sur un tour complet, pour un cadrage stable quel que soit l'azimut.
    let needed = 0
    const saved = this.azimuth
    const v = new Vector3()
    for (let az = 0; az < 360; az += 15) {
      this.azimuth = az
      this.place()
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      for (const c of corners) {
        v.copy(c).applyMatrix4(this.camera.matrixWorldInverse)
        minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x)
        minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y)
      }
      needed = Math.max(needed, maxY - minY, (maxX - minX) / this.aspect)
    }
    this.azimuth = saved
    this.viewSize = needed * padding
    this.place()
    this.updateProjection()
  }

  rotateBy(deg: number) {
    this.targetAzimuth += deg
    this.dirty = true
  }

  orbitBy(deg: number) {
    this.azimuth += deg
    this.targetAzimuth = this.azimuth
    this.place()
  }

  zoomBy(factor: number) {
    this.targetZoom = MathUtils.clamp(this.targetZoom * factor, this.options.minZoom, this.options.maxZoom)
    this.dirty = true
  }

  reset() {
    // Revient à l'azimut isométrique le plus proche de 45° + k·360°.
    this.targetAzimuth = 45 + Math.round((this.azimuth - 45) / 360) * 360
    this.targetZoom = 1
    this.dirty = true
  }

  /** Avance les animations. Retourne true si la caméra a bougé (rendu nécessaire). */
  update(dt: number): boolean {
    let moved = this.dirty
    this.dirty = false
    if (this.options.autoRotate) {
      this.azimuth += this.options.autoRotateSpeed * dt
      this.targetAzimuth = this.azimuth
      moved = true
    } else if (Math.abs(this.targetAzimuth - this.azimuth) > 0.01) {
      this.azimuth += (this.targetAzimuth - this.azimuth) * Math.min(1, dt * 9)
      moved = true
    }
    if (Math.abs(this.targetZoom - this.zoom) > 0.0005) {
      this.zoom += (this.targetZoom - this.zoom) * Math.min(1, dt * 12)
      moved = true
    }
    if (moved) {
      this.place()
      this.updateProjection()
    }
    return moved
  }

  private place() {
    const az = MathUtils.degToRad(this.azimuth)
    const r = 40
    const h = Math.cos(ISO_ELEVATION) * r
    this.camera.position.set(
      this.target.x + h * Math.sin(az),
      this.target.y + Math.sin(ISO_ELEVATION) * r,
      this.target.z + h * Math.cos(az),
    )
    this.camera.lookAt(this.target)
    this.camera.updateMatrixWorld()
  }

  private updateProjection() {
    const halfH = this.viewSize / 2
    const halfW = halfH * this.aspect
    this.camera.left = -halfW
    this.camera.right = halfW
    this.camera.top = halfH
    this.camera.bottom = -halfH
    this.camera.zoom = this.zoom
    this.camera.updateProjectionMatrix()
  }
}
