import { extname } from 'node:path'
import { readLocalFile, useBlobStore } from '../../utils/storage'

const TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.glb': 'model/gltf-binary',
  '.ktx2': 'image/ktx2',
}

/** Sert les fichiers du stockage local (repli de développement quand Vercel Blob n'est pas configuré). */
export default defineEventHandler(async (event) => {
  const pathname = getRouterParam(event, 'path') ?? ''
  if (useBlobStore() || !pathname) throw createError({ statusCode: 404 })
  try {
    const file = await readLocalFile(pathname)
    setHeader(event, 'Content-Type', TYPES[extname(pathname).toLowerCase()] ?? 'application/octet-stream')
    setHeader(event, 'Cache-Control', 'public, max-age=60')
    setHeader(event, 'Access-Control-Allow-Origin', '*')
    return file
  } catch {
    throw createError({ statusCode: 404 })
  }
})
