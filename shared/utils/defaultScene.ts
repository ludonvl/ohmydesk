import type { RoomThemeId, SceneData, SceneObject } from '../types/scene'
import { SCENE_VERSION } from '../types/scene'
import { createId } from './ids'

type Spec = Omit<SceneObject, 'id' | 'scale' | 'finish' | 'colors' | 'rotation'> &
  Partial<Pick<SceneObject, 'rotation' | 'colors' | 'finish'>>

const themeColors: Record<RoomThemeId, Record<string, Record<string, string>>> = {
  studio: {},
  neon: {
    'desk-basic': { top: '#1E1A40', legs: '#0F0D22' },
    'monitor-27': { frame: '#0F0D22', screen: '#24E1FF' },
    'keyboard-75': { body: '#2D2760', keys: '#3A3378', accent: '#FF4FD8' },
    mouse: { body: '#3A3378' },
    'desk-mat': { mat: '#0F0D22' },
    'chair-ergo': { main: '#FF4FD8', frame: '#0F0D22' },
    'lamp-architect': { shade: '#FFE45C', frame: '#0F0D22' },
    'plant-monstera': { pot: '#1E1A40', leaves: '#2BD99A', leaves2: '#5BF0B8' },
    'pc-tower': { case: '#0F0D22', glow: '#FF4FD8' },
    mug: { body: '#FFE45C' },
    rug: { main: '#FF4FD8' },
    'shelf-wall': { wood: '#1E1A40', book1: '#FF4FD8', book2: '#24E1FF', book3: '#FFE45C' },
    poster: { frame: '#1E1A40', art: '#24E1FF', accent: '#FF4FD8' },
  },
  scandi: {
    'desk-basic': { top: '#C99D70', legs: '#F5F2EC' },
    'monitor-27': { frame: '#3B3A36', screen: '#EDE3CC' },
    'keyboard-75': { body: '#E9DFD0', keys: '#F5F2EC', accent: '#7E9C8F' },
    'desk-mat': { mat: '#E9DFD0' },
    'chair-ergo': { main: '#7E9C8F', frame: '#3B3A36' },
    'lamp-architect': { shade: '#F5F2EC', frame: '#3B3A36' },
    'plant-monstera': { pot: '#E9D9C3', leaves: '#5E8C61', leaves2: '#7AA97D' },
    'pc-tower': { case: '#3B3A36', glow: '#EDE3CC' },
    mug: { body: '#E3A587' },
    rug: { main: '#CCD9D2' },
    'shelf-wall': { wood: '#C99D70', book1: '#7E9C8F', book2: '#E3A587', book3: '#3B3A36' },
    poster: { frame: '#FFFFFF', art: '#E3A587', accent: '#F5F2EC' },
  },
}

const baseLayout: Spec[] = [
  { catalogId: 'rug', position: [-0.1, 0, -0.35] },
  { catalogId: 'desk-basic', position: [-0.1, 0, -1.13] },
  { catalogId: 'pc-tower', position: [0.32, 0, -1.15] },
  { catalogId: 'desk-mat', position: [-0.05, 0.75, -0.97] },
  { catalogId: 'monitor-27', position: [-0.1, 0.75, -1.27] },
  { catalogId: 'keyboard-75', position: [-0.12, 0.754, -0.97] },
  { catalogId: 'mouse', position: [0.22, 0.754, -0.97] },
  { catalogId: 'lamp-architect', position: [-0.66, 0.75, -1.32] },
  { catalogId: 'mug', position: [0.42, 0.75, -1.28] },
  { catalogId: 'chair-ergo', position: [-0.1, 0, -0.42], rotation: 180 },
  { catalogId: 'plant-monstera', position: [1.0, 0, -1.05] },
  { catalogId: 'shelf-wall', position: [0.85, 1.55, -1.5] },
  { catalogId: 'poster', position: [-1.5, 1.5, -0.55], rotation: 90 },
]

export function createDefaultScene(theme: RoomThemeId = 'studio'): SceneData {
  const colors = themeColors[theme]
  return {
    version: SCENE_VERSION,
    room: { width: 3, depth: 3, height: 2.4, theme, walls: true },
    camera: { azimuth: 45, zoom: 1 },
    objects: baseLayout.map((spec) => ({
      id: createId('o_'),
      catalogId: spec.catalogId,
      position: [...spec.position] as [number, number, number],
      rotation: spec.rotation ?? 0,
      scale: 1,
      colors: { ...(colors[spec.catalogId] ?? {}), ...(spec.colors ?? {}) },
      finish: spec.finish ?? 'satin',
    })),
  }
}

export function createEmptyScene(theme: RoomThemeId = 'studio'): SceneData {
  return {
    version: SCENE_VERSION,
    room: { width: 3, depth: 3, height: 2.4, theme, walls: true },
    camera: { azimuth: 45, zoom: 1 },
    objects: [],
  }
}
