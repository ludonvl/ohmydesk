import type { FloorType, Room, RoomThemeId } from './types/scene'

export interface RoomTheme {
  id: RoomThemeId
  label: string
  description: string
  swatch: string
  wall: string
  floor: string
  floorEdge: string
  /** Revêtement proposé pour une nouvelle pièce dans cette ambiance. */
  floorType: FloorType
  background: string
  grid: string
  hemiSky: string
  hemiGround: string
  hemiIntensity: number
  sun: string
  sunIntensity: number
  /** Lumière d'appoint colorée (ambiance néon). */
  accentLight?: { color: string; intensity: number }
}

export const roomThemes: Record<RoomThemeId, RoomTheme> = {
  studio: {
    id: 'studio',
    label: 'Studio',
    description: 'Lumineux, coloré, bureau blanc',
    swatch: '#FF6B35',
    wall: '#EFEBF9',
    floor: '#E7B98C',
    floorEdge: '#C4936A',
    floorType: 'parquet',
    background: '#EEEBF6',
    grid: '#16151F',
    hemiSky: '#FFFFFF',
    hemiGround: '#D8CCC2',
    hemiIntensity: 1.6,
    sun: '#FFF3E6',
    sunIntensity: 2.4,
  },
  neon: {
    id: 'neon',
    label: 'Néon',
    description: 'Gaming de nuit, accents fluo',
    swatch: '#FF4FD8',
    wall: '#2D2760',
    floor: '#3B3175',
    floorEdge: '#251F4F',
    floorType: 'moquette',
    background: '#1A1733',
    grid: '#FFFFFF',
    hemiSky: '#9C8CFF',
    hemiGround: '#1A1733',
    hemiIntensity: 1.1,
    sun: '#CDBEFF',
    sunIntensity: 1.3,
    accentLight: { color: '#FF4FD8', intensity: 3 },
  },
  scandi: {
    id: 'scandi',
    label: 'Scandi',
    description: 'Bois clair, vert sauge, calme',
    swatch: '#7E9C8F',
    wall: '#F5F2EC',
    floor: '#DCC39E',
    floorEdge: '#B89C76',
    floorType: 'chevron',
    background: '#F1ECE3',
    grid: '#16151F',
    hemiSky: '#FFFFFF',
    hemiGround: '#D9CBB4',
    hemiIntensity: 1.6,
    sun: '#FFF6EA',
    sunIntensity: 2.3,
  },
}

export function getRoomTheme(id: RoomThemeId): RoomTheme {
  return roomThemes[id] ?? roomThemes.studio
}

/** Assombrit une couleur hexadécimale (`amount` entre 0 et 1). */
export function darkenHex(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1, 7), 16)
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 - amount)))).toString(16).padStart(2, '0')
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`
}

/** Couleurs effectives de la pièce : personnalisées si définies, sinon celles de l'ambiance. */
export function resolveRoomColors(room: Pick<Room, 'theme' | 'wallColor' | 'floorColor'>) {
  const theme = getRoomTheme(room.theme)
  return {
    wall: room.wallColor ?? theme.wall,
    floor: room.floorColor ?? theme.floor,
    floorEdge: room.floorColor ? darkenHex(room.floorColor, 0.18) : theme.floorEdge,
  }
}
