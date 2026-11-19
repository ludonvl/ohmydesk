/** Couleurs proposées pour personnaliser un objet (inspecteur et barre contextuelle). */
export const OBJECT_PALETTE = [
  { hex: '#FF6B35', name: 'Orange brûlé' },
  { hex: '#A497FF', name: 'Lavande' },
  { hex: '#4CC9A0', name: 'Menthe' },
  { hex: '#FFCF5A', name: 'Moutarde' },
  { hex: '#7E9C8F', name: 'Sauge' },
  { hex: '#FF4FD8', name: 'Rose néon' },
  { hex: '#24E1FF', name: 'Cyan' },
  { hex: '#2E2C3D', name: 'Encre' },
  { hex: '#F5F2EC', name: 'Coquille' },
] as const

export function paletteColorName(hex: string) {
  return OBJECT_PALETTE.find((p) => p.hex.toLowerCase() === hex.toLowerCase())?.name ?? hex.toUpperCase()
}
