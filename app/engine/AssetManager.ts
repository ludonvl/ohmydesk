import type { BufferGeometry, Material, WebGLRenderer } from 'three'
import { BoxGeometry, CatmullRomCurve3, CurvePath, CylinderGeometry, Group, LineCurve3, Mesh, MeshStandardMaterial, TubeGeometry, Vector3 } from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import type { GLTF, GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { CatalogItem, ProceduralPart } from '#shared/catalog/types'

const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'
const BASIS_TRANSCODER_PATH = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/libs/basis/'

/**
 * Construit les Object3D des objets du catalogue.
 * - Modèles procéduraux : géométries mises en cache et partagées entre instances.
 * - Modèles GLB/GLTF : chargés une fois (Draco, Meshopt, KTX2), puis clonés.
 * Chaque mesh reçoit `userData.slot` ; les matériaux sont propres à chaque instance pour pouvoir être recolorés.
 */
export class AssetManager {
  private geometries = new Map<string, BufferGeometry>()
  private gltfCache = new Map<string, Promise<GLTF>>()
  private loader: Promise<GLTFLoader> | null = null
  private failedGlb = new Set<string>()

  /** @param assetBaseUrl Racine des fichiers publiés (Vercel Blob, ou `/blob` en développement local). */
  constructor(private renderer: WebGLRenderer, private assetBaseUrl = '/blob') {}

  async instantiate(item: CatalogItem): Promise<Group> {
    if (item.glb) {
      const url = this.resolveAsset(item.glb.path)
      try {
        return await this.buildGltf(item, url, item.glb.slotMaterials)
      } catch (error) {
        // GLB absent ou invalide : on garde le modèle procédural, l'objet reste utilisable.
        if (!this.failedGlb.has(url)) console.warn(`[AssetManager] GLB indisponible pour ${item.id}, repli procédural`, error)
        this.failedGlb.add(url)
      }
    }
    if (item.model.type === 'procedural') return this.buildProcedural(item, item.model.parts)
    return this.buildGltf(item, item.model.url, item.model.slotMaterials)
  }

  private resolveAsset(path: string): string {
    if (/^https?:\/\//.test(path)) return path
    return `${this.assetBaseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
  }

  private async buildGltf(item: CatalogItem, url: string, slotMaterials?: Record<string, string[]>): Promise<Group> {
    const gltf = await this.loadGltf(url)
    const root = new Group()
    const model = gltf.scene.clone(true)
    model.traverse((obj) => {
      const mesh = obj as Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
      const source = mesh.material as Material
      const material = source.clone()
      mesh.material = material
      const name = source.name
      const slot = slotMaterials
        ? Object.entries(slotMaterials).find(([, names]) => names.includes(name))?.[0]
        : item.materials.find((m) => m.slot === name)?.slot
      if (slot) mesh.userData.slot = slot
    })
    root.add(model)
    return root
  }

  private buildProcedural(item: CatalogItem, parts: ProceduralPart[]): Group {
    const group = new Group()
    parts.forEach((part, index) => {
      if (part.isoOnly) return
      const geometry = this.getGeometry(`${item.id}:${index}`, part)
      const mesh = new Mesh(geometry, new MeshStandardMaterial({ roughness: 0.55, metalness: 0 }))
      mesh.position.set(...part.position)
      if (part.rotation) mesh.rotation.set(...part.rotation)
      mesh.userData.slot = part.slot
      if (part.art) {
        mesh.userData.art = part.art
        mesh.userData.artAspect = part.size[1] / part.size[0]
      }
      mesh.castShadow = !part.tube && Math.min(...part.size) > 0.006
      mesh.receiveShadow = true
      group.add(mesh)
    })
    return group
  }

  private getGeometry(key: string, part: ProceduralPart): BufferGeometry {
    let geometry = this.geometries.get(key)
    if (geometry) return geometry
    geometry = partGeometry(part)
    this.geometries.set(key, geometry)
    return geometry
  }

  private loadGltf(url: string): Promise<GLTF> {
    let promise = this.gltfCache.get(url)
    if (!promise) {
      promise = this.getLoader().then((loader) => loader.loadAsync(url))
      this.gltfCache.set(url, promise)
    }
    return promise
  }

  private getLoader(): Promise<GLTFLoader> {
    if (!this.loader) {
      this.loader = (async () => {
        const [{ GLTFLoader }, { DRACOLoader }, { KTX2Loader }, { MeshoptDecoder }] = await Promise.all([
          import('three/addons/loaders/GLTFLoader.js'),
          import('three/addons/loaders/DRACOLoader.js'),
          import('three/addons/loaders/KTX2Loader.js'),
          import('three/addons/libs/meshopt_decoder.module.js'),
        ])
        const loader = new GLTFLoader()
        const draco = new DRACOLoader().setDecoderPath(DRACO_DECODER_PATH)
        const ktx2 = new KTX2Loader().setTranscoderPath(BASIS_TRANSCODER_PATH).detectSupport(this.renderer)
        loader.setDRACOLoader(draco)
        loader.setKTX2Loader(ktx2)
        loader.setMeshoptDecoder(MeshoptDecoder)
        return loader
      })()
    }
    return this.loader
  }

  dispose() {
    this.geometries.forEach((g) => g.dispose())
    this.geometries.clear()
    this.gltfCache.clear()
  }
}

/** Géométrie d'une pièce procédurale (non mise en cache). */
export function partGeometry(part: ProceduralPart): BufferGeometry {
  const [w, h, d] = part.size
  if (part.tube) return tubeGeometry(part.tube)
  if (part.shape === 'cylinder') return new CylinderGeometry(w / 2, w / 2, h, 32)
  if (part.radius && part.radius > 0) {
    const radius = Math.min(part.radius, Math.min(w, h, d) / 2 - 1e-4)
    if (radius > 0) return new RoundedBoxGeometry(w, h, d, 3, radius)
  }
  return new BoxGeometry(w, h, d)
}

/** Tube le long d'un tracé 2D (plan XY) : courbe lissée, ou segments droits pour les angles vifs. */
function tubeGeometry(tube: NonNullable<ProceduralPart['tube']>): BufferGeometry {
  const points = tube.points.map(([x, y]) => new Vector3(x, y, 0))
  let curve: CatmullRomCurve3 | CurvePath<Vector3>
  if (tube.smooth) {
    curve = new CatmullRomCurve3(points, tube.closed ?? false, 'centripetal')
  } else {
    const path = new CurvePath<Vector3>()
    const loop = tube.closed ? [...points, points[0]!] : points
    for (let i = 0; i < loop.length - 1; i++) path.add(new LineCurve3(loop[i]!, loop[i + 1]!))
    curve = path
  }
  // Échantillonnage dense : les angles vifs restent nets, les courbes restent rondes.
  const segments = Math.max(32, Math.min(400, Math.round(curve.getLength() / 0.003)))
  return new TubeGeometry(curve, segments, tube.radius, 10, tube.closed ?? false)
}
