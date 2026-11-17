import * as THREE from 'three'
import { DESTROYED_LEVEL } from './damageStages'
import { randomBetween } from './motion'
import type { Range } from './motion'

const PARTICLE_COUNT = 200
const SPRITE_PIXELS = 64
const FADE_IN_SHARE = 0.2
const BURST_FIRE_COUNT = 40
const BURST_SMOKE_COUNT = 30
const FLASH_LIFE_SECONDS = 0.3
const FLASH_SIZE_METERS = 9
const FLASH_COLOR = 0xffe8a0

type ParticleKind = {
  color: number
  isAdditive: boolean
  opacity: number
  life: Range
  size: { start: Range; end: Range }
  rise: number
  spread: number
}
type Emitter = { position: THREE.Vector3; kind: ParticleKind; rate: number; carry: number }
type Particle = { sprite: THREE.Sprite; age: number; life: number; sizeStart: number; sizeEnd: number; opacity: number; velocity: THREE.Vector3 }

const SMOKE: ParticleKind = {
  color: 0x777777,
  isAdditive: false,
  opacity: 0.5,
  life: { min: 2, max: 3 },
  size: { start: { min: 0.3, max: 0.5 }, end: { min: 1.8, max: 2.4 } },
  rise: 2.5,
  spread: 0.4,
}
const DARK_SMOKE: ParticleKind = {
  color: 0x1a1a1a,
  isAdditive: false,
  opacity: 0.7,
  life: { min: 2.5, max: 4 },
  size: { start: { min: 0.5, max: 0.8 }, end: { min: 3, max: 4 } },
  rise: 3,
  spread: 0.6,
}
const FIRE: ParticleKind = {
  color: 0xff7a1a,
  isAdditive: true,
  opacity: 0.9,
  life: { min: 0.4, max: 0.8 },
  size: { start: { min: 0.6, max: 0.9 }, end: { min: 0.2, max: 0.4 } },
  rise: 1.5,
  spread: 0.3,
}

// Where the smoke and the flames come from, in the frame of the aircraft: a wing root, the engine, the middle of the fuselage.
const WING_ROOT = new THREE.Vector3(-1.6, 0.3, 0.1)
const ENGINE = new THREE.Vector3(0, 2.2, 0.35)
const FUSELAGE = new THREE.Vector3(0, -0.5, 0.2)
const SMOKING_LEVEL = 4
const BURNING_LEVEL = 6
const FLAMES_LEVEL = 7

function emittersFor(level: number): Emitter[] {
  const emitter = (position: THREE.Vector3, kind: ParticleKind, rate: number): Emitter => ({ position, kind, rate, carry: 0 })
  if (level >= DESTROYED_LEVEL) {
    return [emitter(FUSELAGE, DARK_SMOKE, 40), emitter(ENGINE, FIRE, 40), emitter(FUSELAGE, FIRE, 20)]
  }
  if (level >= FLAMES_LEVEL) {
    return [emitter(WING_ROOT, DARK_SMOKE, 20), emitter(ENGINE, DARK_SMOKE, 30), emitter(ENGINE, FIRE, 25)]
  }
  if (level >= BURNING_LEVEL) {
    return [emitter(WING_ROOT, DARK_SMOKE, 20), emitter(ENGINE, DARK_SMOKE, 30)]
  }
  if (level >= SMOKING_LEVEL) {
    return [emitter(WING_ROOT, SMOKE, 14)]
  }
  return []
}

function softSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = SPRITE_PIXELS
  canvas.height = SPRITE_PIXELS
  const context = canvas.getContext('2d')!
  const middle = SPRITE_PIXELS / 2
  const gradient = context.createRadialGradient(middle, middle, 0, middle, middle, middle)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, SPRITE_PIXELS, SPRITE_PIXELS)
  return new THREE.CanvasTexture(canvas)
}

/** The smoke, the flames and the explosion of a damaged aircraft, as soft sprites in the frame of the aircraft. */
export class DamageEffects {
  readonly object = new THREE.Group()
  private readonly particles: Particle[] = []
  private emitters: Emitter[] = []
  private readonly wind = new THREE.Vector3()

  constructor() {
    const texture = softSpriteTexture()
    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }))
      sprite.visible = false
      this.object.add(sprite)
      this.particles.push({ sprite, age: 0, life: 0, sizeStart: 0, sizeEnd: 0, opacity: 0, velocity: new THREE.Vector3() })
    }
  }

  /** The velocity of the aircraft in its own frame: the smoke stays in the air, so it trails against that velocity. */
  setVelocity(velocity: THREE.Vector3): void {
    this.wind.copy(velocity).negate()
  }

  /** Smoke and flames for this damage level. */
  setLevel(level: number): void {
    this.emitters = emittersFor(level)
  }

  /** A flash, a burst of flames and a cloud of smoke at the middle of the aircraft. */
  explode(): void {
    this.spawn(FUSELAGE, { ...FIRE, color: FLASH_COLOR, opacity: 1, life: { min: FLASH_LIFE_SECONDS, max: FLASH_LIFE_SECONDS }, size: { start: { min: 1, max: 1 }, end: { min: FLASH_SIZE_METERS, max: FLASH_SIZE_METERS } }, spread: 0 })
    for (let index = 0; index < BURST_FIRE_COUNT; index += 1) {
      this.spawn(FUSELAGE, { ...FIRE, life: { min: 0.6, max: 1.1 }, size: { start: { min: 1.5, max: 2 }, end: { min: 2.5, max: 3.5 } }, spread: 7 })
    }
    for (let index = 0; index < BURST_SMOKE_COUNT; index += 1) {
      this.spawn(FUSELAGE, { ...DARK_SMOKE, life: { min: 2, max: 3.5 }, size: { start: { min: 1, max: 1.5 }, end: { min: 4, max: 5 } }, spread: 4 })
    }
  }

  reset(): void {
    this.emitters = []
    this.particles.forEach((particle) => {
      particle.sprite.visible = false
    })
  }

  update(deltaSeconds: number): void {
    for (const emitter of this.emitters) {
      emitter.carry += emitter.rate * deltaSeconds
      while (emitter.carry >= 1) {
        emitter.carry -= 1
        this.spawn(emitter.position, emitter.kind)
      }
    }
    for (const particle of this.particles) {
      if (particle.sprite.visible) {
        this.age(particle, deltaSeconds)
      }
    }
  }

  private spawn(position: THREE.Vector3, kind: ParticleKind): void {
    const particle = this.particles.find((candidate) => !candidate.sprite.visible)
    if (particle === undefined) {
      return
    }
    particle.age = 0
    particle.life = randomBetween(kind.life)
    particle.sizeStart = randomBetween(kind.size.start)
    particle.sizeEnd = randomBetween(kind.size.end)
    particle.opacity = kind.opacity
    particle.velocity.set(randomBetween({ min: -kind.spread, max: kind.spread }), randomBetween({ min: -kind.spread, max: kind.spread }), kind.rise + randomBetween({ min: 0, max: kind.spread }))
    const material = particle.sprite.material
    material.color.set(kind.color)
    material.blending = kind.isAdditive ? THREE.AdditiveBlending : THREE.NormalBlending
    particle.sprite.position.copy(position)
    particle.sprite.visible = true
  }

  private age(particle: Particle, deltaSeconds: number): void {
    particle.age += deltaSeconds
    if (particle.age >= particle.life) {
      particle.sprite.visible = false
      return
    }
    const progress = particle.age / particle.life
    particle.sprite.position.addScaledVector(particle.velocity, deltaSeconds).addScaledVector(this.wind, deltaSeconds)
    const size = particle.sizeStart + (particle.sizeEnd - particle.sizeStart) * progress
    particle.sprite.scale.set(size, size, 1)
    particle.sprite.material.opacity = particle.opacity * Math.min(1, progress / FADE_IN_SHARE) * (1 - progress)
  }
}
