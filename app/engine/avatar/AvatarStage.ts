import { CircleGeometry, DirectionalLight, Group, HemisphereLight, MathUtils, Mesh, MeshStandardMaterial, OrthographicCamera, Vector3 } from 'three'
import type { Avatar } from '#shared/avatar/schema'
import { SceneManager } from '../SceneManager'
import { AvatarFigure } from './AvatarFigure'

const ELEVATION = MathUtils.degToRad(14)
const VIEW_HEIGHT = 2.15
const TARGET = new Vector3(0, 0.92, 0)

/**
 * Petite scène de présentation d'un avatar (éditeur du profil) : socle, éclairage doux,
 * figurine animée. Glisser horizontalement fait tourner la figurine ; un clic la fait saluer.
 */
export class AvatarStage {
  readonly figure: AvatarFigure
  private sceneManager: SceneManager
  private camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 50)
  private turntable = new Group()
  private yaw = 0.35
  private targetYaw = 0.35
  private drag: { x: number; yaw: number; moved: boolean } | null = null
  private unsubscribers: (() => void)[] = []

  constructor(container: HTMLElement, avatar: Avatar, options: { reducedMotion?: boolean } = {}) {
    this.sceneManager = new SceneManager(container)
    const { scene } = this.sceneManager

    const hemi = new HemisphereLight('#ffffff', '#d9d1c4', 1.7)
    const sun = new DirectionalLight('#fff6ec', 2.3)
    sun.position.set(1.6, 3.2, 2.4)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.bias = -0.0005
    sun.shadow.normalBias = 0.02
    sun.shadow.radius = 4
    Object.assign(sun.shadow.camera, { left: -1.2, right: 1.2, top: 2.2, bottom: -0.4, near: 0.5, far: 8 })
    sun.shadow.camera.updateProjectionMatrix()
    scene.add(hemi, sun, sun.target)

    const floor = new Mesh(new CircleGeometry(0.62, 64), new MeshStandardMaterial({ color: '#EFE9E0', roughness: 0.9 }))
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)

    this.figure = new AvatarFigure(avatar)
    this.figure.idleMotion = !options.reducedMotion
    this.turntable.add(this.figure.root)
    this.turntable.rotation.y = this.yaw
    this.sceneManager.world.add(this.turntable)

    const dir = new Vector3(0.35 * Math.cos(ELEVATION), Math.sin(ELEVATION), Math.cos(ELEVATION)).normalize()
    this.camera.position.copy(TARGET).addScaledVector(dir, 10)
    this.camera.lookAt(TARGET)
    this.sceneManager.setCamera(this.camera)

    const canvas = this.sceneManager.canvas
    canvas.style.touchAction = 'pan-y'
    canvas.style.cursor = 'grab'
    canvas.addEventListener('pointerdown', this.onPointerDown)
    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.addEventListener('pointerup', this.onPointerUp)
    canvas.addEventListener('pointercancel', this.onPointerUp)

    this.unsubscribers.push(
      this.sceneManager.onResize((w, h) => {
        const aspect = w / Math.max(h, 1)
        this.camera.top = VIEW_HEIGHT / 2
        this.camera.bottom = -VIEW_HEIGHT / 2
        this.camera.left = (-VIEW_HEIGHT / 2) * aspect
        this.camera.right = (VIEW_HEIGHT / 2) * aspect
        this.camera.updateProjectionMatrix()
      }),
      this.sceneManager.addUpdater((dt) => {
        this.yaw += (this.targetYaw - this.yaw) * (1 - Math.exp(-dt * 10))
        this.turntable.rotation.y = this.yaw
        return this.figure.update(dt)
      }),
    )
  }

  setAvatar(avatar: Avatar) {
    this.figure.setAvatar(avatar)
    this.sceneManager.requestRender()
  }

  wave() {
    this.figure.wave()
  }

  /** Tourne la figurine (clavier : flèches gauche/droite). */
  rotateBy(rad: number) {
    this.targetYaw += rad
  }

  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    this.drag = { x: e.clientX, yaw: this.targetYaw, moved: false }
    this.sceneManager.canvas.setPointerCapture(e.pointerId)
    this.sceneManager.canvas.style.cursor = 'grabbing'
  }

  private onPointerMove = (e: PointerEvent) => {
    if (!this.drag) return
    const dx = e.clientX - this.drag.x
    if (Math.abs(dx) > 4) this.drag.moved = true
    this.targetYaw = this.drag.yaw + dx * 0.012
  }

  private onPointerUp = (e: PointerEvent) => {
    if (!this.drag) return
    if (!this.drag.moved && e.type === 'pointerup') this.figure.wave()
    this.drag = null
    this.sceneManager.canvas.style.cursor = 'grab'
  }

  dispose() {
    const canvas = this.sceneManager.canvas
    canvas.removeEventListener('pointerdown', this.onPointerDown)
    canvas.removeEventListener('pointermove', this.onPointerMove)
    canvas.removeEventListener('pointerup', this.onPointerUp)
    canvas.removeEventListener('pointercancel', this.onPointerUp)
    this.unsubscribers.forEach((u) => u())
    this.figure.dispose()
    this.sceneManager.scene.traverse((obj) => {
      const mesh = obj as Mesh
      if (mesh.isMesh) {
        mesh.geometry.dispose()
        ;(mesh.material as MeshStandardMaterial).dispose()
      }
    })
    this.sceneManager.dispose()
  }
}
