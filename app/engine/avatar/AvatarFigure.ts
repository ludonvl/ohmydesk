import type { BufferGeometry } from 'three'
import { Group, MathUtils, Mesh, MeshStandardMaterial } from 'three'
import type { Avatar } from '#shared/avatar/schema'
import type { AvatarJoint } from '#shared/avatar/rig'
import { AVATAR_JOINTS, buildAvatarRig } from '#shared/avatar/rig'
import { partGeometry } from '../AssetManager'

const WAVE_DURATION = 2.2
const ARM_REST = 0.07

const smooth = (x: number) => {
  const t = MathUtils.clamp(x, 0, 1)
  return t * t * (3 - 2 * t)
}

/**
 * Figurine articulée construite à partir de `buildAvatarRig` : un Group par articulation,
 * animé en tournant les pivots (pas de squelette ni de SkinnedMesh).
 * Animations : respiration, balancement, regard, clignement des yeux, et « coucou » à la demande.
 */
export class AvatarFigure {
  readonly root = new Group()
  height = 1.67

  private joints = new Map<AvatarJoint, Group>()
  private materials = new Map<string, MeshStandardMaterial>()
  private geometries: BufferGeometry[] = []
  private eyes: Mesh[] = []
  private key = ''

  private time = Math.random() * 10
  private nextBlink = 2
  private blinkTime = -1
  private lookTarget = 0
  private lookPitch = 0
  private nextLook = 1.5
  private waveTime = -1

  /** Mouvements d'attente (respiration, regard). Désactivés si l'utilisateur préfère réduire les animations. */
  idleMotion = true

  constructor(avatar: Avatar) {
    this.root.name = 'avatar'
    this.setAvatar(avatar)
  }

  setAvatar(avatar: Avatar) {
    const key = JSON.stringify(avatar)
    if (key === this.key) return
    this.key = key
    this.clear()

    const rig = buildAvatarRig(avatar)
    this.height = rig.height
    for (const name of AVATAR_JOINTS) {
      const { parent, pivot } = rig.joints[name]
      const group = new Group()
      group.name = `avatar:${name}`
      group.position.set(...pivot)
      ;(parent ? this.joints.get(parent)! : this.root).add(group)
      this.joints.set(name, group)
    }
    for (const { joint, part } of rig.parts) {
      const geometry = partGeometry(part)
      this.geometries.push(geometry)
      const mesh = new Mesh(geometry, this.material(part.slot, rig.colors[part.slot] ?? '#ff00ff'))
      mesh.position.set(...part.position)
      mesh.castShadow = Math.min(...part.size) > 0.02
      mesh.receiveShadow = true
      mesh.userData.slot = part.slot
      if (part.slot === 'eyes') this.eyes.push(mesh)
      this.joints.get(joint)!.add(mesh)
    }
    this.applyPose()
  }

  /** Lance un « coucou » de la main droite. */
  wave() {
    this.waveTime = 0
  }

  get waving() {
    return this.waveTime >= 0
  }

  /** Avance l'animation. Retourne true : la figurine bouge en permanence (respiration, regard). */
  update(dt: number): boolean {
    this.time += dt

    // Clignement des yeux.
    this.nextBlink -= dt
    if (this.nextBlink <= 0 && this.blinkTime < 0) {
      this.blinkTime = 0
      this.nextBlink = 2.5 + Math.random() * 3
    }
    if (this.blinkTime >= 0) {
      this.blinkTime += dt
      if (this.blinkTime > 0.14) this.blinkTime = -1
    }

    // Regard : nouvelle direction de temps en temps.
    this.nextLook -= dt
    if (this.nextLook <= 0) {
      this.nextLook = 2 + Math.random() * 3
      this.lookTarget = Math.random() < 0.4 ? 0 : (Math.random() * 2 - 1) * 0.45
      this.lookPitch = (Math.random() * 2 - 1) * 0.12
    }

    if (this.waveTime >= 0) {
      this.waveTime += dt
      if (this.waveTime > WAVE_DURATION) this.waveTime = -1
    }
    this.applyPose(dt)
    return true
  }

  private applyPose(dt = 0) {
    const j = (name: AvatarJoint) => this.joints.get(name)!
    const t = this.time
    const idle = this.idleMotion ? 1 : 0

    const hips = j('hips')
    hips.rotation.z = idle * 0.018 * Math.sin(t * 0.7)
    const spine = j('spine')
    spine.rotation.x = idle * 0.012 * Math.sin(t * 1.9)
    spine.rotation.z = -hips.rotation.z * 0.8

    // Le regard rejoint sa cible en douceur (amortissement exponentiel).
    const head = j('head')
    const k = 1 - Math.exp(-dt * 3)
    head.rotation.y += (idle * this.lookTarget - head.rotation.y) * k
    head.rotation.x += (idle * this.lookPitch - head.rotation.x) * k

    j('armL').rotation.set(idle * 0.04 * Math.sin(t * 1.3), 0, ARM_REST + idle * 0.02 * Math.sin(t * 1.9))
    j('forearmL').rotation.set(-0.08, 0, 0)
    j('armR').rotation.set(idle * 0.04 * Math.sin(t * 1.3 + 1), 0, -ARM_REST - idle * 0.02 * Math.sin(t * 1.9))
    j('forearmR').rotation.set(-0.08, 0, 0)
    for (const leg of ['legL', 'legR', 'shinL', 'shinR'] as const) j(leg).rotation.set(0, 0, 0)

    // « Coucou » : bras droit levé, avant-bras qui oscille, tête légèrement penchée.
    if (this.waveTime >= 0) {
      const e = smooth(this.waveTime / 0.35) * smooth((WAVE_DURATION - this.waveTime) / 0.35)
      const armR = j('armR')
      armR.rotation.z = MathUtils.lerp(armR.rotation.z, -2.75, e)
      armR.rotation.x = MathUtils.lerp(armR.rotation.x, -0.15, e)
      j('forearmR').rotation.z = MathUtils.lerp(0, 0.35 + 0.45 * Math.sin(this.waveTime * 11), e)
      head.rotation.z = MathUtils.lerp(0, 0.1, e)
    } else {
      head.rotation.z = 0
    }

    const blink = this.blinkTime >= 0 ? 0.12 : 1
    for (const eye of this.eyes) eye.scale.y = blink
  }

  private material(slot: string, color: string): MeshStandardMaterial {
    let material = this.materials.get(slot)
    if (!material) {
      material = new MeshStandardMaterial({ color, roughness: slot === 'eyes' ? 0.3 : 0.62, metalness: 0 })
      this.materials.set(slot, material)
    }
    return material
  }

  private clear() {
    const hips = this.joints.get('hips')
    if (hips) this.root.remove(hips)
    this.joints.clear()
    this.eyes = []
    this.geometries.forEach((g) => g.dispose())
    this.geometries = []
    this.materials.forEach((m) => m.dispose())
    this.materials.clear()
  }

  dispose() {
    this.clear()
    this.root.removeFromParent()
  }
}
