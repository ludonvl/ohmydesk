import type { CatalogItem } from '#shared/catalog/types'
import type { Room, SceneData } from '#shared/types/scene'
import { getRoomTheme } from '#shared/themes'
import { AssetManager } from './AssetManager'
import { CameraManager } from './CameraManager'
import { Emitter } from './Emitter'
import { EnvironmentManager } from './EnvironmentManager'
import type { Placement } from './InteractionManager'
import { InteractionManager } from './InteractionManager'
import { LightingManager } from './LightingManager'
import { ObjectManager } from './ObjectManager'
import { SelectionManager } from './SelectionManager'
import { SceneManager } from './SceneManager'

export type EngineMode = 'editor' | 'viewer' | 'embed'

export interface EngineOptions {
  mode: EngineMode
  /** Fond transparent (iframe). */
  transparent: boolean
  autoRotate: boolean
  autoRotateSpeed: number
  /** Rotation de la caméra au glisser. */
  controls: boolean
  /** Zoom molette / boutons. */
  zoom: boolean
  /** Grille d'aide au sol (éditeur). */
  grid: boolean
  /** Racine des fichiers publiés (modèles GLB) : URL du store Vercel Blob, ou `/blob` en local. */
  assetBaseUrl: string
}

export type EngineEvents = {
  ready: undefined
  select: string | null
  objectclick: string
  transformend: { id: string; position: [number, number, number]; rotation: number }
}

const DEFAULTS: EngineOptions = {
  mode: 'viewer',
  transparent: false,
  autoRotate: false,
  autoRotateSpeed: 10,
  controls: true,
  zoom: true,
  grid: false,
  assetBaseUrl: '/blob',
}

/**
 * Point d'entrée du moteur 3D, indépendant de Vue/Nuxt.
 * L'éditeur, le viewer public et le viewer embarqué utilisent exactement la même classe ;
 * seules les options changent.
 */
export class Engine {
  readonly events = new Emitter<EngineEvents>()
  readonly options: EngineOptions

  private sceneManager: SceneManager
  private cameraManager = new CameraManager()
  private lighting: LightingManager
  private env = new EnvironmentManager()
  private assets: AssetManager
  private objects: ObjectManager
  private selection: SelectionManager
  private interaction: InteractionManager
  private room: Room | null = null
  private roomKey = ''
  private disposed = false
  private unsubscribers: (() => void)[] = []

  constructor(container: HTMLElement, private catalog: ReadonlyMap<string, CatalogItem>, options: Partial<EngineOptions> = {}) {
    this.options = { ...DEFAULTS, ...options }
    this.sceneManager = new SceneManager(container)
    const render = () => this.sceneManager.requestRender()

    this.lighting = new LightingManager(this.sceneManager.scene)
    this.assets = new AssetManager(this.sceneManager.renderer, this.options.assetBaseUrl)
    this.objects = new ObjectManager(this.assets, catalog, render)
    this.selection = new SelectionManager(this.sceneManager.scene, this.objects)
    this.sceneManager.world.add(this.env.group, this.objects.root)
    this.sceneManager.setCamera(this.cameraManager.camera)

    this.interaction = new InteractionManager(
      this.sceneManager.canvas,
      {
        camera: this.cameraManager,
        objects: this.objects,
        env: this.env,
        selection: this.selection,
        catalog,
        getRoom: () => this.room,
        requestRender: render,
        onSelect: (id) => this.events.emit('select', id),
        onObjectClick: (id) => this.events.emit('objectclick', id),
        onTransformEnd: (id, position, rotation) => this.events.emit('transformend', { id, position, rotation }),
      },
      this.interactionOptions(),
    )

    this.unsubscribers.push(
      this.sceneManager.onResize((w, h) => this.cameraManager.setSize(w, h)),
      this.sceneManager.addUpdater((dt) => {
        const moved = this.cameraManager.update(dt)
        if (moved) this.env.updateWallVisibility(this.cameraManager.horizontalDirection())
        return moved
      }),
    )
    this.applyOptions()
  }

  /** Charge une scène complète (premier affichage) : pièce, objets, caméra. */
  async load(scene: SceneData): Promise<void> {
    this.applyRoom(scene.room)
    this.cameraManager.setState(scene.camera.azimuth, scene.camera.zoom)
    this.cameraManager.fit(this.env.bounds())
    this.env.updateWallVisibility(this.cameraManager.horizontalDirection())
    await this.objects.sync(scene.objects)
    if (this.disposed) return
    this.selection.refresh()
    this.sceneManager.requestRender()
    this.events.emit('ready', undefined)
  }

  /** Applique les différences d'une nouvelle version de la scène (n'affecte pas la caméra). */
  async sync(scene: SceneData): Promise<void> {
    if (JSON.stringify(scene.room) !== this.roomKey) {
      this.applyRoom(scene.room)
      this.cameraManager.fit(this.env.bounds())
      this.env.updateWallVisibility(this.cameraManager.horizontalDirection())
    }
    await this.objects.sync(scene.objects)
    if (this.disposed) return
    this.selection.refresh()
    this.sceneManager.requestRender()
  }

  select(id: string | null) {
    this.selection.select(id)
    this.sceneManager.requestRender()
  }

  setOptions(options: Partial<EngineOptions>) {
    Object.assign(this.options, options)
    this.applyOptions()
    if (this.room && 'transparent' in options) this.applyRoom(this.room, true)
  }

  rotateCamera(deg: number) {
    this.cameraManager.rotateBy(deg)
  }

  zoomBy(factor: number) {
    this.cameraManager.zoomBy(factor)
  }

  resetCamera() {
    this.cameraManager.reset()
  }

  getCameraState() {
    return this.cameraManager.getState()
  }

  /** Position de dépôt d'un objet du catalogue sous le pointeur (coordonnées client). */
  getDropPlacement(clientX: number, clientY: number, catalogId: string): { position: [number, number, number]; rotation?: number } | null {
    const item = this.catalog.get(catalogId)
    if (!item) return null
    const placement: Placement | null = this.interaction.placementAt(clientX, clientY, item)
    if (!placement) return null
    const p = placement.position
    return { position: [p.x, p.y, p.z], rotation: placement.rotation }
  }

  /** Capture PNG de la vue courante, à la taille du canvas. */
  screenshot(): string {
    this.sceneManager.renderNow()
    return this.sceneManager.canvas.toDataURL('image/png')
  }

  /**
   * Aperçu PNG à taille fixe (vignettes, images de partage), indépendant de la taille de l'écran :
   * la caméra garde son angle mais montre toute la pièce (zoom 1 par défaut), sans grille ni sélection.
   * Le rendu et la copie du canvas sont synchrones ; seul l'encodage PNG est asynchrone.
   */
  capture({ width = 1200, height = 900, zoom = 1 }: { width?: number; height?: number; zoom?: number } = {}): Promise<Blob> {
    const renderer = this.sceneManager.renderer
    const { width: w0, height: h0 } = this.sceneManager.size
    const pixelRatio = renderer.getPixelRatio()
    const selected = this.selection.selectedId
    const camera = this.cameraManager.saveState()

    this.cameraManager.setState(camera.azimuth, zoom)
    this.env.setGridVisible(false)
    this.selection.select(null)
    renderer.setPixelRatio(1)
    renderer.setSize(width, height, false)
    this.cameraManager.setSize(width, height)
    this.sceneManager.renderNow()

    const blob = new Promise<Blob>((resolve, reject) => {
      renderer.domElement.toBlob((b) => (b ? resolve(b) : reject(new Error('Capture PNG impossible'))), 'image/png')
    })

    renderer.setPixelRatio(pixelRatio)
    renderer.setSize(w0, h0, false)
    this.cameraManager.setSize(w0, h0)
    this.cameraManager.restoreState(camera)
    this.env.setGridVisible(this.options.grid)
    this.selection.select(selected)
    // Redessine tout de suite : le redimensionnement a vidé le canvas, on évite une image vide à l'écran.
    this.sceneManager.renderNow()
    return blob
  }

  private applyRoom(room: Room, force = false) {
    const key = JSON.stringify(room)
    if (!force && key === this.roomKey) return
    this.room = room
    this.roomKey = key
    const theme = getRoomTheme(room.theme)
    this.env.build(room, theme)
    this.env.setGridVisible(this.options.grid)
    this.lighting.apply(theme, room)
    this.sceneManager.setBackground(this.options.transparent ? null : theme.background)
  }

  private interactionOptions() {
    return {
      editable: this.options.mode === 'editor',
      orbit: this.options.controls,
      zoom: this.options.zoom,
    }
  }

  private applyOptions() {
    this.interaction.setOptions(this.interactionOptions())
    this.cameraManager.setOptions({ autoRotate: this.options.autoRotate, autoRotateSpeed: this.options.autoRotateSpeed })
    this.env.setGridVisible(this.options.grid)
    this.sceneManager.requestRender()
  }

  dispose() {
    this.disposed = true
    this.unsubscribers.forEach((u) => u())
    this.interaction.dispose()
    this.objects.clear()
    this.env.clear()
    this.selection.dispose()
    this.lighting.dispose()
    this.assets.dispose()
    this.events.clear()
    this.sceneManager.dispose()
  }
}
