import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, normalize, sep } from 'node:path'
import { del, put } from '@vercel/blob'

/**
 * Stockage des fichiers (aperçus PNG, modèles GLB, textures).
 * - Vercel Blob dès que BLOB_READ_WRITE_TOKEN est défini (production, ou en local après `vercel env pull`).
 * - Sinon, repli sur le disque dans `.data/blob`, servi par la route `/blob/**` : le développement local
 *   fonctionne sans compte Vercel.
 */

const LOCAL_ROOT = join(process.cwd(), '.data', 'blob')
const LOCAL_PREFIX = '/blob/'

export interface StoredFile {
  url: string
  pathname: string
}

export interface PutOptions {
  contentType: string
  /** Durée de cache CDN/navigateur. Les fichiers versionnés (nom unique) peuvent être mis en cache longtemps. */
  cacheControlMaxAge?: number
  /** Écrase un fichier existant au même chemin (sinon erreur côté Vercel Blob). */
  allowOverwrite?: boolean
}

export const useBlobStore = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN)

/** Résout un chemin du stockage local en refusant toute sortie du dossier racine. */
function localPath(pathname: string): string {
  const full = normalize(join(LOCAL_ROOT, pathname))
  if (!full.startsWith(LOCAL_ROOT + sep)) throw new Error(`Chemin de fichier invalide : ${pathname}`)
  return full
}

export async function putFile(pathname: string, body: Buffer | Uint8Array, options: PutOptions): Promise<StoredFile> {
  if (useBlobStore()) {
    const blob = await put(pathname, Buffer.from(body), {
      access: 'public',
      contentType: options.contentType,
      addRandomSuffix: false,
      allowOverwrite: options.allowOverwrite ?? false,
      cacheControlMaxAge: options.cacheControlMaxAge,
    })
    return { url: blob.url, pathname: blob.pathname }
  }
  const file = localPath(pathname)
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, body)
  return { url: LOCAL_PREFIX + pathname, pathname }
}

/** Supprime un fichier précédemment stocké. Ignore les URL qui ne viennent pas de ce stockage. */
export async function deleteFile(url: string | null | undefined): Promise<void> {
  if (!url) return
  try {
    if (url.startsWith(LOCAL_PREFIX)) {
      await rm(localPath(url.slice(LOCAL_PREFIX.length)), { force: true })
    } else if (useBlobStore() && new URL(url).hostname.endsWith('.blob.vercel-storage.com')) {
      await del(url)
    }
  } catch (error) {
    // Un fichier orphelin n'est pas bloquant : on journalise sans faire échouer la requête.
    console.warn('[storage] Suppression impossible', url, error)
  }
}

/** Lecture d'un fichier du stockage local (route `/blob/**`). */
export function readLocalFile(pathname: string): Promise<Buffer> {
  return readFile(localPath(pathname))
}
