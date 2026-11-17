import * as THREE from 'three'
import { buildGeometry, buildMaterials, loadModelData } from './ac3d'
import { EasedValue } from './motion'

const MODEL_NAME = 'cockpit'
const TEXTURES_URL = '/models/d520/cockpit/'
const CANOPY_PARTS = ['intcanopy', 'inttourcanopy']
const CANOPY_TRAVEL_METERS = 0.6
const CANOPY_TRAVEL_SECONDS = 2
const DEGREES = Math.PI / 180
const FULL_TURN_DEGREES = 360
const FULL_TURN_RADIANS = 2 * Math.PI
const GAUGE_TRAVEL_SECONDS = 1.5
const GAUGE_LOAD_SHARE = 0.6
const GAUGE_WOBBLE_SHARE = 0.05
const GAUGE_WOBBLE_SECONDS = 2.5
const SECONDS_PER_MINUTE = 60
const SECONDS_PER_HOUR = 3600
const HOURS_ON_DIAL = 12
const MILLISECONDS_PER_SECOND = 1000

export type CockpitControl = 'openCanopy' | 'runGauges'
export const COCKPIT_CONTROLS: CockpitControl[] = ['openCanopy', 'runGauges']

type Needle = { part: string; axis: THREE.Vector3; fullDegrees: number }
type Hand = { part: string; degreesPerSecond: number }

// The axis of a dial points forward, so that a needle turns clockwise for the pilot; fullDegrees is the turn at full scale.
// The angles and the axes are the ones of the instruments' animations in FlightGear, d520.xml and Panel/Instruments.
const FORWARD = new THREE.Vector3(0, 1, 0)
const BACKWARD = new THREE.Vector3(0, -1, 0)
const NEEDLES: Needle[] = [
  { part: 'airspeed/needle', axis: FORWARD, fullDegrees: 361 },
  { part: 'alt/needlemetre', axis: FORWARD, fullDegrees: 330 },
  { part: 'alt/needlekm', axis: FORWARD, fullDegrees: 33 },
  { part: 'vsi/needle', axis: BACKWARD, fullDegrees: -54 },
  { part: 'mano/needle', axis: FORWARD, fullDegrees: 322 },
  { part: 'oilpress/needle', axis: FORWARD, fullDegrees: 325 },
  { part: 'oiltemp/needle', axis: FORWARD, fullDegrees: 320 },
  { part: 'press/needle', axis: FORWARD, fullDegrees: 302 },
  { part: 'tach/needle', axis: FORWARD, fullDegrees: 355 },
  { part: 'temp/needle', axis: FORWARD, fullDegrees: 320 },
]
const CLOCK_HANDS: Hand[] = [
  { part: 'clock/heures', degreesPerSecond: FULL_TURN_DEGREES / (HOURS_ON_DIAL * SECONDS_PER_HOUR) },
  { part: 'clock/minutes', degreesPerSecond: FULL_TURN_DEGREES / SECONDS_PER_HOUR },
  { part: 'clock/secondes', degreesPerSecond: FULL_TURN_DEGREES / SECONDS_PER_MINUTE },
]

/**
 * The cockpit of the FlightGear D.520 by Emmanuel Baranger (GPL v2): frame, panel, seat and instruments, in the frame of
 * the exterior. Its canopy slides aft and its needles turn, as in the FlightGear files. Shown once loaded.
 */
export class CockpitModel {
  readonly object = new THREE.Group()
  /** Where the sliding canopy is, for the exterior canopy to follow. */
  readonly canopyTranslation = new THREE.Vector3()
  private readonly parts = new Map<string, THREE.Mesh>()
  private readonly hinges = new Map<string, THREE.Group>()
  private readonly canopy = new EasedValue(CANOPY_TRAVEL_SECONDS)
  private readonly gauges = new EasedValue(GAUGE_TRAVEL_SECONDS)
  private gaugePhase = 0

  constructor() {
    void this.load()
  }

  setControl(control: CockpitControl, isActive: boolean): void {
    switch (control) {
      case 'openCanopy':
        this.canopy.setTarget(isActive ? 1 : 0)
        break
      case 'runGauges':
        this.gauges.setTarget(isActive ? 1 : 0)
        break
    }
  }

  update(deltaSeconds: number): void {
    this.canopy.update(deltaSeconds)
    this.canopyTranslation.set(0, -CANOPY_TRAVEL_METERS * this.canopy.position, 0)
    CANOPY_PARTS.forEach((name) => this.parts.get(name)?.position.copy(this.canopyTranslation))
    this.moveGauges(deltaSeconds)
  }

  /** The needles climb to their running values and wobble a little; the clock shows the time of the day. */
  private moveGauges(deltaSeconds: number): void {
    this.gauges.update(deltaSeconds)
    this.gaugePhase += (FULL_TURN_RADIANS * deltaSeconds) / GAUGE_WOBBLE_SECONDS
    const share = this.gauges.position * (GAUGE_LOAD_SHARE + GAUGE_WOBBLE_SHARE * Math.sin(this.gaugePhase))
    for (const needle of NEEDLES) {
      this.turn(needle.part, needle.axis, needle.fullDegrees * share)
    }
    const now = new Date()
    const secondsOfDay = now.getHours() * SECONDS_PER_HOUR + now.getMinutes() * SECONDS_PER_MINUTE + now.getSeconds() + now.getMilliseconds() / MILLISECONDS_PER_SECOND
    for (const hand of CLOCK_HANDS) {
      this.turn(hand.part, FORWARD, (secondsOfDay * hand.degreesPerSecond) % FULL_TURN_DEGREES)
    }
  }

  private turn(part: string, axis: THREE.Vector3, degrees: number): void {
    this.hinges.get(part)?.quaternion.setFromAxisAngle(axis, degrees * DEGREES)
  }

  private async load(): Promise<void> {
    const { manifest, buffer } = await loadModelData(MODEL_NAME)
    const materials = buildMaterials(manifest)
    const loader = new THREE.TextureLoader()
    const textures = new Map<string, THREE.Texture>()
    manifest.materials.forEach((entry, index) => {
      if (entry.texture === null) {
        return
      }
      if (!textures.has(entry.texture)) {
        const texture = loader.load(TEXTURES_URL + entry.texture)
        texture.colorSpace = THREE.SRGBColorSpace
        textures.set(entry.texture, texture)
      }
      materials[index].map = textures.get(entry.texture)!
    })
    const turningParts = [...NEEDLES, ...CLOCK_HANDS].map((turning) => turning.part)
    for (const entry of manifest.parts) {
      const mesh = new THREE.Mesh(buildGeometry(entry, buffer, true), materials)
      this.parts.set(entry.name, mesh)
      if (turningParts.includes(entry.name)) {
        this.object.add(this.hinge(entry.name, mesh, new THREE.Vector3(...entry.origin)))
      } else {
        this.object.add(mesh)
      }
    }
  }

  /** A group at the pivot of a needle, so that turning the group turns the needle about its dial. */
  private hinge(name: string, mesh: THREE.Mesh, pivot: THREE.Vector3): THREE.Group {
    const group = new THREE.Group()
    group.position.copy(pivot)
    mesh.position.sub(pivot)
    group.add(mesh)
    this.hinges.set(name, group)
    return group
  }
}
