/**
 * Publie les modèles GLB de `assets/models/` dans le stockage, sous `models/<fichier>`.
 *   npm run assets:upload
 *
 * Avec BLOB_READ_WRITE_TOKEN (dans .env) : envoi sur Vercel Blob, en production comme en local.
 * Sans : copie dans `.data/blob/models/`, servi par l'app de développement sur `/blob/models/…`.
 * Les fichiers déjà présents sont réécrits (les noms sont versionnés : `mug-v1.glb`, `mug-v2.glb`…).
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { putFile, useBlobStore } from '../server/utils/storage'

const SOURCE = join(process.cwd(), 'assets', 'models')

async function main() {
  const files = (await readdir(SOURCE)).filter((f) => f.endsWith('.glb'))
  if (!files.length) {
    console.log('Aucun GLB dans assets/models (npm run models:build)')
    return
  }
  console.log(useBlobStore() ? '→ Vercel Blob' : '→ Stockage local .data/blob (BLOB_READ_WRITE_TOKEN absent)')
  for (const file of files) {
    const stored = await putFile(`models/${file}`, await readFile(join(SOURCE, file)), {
      contentType: 'model/gltf-binary',
      allowOverwrite: true,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    })
    console.log(`✓ ${stored.url}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
