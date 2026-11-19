/**
 * Génère les premiers modèles GLB du catalogue dans `assets/models/`.
 *   npm run models:build
 *
 * Conventions (identiques aux modèles procéduraux, voir shared/catalog/types.ts) :
 * - unités en mètres, origine au centre de la base (sol à y = 0), face avant vers +Z ;
 * - chaque matériau personnalisable porte le nom de son slot (`body`, `pot`, `leaves`…) ;
 *   un matériau sans slot garde sa couleur (terre, café…).
 * Les fichiers sont versionnés dans leur nom (`-v1`) : publier une nouvelle version = nouveau nom,
 * ce qui permet un cache CDN illimité.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { BufferGeometry } from 'three'
import { CylinderGeometry, Group, LatheGeometry, Mesh, MeshStandardMaterial, SphereGeometry, TorusGeometry, Vector2 } from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

// GLTFExporter s'appuie sur FileReader (API navigateur) pour assembler le GLB.
class NodeFileReader {
  result: ArrayBuffer | null = null
  onloadend: (() => void) | null = null
  readAsArrayBuffer(blob: Blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer
      this.onloadend?.()
    })
  }
}
;(globalThis as unknown as { FileReader: unknown }).FileReader = NodeFileReader

const OUT_DIR = join(process.cwd(), 'assets', 'models')

const material = (name: string, color: string, roughness = 0.6) => {
  const m = new MeshStandardMaterial({ color, roughness, metalness: 0 })
  m.name = name
  return m
}

const lathe = (points: [number, number][], segments = 48) => {
  const geometry = new LatheGeometry(points.map(([x, y]) => new Vector2(x, y)), segments)
  // Soude la couture du tour pour un ombrage continu (les normales sont recalculées ensuite).
  return mergeVertices(geometry.deleteAttribute('uv').deleteAttribute('normal'), 1e-5)
}

function withNormals(geometry: BufferGeometry) {
  geometry.computeVertexNormals()
  return geometry
}

/** Tasse : corps creux tourné (bord arrondi) + anse en demi-tore. Encombrement 0,106 × 0,10 × 0,085 m. */
function mug(): Group {
  const R = 0.0425
  const t = 0.0035
  const H = 0.1
  const body = lathe([
    [0, 0],
    [R - 0.004, 0],
    [R - 0.0008, 0.0012],
    [R, 0.005],
    [R, H - 0.0018],
    [R - 0.0008, H - 0.0002],
    [R - t / 2, H],
    [R - t + 0.0008, H - 0.0002],
    [R - t, H - 0.0018],
    [R - t, 0.012],
    [R - t - 0.004, 0.0085],
    [0, 0.0085],
  ])
  const group = new Group()
  group.add(new Mesh(withNormals(body), material('body', '#4CC9A0', 0.45)))

  const handle = new TorusGeometry(0.019, 0.0055, 16, 32, Math.PI)
  handle.rotateZ(-Math.PI / 2)
  handle.translate(R - 0.002, 0.052, 0)
  group.add(new Mesh(handle, material('body', '#4CC9A0', 0.45)))

  // Café : disque sans slot, couleur fixe.
  const coffee = new CylinderGeometry(R - t - 0.0002, R - t - 0.0002, 0.002, 48)
  coffee.translate(0, H - 0.016, 0)
  group.add(new Mesh(coffee, material('coffee', '#3A2318', 0.25)))
  return group
}

/** Succulente : pot conique à rebord, terre, rosette de feuilles charnues sur trois rangs. ≈ 0,11 × 0,15 × 0,11 m. */
function succulent(): Group {
  const group = new Group()
  const pot = lathe([
    [0, 0],
    [0.032, 0],
    [0.034, 0.002],
    [0.04, 0.062],
    [0.046, 0.064],
    [0.046, 0.08],
    [0.043, 0.08],
    [0.042, 0.072],
    [0, 0.072],
  ])
  group.add(new Mesh(withNormals(pot), material('pot', '#E3A587', 0.75)))

  const soil = new CylinderGeometry(0.041, 0.041, 0.004, 40)
  soil.translate(0, 0.074, 0)
  group.add(new Mesh(soil, material('soil', '#5A4232', 0.95)))

  // Feuilles : sphères étirées inclinées vers l'extérieur, réparties en spirale (angle d'or).
  const rings = [
    { count: 9, length: 0.032, width: 0.014, tilt: 1.15, radius: 0.016, y: 0.082 },
    { count: 7, length: 0.028, width: 0.013, tilt: 0.75, radius: 0.009, y: 0.088 },
    { count: 5, length: 0.022, width: 0.011, tilt: 0.35, radius: 0.004, y: 0.094 },
  ]
  const leaves: BufferGeometry[] = []
  let k = 0
  for (const ring of rings) {
    for (let i = 0; i < ring.count; i++, k++) {
      const angle = k * 2.39996
      const leaf = new SphereGeometry(1, 14, 10)
      leaf.deleteAttribute('uv')
      leaf.scale(ring.width / 2, ring.length / 2, ring.width / 3.2)
      leaf.translate(0, ring.length / 2, 0) // base de la feuille à l'origine
      leaf.rotateX(ring.tilt) // s'ouvre vers +Z
      leaf.rotateY(angle)
      leaf.translate(Math.sin(angle) * ring.radius, ring.y, Math.cos(angle) * ring.radius)
      leaves.push(leaf)
    }
  }
  const merged = mergeGeometries(leaves)
  if (!merged) throw new Error('Fusion des feuilles impossible')
  group.add(new Mesh(merged, material('leaves', '#5E8C61', 0.8)))
  return group
}

const MODELS: Record<string, () => Group> = {
  'mug-v1.glb': mug,
  'succulent-v1.glb': succulent,
}

async function exportGlb(root: Group): Promise<ArrayBuffer> {
  const exporter = new GLTFExporter()
  const result = await exporter.parseAsync(root, { binary: true })
  if (!(result instanceof ArrayBuffer)) throw new Error('Export GLB inattendu')
  return result
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  for (const [file, build] of Object.entries(MODELS)) {
    const glb = await exportGlb(build())
    await writeFile(join(OUT_DIR, file), Buffer.from(glb))
    console.log(`✓ assets/models/${file} (${(glb.byteLength / 1024).toFixed(1)} Ko)`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
