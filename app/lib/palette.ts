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

/** Couleurs proposées pour les murs (panneau Pièce). */
export const WALL_PALETTE = [
  { hex: '#F5F2EC', name: 'Coquille' },
  { hex: '#EFEBF9', name: 'Lilas pâle' },
  { hex: '#E3ECE6', name: 'Vert d’eau' },
  { hex: '#F6E3D4', name: 'Pêche' },
  { hex: '#DCE6F2', name: 'Bleu brume' },
  { hex: '#7E9C8F', name: 'Sauge' },
  { hex: '#C86B4A', name: 'Terracotta' },
  { hex: '#2D2760', name: 'Nuit' },
  { hex: '#2E2C3D', name: 'Encre' },
] as const

/** Couleurs proposées pour le sol : bois, pierre et textiles. */
export const FLOOR_PALETTE = [
  { hex: '#E7B98C', name: 'Chêne miel' },
  { hex: '#DCC39E', name: 'Chêne clair' },
  { hex: '#B07A52', name: 'Noyer' },
  { hex: '#6E4A34', name: 'Wengé' },
  { hex: '#D9D6D0', name: 'Gris perle' },
  { hex: '#9C9A96', name: 'Béton' },
  { hex: '#F2EEE6', name: 'Blanc cassé' },
  { hex: '#3B3175', name: 'Indigo' },
  { hex: '#2E2C3D', name: 'Encre' },
] as const
