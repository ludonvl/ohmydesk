import type { Camera } from 'three'
import { Clock, Color, Group, NeutralToneMapping, PCFSoftShadowMap, Scene, SRGBColorSpace, WebGLRenderer } from 'three'

/** Retourne true tant que l'updater a besoin d'un rendu continu (animation en cours). */
export type Updater = (dt: number) => boolean

/**
 * Possède le renderer, la scène et la boucle de rendu.
 * Rendu à la demande : on ne dessine que si quelque chose a changé ou si une animation tourne,
 * et rien du tout quand le canvas est hors écran (important pour les iframes embarquées).
 */
export class SceneManager {
  readonly renderer: WebGLRenderer
  readonly scene = new Scene()
  readonly world = new Group()

  private camera: Camera | null = null
  private needsRender = true
  private raf = 0
  private clock = new Clock()
  private updaters = new Set<Updater>()
  private resizeCallbacks = new Set<(w: number, h: number) => void>()
  private resizeObserver: ResizeObserver
  private visibilityObserver: IntersectionObserver
  private visible = true
  private width = 1
  private height = 1

  constructor(private container: HTMLElement) {
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.toneMapping = NeutralToneMapping
    this.renderer.toneMappingExposure = 1
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = PCFSoftShadowMap
    this.renderer.setClearColor(0x000000, 0)

    const canvas = this.renderer.domElement
    canvas.style.display = 'block'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.touchAction = 'none'
    canvas.style.outline = 'none'
    container.appendChild(canvas)

    this.scene.add(this.world)

    this.resizeObserver = new ResizeObserver(() => this.handleResize())
    this.resizeObserver.observe(container)
    this.visibilityObserver = new IntersectionObserver((entries) => {
      this.visible = entries.some((e) => e.isIntersecting)
      if (this.visible) this.requestRender()
    })
    this.visibilityObserver.observe(container)
    this.handleResize()
    this.raf = requestAnimationFrame(this.tick)
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement
  }

  get size() {
    return { width: this.width, height: this.height }
  }

  setCamera(camera: Camera) {
    this.camera = camera
    this.requestRender()
  }

  setBackground(color: string | null) {
    this.scene.background = color ? new Color(color) : null
    this.requestRender()
  }

  addUpdater(fn: Updater): () => void {
    this.updaters.add(fn)
    return () => this.updaters.delete(fn)
  }

  onResize(cb: (w: number, h: number) => void): () => void {
    this.resizeCallbacks.add(cb)
    cb(this.width, this.height)
    return () => this.resizeCallbacks.delete(cb)
  }

  requestRender() {
    this.needsRender = true
  }

  /** Rendu immédiat (captures d'écran). */
  renderNow() {
    if (this.camera) this.renderer.render(this.scene, this.camera)
  }

  private handleResize() {
    const rect = this.container.getBoundingClientRect()
    this.width = Math.max(1, Math.floor(rect.width))
    this.height = Math.max(1, Math.floor(rect.height))
    this.renderer.setSize(this.width, this.height, false)
    for (const cb of this.resizeCallbacks) cb(this.width, this.height)
    this.requestRender()
  }

  private tick = () => {
    this.raf = requestAnimationFrame(this.tick)
    const dt = Math.min(this.clock.getDelta(), 0.1)
    if (!this.visible) return
    let animating = false
    for (const update of this.updaters) {
      if (update(dt)) animating = true
    }
    if ((animating || this.needsRender) && this.camera) {
      this.needsRender = false
      this.renderer.render(this.scene, this.camera)
    }
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.resizeObserver.disconnect()
    this.visibilityObserver.disconnect()
    this.updaters.clear()
    this.resizeCallbacks.clear()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
