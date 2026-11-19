import { CanvasTexture, SRGBColorSpace } from 'three'

/**
 * Motifs des posters, dessinés dans un canvas aux couleurs de l'objet :
 * `bg` = slot `art` (fond), `a` = slot `accent`, `b` = slot `accent2`.
 * Les dessins sont exprimés en fraction de la largeur (`w`) et de la hauteur (`h`) : un même motif
 * s'adapte au portrait, au grand format et au carré.
 */

export interface PosterColors {
  bg: string
  a: string
  b: string
}

type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number, c: PosterColors) => void

const bloc: Painter = (ctx, w, h, c) => {
  const side = Math.min(w, h) * 0.46
  ctx.fillStyle = c.a
  roundRect(ctx, (w - side) / 2, h * 0.24, side, side, side * 0.08)
  ctx.fill()
  ctx.fillStyle = c.b
  ctx.fillRect((w - side) / 2, h * 0.74, side * 0.72, h * 0.035)
  ctx.globalAlpha = 0.45
  ctx.fillRect((w - side) / 2, h * 0.8, side * 0.48, h * 0.02)
  ctx.globalAlpha = 1
}

const soleil: Painter = (ctx, w, h, c) => {
  const horizon = h * 0.66
  const r = Math.min(w * 0.34, h * 0.3)
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, w, horizon)
  ctx.clip()
  ctx.fillStyle = c.a
  ctx.beginPath()
  ctx.arc(w / 2, horizon, r, 0, Math.PI * 2)
  ctx.fill()
  // Bandes de plus en plus épaisses vers l'horizon : soleil rétro.
  ctx.fillStyle = c.bg
  for (let i = 0; i < 5; i++) {
    const t = (i + 1) / 6
    const y = horizon - r * (1 - t) * 0.9
    ctx.fillRect(0, y, w, r * 0.025 * (i + 1))
  }
  ctx.restore()
  ctx.fillStyle = c.b
  ctx.fillRect(0, horizon, w, h - horizon)
  ctx.fillStyle = c.a
  ctx.globalAlpha = 0.35
  for (let i = 0; i < 4; i++) ctx.fillRect(w * (0.3 - i * 0.05), horizon + h * (0.05 + i * 0.07), w * (0.4 + i * 0.1), h * 0.012)
  ctx.globalAlpha = 1
}

const montagnes: Painter = (ctx, w, h, c) => {
  ctx.fillStyle = c.a
  ctx.globalAlpha = 0.55
  ctx.beginPath()
  ctx.arc(w * 0.7, h * 0.3, Math.min(w, h) * 0.11, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
  const ridge = (peaks: [number, number][], color: string) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(0, h)
    for (const [x, y] of peaks) ctx.lineTo(x * w, y * h)
    ctx.lineTo(w, h)
    ctx.closePath()
    ctx.fill()
  }
  ridge([[0, 0.7], [0.3, 0.42], [0.5, 0.6], [0.62, 0.52], [1, 0.72]], c.a)
  ridge([[0, 0.86], [0.25, 0.72], [0.55, 0.86], [0.8, 0.56], [1, 0.66]], c.b)
}

const vagues: Painter = (ctx, w, h, c) => {
  const bands = 7
  ctx.lineWidth = h * 0.028
  ctx.lineCap = 'round'
  for (let i = 0; i < bands; i++) {
    const y = h * (0.2 + (i * 0.6) / (bands - 1))
    ctx.strokeStyle = i % 2 === 0 ? c.a : c.b
    ctx.beginPath()
    for (let x = 0; x <= w; x += w / 60) {
      const yy = y + Math.sin((x / w) * Math.PI * 4 + i * 0.9) * h * 0.025
      if (x === 0) ctx.moveTo(x, yy)
      else ctx.lineTo(x, yy)
    }
    ctx.stroke()
  }
}

const bauhaus: Painter = (ctx, w, h, c) => {
  const cols = 2
  const rows = Math.max(2, Math.round((h / w) * 2))
  const cw = (w * 0.84) / cols
  const ch = (h * 0.84) / rows
  const x0 = w * 0.08
  const y0 = h * 0.08
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x = x0 + col * cw
      const y = y0 + r * ch
      const k = (r * cols + col) % 4
      const s = Math.min(cw, ch)
      ctx.fillStyle = k === 0 || k === 3 ? c.a : c.b
      ctx.beginPath()
      if (k === 0) ctx.arc(x + cw / 2, y + ch / 2, s * 0.42, 0, Math.PI * 2)
      else if (k === 1) {
        ctx.moveTo(x + cw / 2 - s * 0.42, y + ch / 2 + s * 0.42)
        ctx.arc(x + cw / 2 - s * 0.42, y + ch / 2 + s * 0.42, s * 0.84, -Math.PI / 2, 0)
      } else if (k === 2) ctx.rect(x + cw / 2 - s * 0.38, y + ch / 2 - s * 0.38, s * 0.76, s * 0.76)
      else {
        ctx.moveTo(x + cw / 2, y + ch / 2 - s * 0.42)
        ctx.lineTo(x + cw / 2 + s * 0.42, y + ch / 2 + s * 0.38)
        ctx.lineTo(x + cw / 2 - s * 0.42, y + ch / 2 + s * 0.38)
      }
      ctx.closePath()
      ctx.fill()
    }
  }
}

const arches: Painter = (ctx, w, h, c) => {
  const cx = w / 2
  const base = h * 0.8
  const outer = Math.min(w * 0.38, h * 0.36)
  const colors = [c.a, c.b, c.a, c.b]
  const step = outer / (colors.length + 0.6)
  colors.forEach((color, i) => {
    const r = outer - i * step
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(cx - r, base)
    ctx.arc(cx, base, r, Math.PI, 0)
    ctx.lineTo(cx + r - step * 0.72, base)
    ctx.arc(cx, base, r - step * 0.72, 0, Math.PI, true)
    ctx.closePath()
    ctx.fill()
  })
  ctx.fillStyle = c.b
  ctx.globalAlpha = 0.5
  ctx.beginPath()
  ctx.arc(w * 0.76, h * 0.2, Math.min(w, h) * 0.06, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
}

const PAINTERS: Record<string, Painter> = { bloc, soleil, montagnes, vagues, bauhaus, arches }

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Texture d'un motif aux proportions `aspect` (hauteur / largeur). Motif inconnu : fond uni. */
export function createPosterTexture(art: string, aspect: number, colors: PosterColors): CanvasTexture {
  const width = 512
  const height = Math.round(width * aspect)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = colors.bg
  ctx.fillRect(0, 0, width, height)
  PAINTERS[art]?.(ctx, width, height, colors)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  return texture
}
