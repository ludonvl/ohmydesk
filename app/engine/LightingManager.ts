import type { Scene } from 'three'
import { DirectionalLight, HemisphereLight, PointLight } from 'three'
import type { Room } from '#shared/types/scene'
import type { RoomTheme } from '#shared/themes'

/** Éclairage doux de diorama : ciel/sol + soleil avec ombres douces + lumière d'ambiance optionnelle. */
export class LightingManager {
  readonly hemi = new HemisphereLight('#ffffff', '#cccccc', 1.5)
  readonly sun = new DirectionalLight('#ffffff', 2.4)
  readonly accent = new PointLight('#ffffff', 0, 6, 1.6)

  constructor(scene: Scene) {
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(2048, 2048)
    this.sun.shadow.bias = -0.0004
    this.sun.shadow.normalBias = 0.02
    this.sun.shadow.radius = 4
    scene.add(this.hemi, this.sun, this.sun.target, this.accent)
  }

  apply(theme: RoomTheme, room: Room) {
    this.hemi.color.set(theme.hemiSky)
    this.hemi.groundColor.set(theme.hemiGround)
    this.hemi.intensity = theme.hemiIntensity

    this.sun.color.set(theme.sun)
    this.sun.intensity = theme.sunIntensity
    // Soleil devant/à droite et en hauteur : les ombres tombent vers les murs du fond, lisibles en iso.
    this.sun.position.set(room.width * 0.55, room.height * 2.6, room.depth * 1.1)
    this.sun.target.position.set(0, 0, 0)
    const extent = Math.max(room.width, room.depth) * 0.9 + 0.5
    const cam = this.sun.shadow.camera
    cam.left = -extent
    cam.right = extent
    cam.top = extent
    cam.bottom = -extent
    cam.near = 0.5
    cam.far = room.height * 6 + 10
    cam.updateProjectionMatrix()

    if (theme.accentLight) {
      this.accent.color.set(theme.accentLight.color)
      this.accent.intensity = theme.accentLight.intensity
      this.accent.position.set(0, room.height * 0.55, -room.depth * 0.15)
    } else {
      this.accent.intensity = 0
    }
  }

  dispose() {
    this.sun.shadow.map?.dispose()
  }
}
