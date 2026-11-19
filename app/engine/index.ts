/**
 * Moteur 3D Oh My Desk — Three.js pur, sans dépendance à Vue ou Nuxt.
 * Importé dynamiquement côté client par <SceneCanvas> (jamais exécuté pendant le SSR).
 */
export { Engine } from './Engine'
export type { EngineEvents, EngineMode, EngineOptions } from './Engine'
export { SceneSerializer } from './SceneSerializer'
export { AvatarFigure } from './avatar/AvatarFigure'
export { AvatarStage } from './avatar/AvatarStage'
