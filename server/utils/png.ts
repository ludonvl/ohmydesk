import type { H3Event } from 'h3'

const MAX_BYTES = 3 * 1024 * 1024
const MAX_SIDE = 2400
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/**
 * Lit un aperçu PNG envoyé en corps brut (`image/png`) et vérifie la signature et les dimensions
 * (en-tête IHDR), pour ne stocker que de vraies images de taille raisonnable.
 */
export async function readPngBody(event: H3Event): Promise<Buffer> {
  if (!getRequestHeader(event, 'content-type')?.startsWith('image/png')) {
    throw createError({ statusCode: 415, statusMessage: 'Aperçu attendu au format PNG' })
  }
  const declared = Number(getRequestHeader(event, 'content-length') ?? 0)
  if (declared > MAX_BYTES) throw createError({ statusCode: 413, statusMessage: 'Aperçu trop volumineux' })

  const body = await readRawBody(event, false)
  if (!body || body.length < 33) throw createError({ statusCode: 400, statusMessage: 'Aperçu vide' })
  if (body.length > MAX_BYTES) throw createError({ statusCode: 413, statusMessage: 'Aperçu trop volumineux' })
  if (!body.subarray(0, 8).equals(PNG_SIGNATURE) || body.toString('ascii', 12, 16) !== 'IHDR') {
    throw createError({ statusCode: 400, statusMessage: 'Fichier PNG invalide' })
  }
  const width = body.readUInt32BE(16)
  const height = body.readUInt32BE(20)
  if (!width || !height || width > MAX_SIDE || height > MAX_SIDE) {
    throw createError({ statusCode: 400, statusMessage: 'Dimensions de l’aperçu invalides' })
  }
  return body
}
