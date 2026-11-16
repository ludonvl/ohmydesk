import type { Material, Object3D } from 'three'
import { Group, MathUtils, Mesh, MeshStandardMaterial } from 'three'
import type { CatalogItem } from '#shared/catalog/types'
import type { Finish, SceneObject } from '#shared/types/scene'
import type { AssetManager } from './AssetManager'

const FINISH_ROUGHNESS: Record<Finish, number> = { mat: 0.9, satin: 0.55, gloss: 0.22 }

interface Instance {
  id: string
  item: CatalogItem
  group: Group
  data: SceneObject
  hash: string
  loaded: boolean
}

/** Instancie, met à jour et supprime les objets de la scène à partir des SceneObject (diff par id). */
export class ObjectManager {
  readonly root = new Group()
  private instances = new Map<string, Instance>()

  constructor(
    private assets: AssetManager,
    private catalog: ReadonlyMap<string, CatalogItem>,
    private requestRender: () => void,
  ) {
    this.root.name = 'objects'
  }

  async sync(objects: SceneObject[]): Promise<void> {
    const seen = new Set<string>()
    const pending: Promise<void>[] = []
    for (const obj of objects) {
      seen.add(obj.id)
      const hash = JSON.stringify(obj)
      const inst = this.instances.get(obj.id)
      if (!inst || inst.item.id !== obj.catalogId) {
        if (inst) this.remove(obj.id)
        pending.push(this.add(obj, hash))
      } else if (inst.hash !== hash) {
        inst.data = obj
        inst.hash = hash
        if (inst.loaded) this.apply(inst)
      }
    }
    for (const id of [...this.instances.keys()]) {
      if (!seen.has(id)) this.remove(id)
    }
    await Promise.all(pending)
    this.requestRender()
  }

  get(id: string): Instance | undefined {
    return this.instances.get(id)
  }

  getObject3D(id: string): Group | undefined {
    return this.instances.get(id)?.group
  }

  /** Remonte la hiérarchie depuis un mesh touché par un raycast jusqu'à l'objet de scène. */
  findObjectId(object: Object3D | null): string | null {
    let current: Object3D | null = object
    while (current) {
      if (typeof current.userData.objectId === 'string') return current.userData.objectId
      current = current.parent
    }
    return null
  }

  /** Meshes sur lesquels on peut poser des objets (bureaux, étagères, tapis de bureau…). */
  surfaceTargets(excludeId?: string): Object3D[] {
    const out: Object3D[] = []
    for (const inst of this.instances.values()) {
      if (inst.id !== excludeId && inst.item.surface && inst.loaded) out.push(inst.group)
    }
    return out
  }

  private async add(obj: SceneObject, hash: string): Promise<void> {
    const item = this.catalog.get(obj.catalogId)
    if (!item) {
      console.warn(`[ObjectManager] Objet de catalogue inconnu : ${obj.catalogId}`)
      return
    }
    const group = new Group()
    group.userData.objectId = obj.id
    const inst: Instance = { id: obj.id, item, group, data: obj, hash, loaded: false }
    this.instances.set(obj.id, inst)
    this.root.add(group)
    try {
      const model = await this.assets.instantiate(item)
      if (this.instances.get(obj.id) !== inst) {
        disposeMaterials(model)
        return
      }
      group.add(model)
      inst.loaded = true
      this.apply(inst)
    } catch (error) {
      console.error(`[ObjectManager] Échec du chargement de ${item.id}`, error)
    }
  }

  private apply(inst: Instance) {
    const { group, data, item } = inst
    group.position.set(...data.position)
    group.rotation.y = MathUtils.degToRad(data.rotation)
    group.scale.setScalar(data.scale * item.defaultScale)
    const roughness = FINISH_ROUGHNESS[data.finish] ?? 0.55
    group.traverse((obj) => {
      const mesh = obj as Mesh
      if (!mesh.isMesh) return
      const slot = mesh.userData.slot as string | undefined
      const material = mesh.material as MeshStandardMaterial
      if (!slot || !(material instanceof MeshStandardMaterial)) return
      const def = item.materials.find((m) => m.slot === slot)
      const color = data.colors[slot] ?? def?.default
      if (color) material.color.set(color)
      material.roughness = def?.roughness ?? roughness
      material.metalness = def?.metalness ?? 0
      if (def?.emissive) {
        material.emissive.set(color ?? '#ffffff')
        material.emissiveIntensity = def.emissive
      }
    })
    this.requestRender()
  }

  remove(id: string) {
    const inst = this.instances.get(id)
    if (!inst) return
    this.instances.delete(id)
    this.root.remove(inst.group)
    disposeMaterials(inst.group)
    this.requestRender()
  }

  clear() {
    for (const id of [...this.instances.keys()]) this.remove(id)
  }
}

/** Les géométries sont partagées (AssetManager) : on ne libère ici que les matériaux propres à l'instance. */
function disposeMaterials(root: Object3D) {
  root.traverse((obj) => {
    const mat = (obj as Mesh).material as Material | Material[] | undefined
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
    else mat?.dispose()
  })
}
