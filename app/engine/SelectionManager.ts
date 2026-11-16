import type { Scene } from 'three'
import { Box3, Box3Helper, Color, LineBasicMaterial, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3 } from 'three'
import type { ObjectManager } from './ObjectManager'

/** Mise en évidence de l'objet sélectionné : boîte englobante + empreinte au sol. */
export class SelectionManager {
  selectedId: string | null = null
  private box = new Box3()
  private helper: Box3Helper
  private footprint: Mesh
  private size = new Vector3()
  private center = new Vector3()

  constructor(scene: Scene, private objects: ObjectManager, color = '#FF6B35') {
    this.helper = new Box3Helper(this.box, new Color(color))
    const lineMat = this.helper.material as LineBasicMaterial
    lineMat.depthTest = false
    lineMat.transparent = true
    lineMat.opacity = 0.95
    this.helper.renderOrder = 10
    this.helper.visible = false

    const plane = new PlaneGeometry(1, 1)
    plane.rotateX(-Math.PI / 2)
    this.footprint = new Mesh(
      plane,
      new MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false }),
    )
    this.footprint.renderOrder = 9
    this.footprint.visible = false
    scene.add(this.helper, this.footprint)
  }

  select(id: string | null) {
    this.selectedId = id
    this.refresh()
  }

  refresh() {
    const obj = this.selectedId ? this.objects.getObject3D(this.selectedId) : undefined
    if (!obj || obj.children.length === 0) {
      this.helper.visible = false
      this.footprint.visible = false
      return
    }
    obj.updateWorldMatrix(true, true)
    this.box.setFromObject(obj).expandByScalar(0.012)
    this.box.getSize(this.size)
    this.box.getCenter(this.center)
    this.helper.visible = true
    this.footprint.visible = true
    this.footprint.position.set(this.center.x, this.box.min.y + 0.006, this.center.z)
    this.footprint.scale.set(this.size.x + 0.06, 1, this.size.z + 0.06)
  }

  dispose() {
    this.helper.geometry.dispose()
    ;(this.helper.material as LineBasicMaterial).dispose()
    this.footprint.geometry.dispose()
    ;(this.footprint.material as MeshBasicMaterial).dispose()
  }
}
