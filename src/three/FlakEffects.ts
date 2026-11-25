import * as THREE from 'three'
import { randomBetween } from './motion'
import type { Range } from './motion'
import { SeededRandom } from './SeededRandom'

const PUFF_POOL = 480
const FLASH_POOL = 16
const DOT_POOL = 16
const TEXTURE_PIXELS = 128
const PUFF_TEXTURE_COUNT = 4
const PUFF_BLOBS = 12
const BLOB_OFFSET_SHARE = 0.16
const BLOB_RADIUS_SHARE: Range = { min: 0.1, max: 0.3 }
const BLOB_ALPHA = 0.9
const BLOB_MIDDLE_ALPHA = 0.8
const BLOB_MIDDLE_STOP = 0.7
const SHARE_RESOLUTION = 100
const DOT_EDGE_STOP = 0.92
const DOT_START_RADIUS_METERS = 0.3
const DOT_END_SHARE = 0.7
const FADE_IN_SECONDS = 0.06
const DRAG_SECONDS = 0.5
const PUFF_COUNT: Range = { min: 14, max: 22 }
const PUFF_SPREAD_SHARE = 0.7
const PUFF_OUTWARD_SPEED: Range = { min: 3, max: 6 }
const PUFF_DARKEST = new THREE.Color(0x090909)
const PUFF_LIGHTEST = new THREE.Color(0x34322f)
const FLASH_COLOR = 0xffb050

type ParticleKind = {
  life: Range
  size: { start: Range; end: Range }
  growSeconds: number
  opacity: number
  isAdditive: boolean
}
type Particle = { sprite: THREE.Sprite; age: number; life: number; sizeStart: number; sizeEnd: number; growSeconds: number; opacity: number; velocity: THREE.Vector3 }
type Shell = { sprite: THREE.Sprite; age: number }

// A cloud of flak swells in a moment, then lingers and thins out; the flash is the shell going off.
const PUFF: ParticleKind = { life: { min: 2.6, max: 3.6 }, size: { start: { min: 2, max: 4 }, end: { min: 10, max: 16 } }, growSeconds: 0.35, opacity: 0.9, isAdditive: false }
const FLASH: ParticleKind = { life: { min: 0.12, max: 0.12 }, size: { start: { min: 3, max: 3 }, end: { min: 9, max: 9 } }, growSeconds: 0.05, opacity: 0.9, isAdditive: true }

function shareBetween(random: SeededRandom, range: Range): number {
  return range.min + (random.integer(0, SHARE_RESOLUTION) / SHARE_RESOLUTION) * (range.max - range.min)
}

/** A ragged blob of smoke: a few soft discs piled up, white so that the sprite takes the colour of its puff. */
function puffTexture(seed: number): THREE.CanvasTexture {
  const random = new SeededRandom(seed)
  const canvas = document.createElement('canvas')
  canvas.width = TEXTURE_PIXELS
  canvas.height = TEXTURE_PIXELS
  const context = canvas.getContext('2d')!
  const middle = TEXTURE_PIXELS / 2
  const offset: Range = { min: -BLOB_OFFSET_SHARE, max: BLOB_OFFSET_SHARE }
  for (let blob = 0; blob < PUFF_BLOBS; blob += 1) {
    const x = middle + shareBetween(random, offset) * TEXTURE_PIXELS
    const y = middle + shareBetween(random, offset) * TEXTURE_PIXELS
    const radius = shareBetween(random, BLOB_RADIUS_SHARE) * TEXTURE_PIXELS
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, `rgba(255, 255, 255, ${BLOB_ALPHA})`)
    gradient.addColorStop(BLOB_MIDDLE_STOP, `rgba(255, 255, 255, ${BLOB_MIDDLE_ALPHA})`)
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, TEXTURE_PIXELS, TEXTURE_PIXELS)
  }
  return new THREE.CanvasTexture(canvas)
}

function flashTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = TEXTURE_PIXELS
  canvas.height = TEXTURE_PIXELS
  const context = canvas.getContext('2d')!
  const middle = TEXTURE_PIXELS / 2
  const gradient = context.createRadialGradient(middle, middle, 0, middle, middle, middle)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, TEXTURE_PIXELS, TEXTURE_PIXELS)
  return new THREE.CanvasTexture(canvas)
}

/** A black disc with a hard edge: the shell, seen coming. */
function dotTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = TEXTURE_PIXELS
  canvas.height = TEXTURE_PIXELS
  const context = canvas.getContext('2d')!
  const middle = TEXTURE_PIXELS / 2
  const gradient = context.createRadialGradient(middle, middle, 0, middle, middle, middle)
  gradient.addColorStop(0, 'rgba(0, 0, 0, 1)')
  gradient.addColorStop(DOT_EDGE_STOP, 'rgba(0, 0, 0, 1)')
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, TEXTURE_PIXELS, TEXTURE_PIXELS)
  return new THREE.CanvasTexture(canvas)
}

function spriteWith(texture: THREE.Texture, group: THREE.Group): THREE.Sprite {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }))
  sprite.visible = false
  group.add(sprite)
  return sprite
}

function newParticle(sprite: THREE.Sprite): Particle {
  return { sprite, age: 0, life: 0, sizeStart: 0, sizeEnd: 0, growSeconds: 0, opacity: 0, velocity: new THREE.Vector3() }
}

/**
 * The shells of the flak and their bursts, as sprites in the world: a shell shows as a black dot that swells as it comes, then goes off in a flash and a cloud of black smoke that lingers and thins out.
 * The scene moves the aircraft past them, so the clouds stay where the shells went off.
 */
export class FlakEffects {
  readonly object = new THREE.Group()
  private readonly puffs: Particle[] = []
  private readonly flashes: Particle[] = []
  private readonly dots: THREE.Sprite[] = []
  private shells: Shell[] = []

  constructor(
    private readonly fuseSeconds: number,
    private readonly blastRadiusMeters: number,
  ) {
    const puffTextures: THREE.Texture[] = []
    for (let seed = 0; seed < PUFF_TEXTURE_COUNT; seed += 1) {
      puffTextures.push(puffTexture(seed))
    }
    for (let index = 0; index < PUFF_POOL; index += 1) {
      this.puffs.push(newParticle(spriteWith(puffTextures[index % PUFF_TEXTURE_COUNT], this.object)))
    }
    const flash = flashTexture()
    for (let index = 0; index < FLASH_POOL; index += 1) {
      this.flashes.push(newParticle(spriteWith(flash, this.object)))
    }
    const dot = dotTexture()
    for (let index = 0; index < DOT_POOL; index += 1) {
      this.dots.push(spriteWith(dot, this.object))
    }
  }

  /** A shell coming to burst at this place when the fuse is out. */
  launch(position: THREE.Vector3): void {
    const sprite = this.dots.find((candidate) => !candidate.visible)
    if (sprite === undefined) {
      return
    }
    sprite.position.copy(position)
    sprite.visible = true
    this.shells.push({ sprite, age: 0 })
    this.sizeShell(sprite, 0)
  }

  update(deltaSeconds: number): void {
    const flying: Shell[] = []
    for (const shell of this.shells) {
      shell.age += deltaSeconds
      if (shell.age >= this.fuseSeconds) {
        shell.sprite.visible = false
        this.burst(shell.sprite.position)
      } else {
        this.sizeShell(shell.sprite, shell.age / this.fuseSeconds)
        flying.push(shell)
      }
    }
    this.shells = flying
    this.ageAll(this.puffs, deltaSeconds)
    this.ageAll(this.flashes, deltaSeconds)
  }

  private ageAll(pool: Particle[], deltaSeconds: number): void {
    for (const particle of pool) {
      if (particle.sprite.visible) {
        this.age(particle, deltaSeconds)
      }
    }
  }

  /** The dot swells slowly then fast, as a shell does that comes straight at the camera. */
  private sizeShell(sprite: THREE.Sprite, progress: number): void {
    const endRadius = this.blastRadiusMeters * DOT_END_SHARE
    const diameter = 2 * (DOT_START_RADIUS_METERS + (endRadius - DOT_START_RADIUS_METERS) * progress * progress)
    sprite.scale.set(diameter, diameter, 1)
  }

  private burst(center: THREE.Vector3): void {
    this.spawn(this.flashes, center, FLASH, FLASH_COLOR, new THREE.Vector3())
    const count = Math.round(randomBetween(PUFF_COUNT))
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * 2 * Math.PI
      const distance = Math.random() * this.blastRadiusMeters * PUFF_SPREAD_SHARE
      const speed = randomBetween(PUFF_OUTWARD_SPEED)
      const position = center.clone().add(new THREE.Vector3(Math.cos(angle) * distance, Math.sin(angle) * distance, 0))
      const color = PUFF_DARKEST.clone().lerp(PUFF_LIGHTEST, Math.random())
      this.spawn(this.puffs, position, PUFF, color, new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed, 0))
    }
  }

  private spawn(pool: Particle[], position: THREE.Vector3, kind: ParticleKind, color: THREE.ColorRepresentation, velocity: THREE.Vector3): void {
    const particle = pool.find((candidate) => !candidate.sprite.visible)
    if (particle === undefined) {
      return
    }
    particle.age = 0
    particle.life = randomBetween(kind.life)
    particle.sizeStart = randomBetween(kind.size.start)
    particle.sizeEnd = randomBetween(kind.size.end)
    particle.growSeconds = kind.growSeconds
    particle.opacity = kind.opacity
    particle.velocity.copy(velocity)
    const material = particle.sprite.material
    material.color.set(color)
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
    particle.sprite.position.addScaledVector(particle.velocity, deltaSeconds)
    const drag = Math.exp(-deltaSeconds / DRAG_SECONDS)
    particle.velocity.multiplyScalar(drag)
    const size = particle.sizeStart + (particle.sizeEnd - particle.sizeStart) * (1 - Math.exp(-particle.age / particle.growSeconds))
    particle.sprite.scale.set(size, size, 1)
    particle.sprite.material.opacity = particle.opacity * Math.min(1, particle.age / FADE_IN_SECONDS) * (1 - progress * progress)
  }
}
