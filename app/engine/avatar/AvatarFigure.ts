import type { BufferGeometry } from 'three'
import { Group, MathUtils, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import type { Avatar } from '#shared/avatar/schema'
import type { AvatarJoint } from '#shared/avatar/rig'
import { AVATAR_JOINTS, buildAvatarRig } from '#shared/avatar/rig'
import { partGeometry } from '../AssetManager'

const WAVE_DURATION = 2.2
const ARM_REST = 0.07
/** Longueur d'un pas (m) : règle la cadence des jambes sur la vitesse de marche. */
const STEP = 0.3

const smooth = (x: number) => {
  const t = MathUtils.clamp(x, 0, 1)
  return t * t * (3 - 2 * t)
}
/** Rapproche `value` de `target` à vitesse constante (unités par seconde). */
const approach = (value: number, target: number, rate: number, dt: number) =>
  value < target ? Math.min(target, value + rate * dt) : Math.max(target, value - rate * dt)

type Rot = [number, number, number]

/**
 * Figurine articulée construite à partir de `buildAvatarRig` : un Group par articulation,
 * animé en tournant les pivots (pas de squelette ni de SkinnedMesh).
 *
 * Postures pilotées de l'extérieur (`speed`, `sitting`, `typing`, `look`), mélangées en douceur :
 * debout (respiration, balancement, regard), marche, assis, frappe au clavier, et « coucou » à la demande.
 */
export class AvatarFigure {
  readonly root = new Group()
  height = 1.67

  /** Vitesse de marche (m/s) ; 0 = à l'arrêt. */
  speed = 0
  sitting = false
  typing = false
  /** Regard : `free` = promène son regard, `ahead` = droit devant, `down` = vers les mains. */
  look: 'free' | 'ahead' | 'down' = 'free'
  /** Mouvements d'attente (respiration, regard). Désactivés si l'utilisateur préfère réduire les animations. */
  idleMotion = true

  private joints = new Map<AvatarJoint, Group>()
  private basePivots = new Map<AvatarJoint, Vector3>()
  private materials = new Map<string, MeshStandardMaterial>()
  private geometries: BufferGeometry[] = []
  private eyes: Mesh[] = []
  private key = ''

  private time = Math.random() * 10
  private phase = 0
  private walkW = 0
  private sitW = 0
  private typeW = 0
  private nextBlink = 2
  private blinkTime = -1
  private lookYaw = 0
  private lookPitch = 0
  private nextLook = 1.5
  private waveTime = -1

  constructor(avatar: Avatar) {
    this.root.name = 'avatar'
    this.setAvatar(avatar)
  }

  /** Avancement de la transition vers la position assise (0 debout → 1 assis). */
  get sitWeight() {
    return this.sitW
  }

  get waving() {
    return this.waveTime >= 0
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
      this.basePivots.set(name, new Vector3(...pivot))
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

  /** Avance l'animation. Retourne true : la figurine bouge en permanence (respiration, regard). */
  update(dt: number): boolean {
    this.time += dt
    this.phase += (dt * this.speed * Math.PI) / STEP
    this.walkW = approach(this.walkW, this.speed > 0.01 ? 1 : 0, 6, dt)
    this.sitW = approach(this.sitW, this.sitting ? 1 : 0, 1.6, dt)
    this.typeW = approach(this.typeW, this.typing && this.sitting ? 1 : 0, 2.5, dt)

    this.nextBlink -= dt
    if (this.nextBlink <= 0 && this.blinkTime < 0) {
      this.blinkTime = 0
      this.nextBlink = 2.5 + Math.random() * 3
    }
    if (this.blinkTime >= 0) {
      this.blinkTime += dt
      if (this.blinkTime > 0.14) this.blinkTime = -1
    }

    this.nextLook -= dt
    if (this.nextLook <= 0) {
      this.nextLook = 2 + Math.random() * 3
      this.lookYaw = Math.random() < 0.4 ? 0 : (Math.random() * 2 - 1) * 0.45
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
    const t = this.time
    const idle = this.idleMotion ? 1 - this.walkW : 0
    const w = this.walkW
    const s = Math.sin(this.phase)
    const sit = smooth(this.sitW)
    const type = smooth(this.typeW)

    // Debout (attente + marche).
    const stand: Partial<Record<AvatarJoint, Rot>> = {
      hips: [0, 0, idle * 0.018 * Math.sin(t * 0.7)],
      spine: [idle * 0.012 * Math.sin(t * 1.9) + w * 0.05, w * 0.06 * s, -idle * 0.014 * Math.sin(t * 0.7)],
      armL: [idle * 0.04 * Math.sin(t * 1.3) + w * 0.42 * s, 0, ARM_REST + idle * 0.02 * Math.sin(t * 1.9)],
      forearmL: [-0.08 - w * 0.25 * Math.max(0, -s), 0, 0],
      armR: [idle * 0.04 * Math.sin(t * 1.3 + 1) - w * 0.42 * s, 0, -ARM_REST - idle * 0.02 * Math.sin(t * 1.9)],
      forearmR: [-0.08 - w * 0.25 * Math.max(0, s), 0, 0],
      legL: [-w * 0.5 * s, 0, 0],
      shinL: [w * 0.7 * Math.max(0, -s), 0, 0],
      legR: [w * 0.5 * s, 0, 0],
      shinR: [w * 0.7 * Math.max(0, s), 0, 0],
    }
    // Assis (mains sur les cuisses), ou en train de taper au clavier.
    const tap = (k: number) => 0.06 * Math.sin(t * 17 + k) * type
    const seated: Partial<Record<AvatarJoint, Rot>> = {
      hips: [0, 0, 0],
      spine: [0.04 + type * 0.1 + idle * 0.01 * Math.sin(t * 1.9), 0, 0],
      armL: [MathUtils.lerp(-0.3, -0.5, type), 0, MathUtils.lerp(0.1, 0.05, type)],
      forearmL: [MathUtils.lerp(-0.95, -1.25, type) + tap(0), 0, MathUtils.lerp(0, -0.25, type)],
      armR: [MathUtils.lerp(-0.3, -0.5, type), 0, MathUtils.lerp(-0.1, -0.05, type)],
      forearmR: [MathUtils.lerp(-0.95, -1.25, type) + tap(2), 0, MathUtils.lerp(0, 0.25, type)],
      legL: [-1.52, 0, 0.04],
      shinL: [1.45, 0, 0],
      legR: [-1.52, 0, -0.04],
      shinR: [1.45, 0, 0],
    }
    for (const name of AVATAR_JOINTS) {
      if (name === 'head') continue
      const a = stand[name] ?? [0, 0, 0]
      const b = seated[name] ?? a
      this.joints.get(name)!.rotation.set(MathUtils.lerp(a[0], b[0], sit), MathUtils.lerp(a[1], b[1], sit), MathUtils.lerp(a[2], b[2], sit))
    }
    // Petit rebond du bassin à chaque pas.
    const hips = this.joints.get('hips')!
    hips.position.y = this.basePivots.get('hips')!.y + w * (1 - sit) * 0.022 * Math.abs(Math.cos(this.phase))

    // Regard : rejoint sa cible en douceur (amortissement exponentiel).
    const head = this.joints.get('head')!
    const k = 1 - Math.exp(-dt * 3)
    const free = this.look === 'free' && this.idleMotion
    const yaw = free ? this.lookYaw : 0
    const pitch = this.look === 'down' ? 0.32 : free ? this.lookPitch : 0
    head.rotation.y += (yaw - head.rotation.y) * k
    head.rotation.x += (pitch - head.rotation.x) * k
    head.rotation.z = 0

    // « Coucou » : bras droit levé, avant-bras qui oscille, tête légèrement penchée.
    if (this.waveTime >= 0) {
      const e = smooth(this.waveTime / 0.35) * smooth((WAVE_DURATION - this.waveTime) / 0.35)
      const armR = this.joints.get('armR')!
      armR.rotation.z = MathUtils.lerp(armR.rotation.z, -2.75, e)
      armR.rotation.x = MathUtils.lerp(armR.rotation.x, -0.15, e)
      const forearmR = this.joints.get('forearmR')!
      forearmR.rotation.x = MathUtils.lerp(forearmR.rotation.x, 0, e)
      forearmR.rotation.z = MathUtils.lerp(forearmR.rotation.z, 0.35 + 0.45 * Math.sin(this.waveTime * 11), e)
      head.rotation.z = 0.1 * e
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
    this.basePivots.clear()
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
