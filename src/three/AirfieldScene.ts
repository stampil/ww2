import * as THREE from 'three'
import { findPath } from '../plans/pathfinding'
import { runwayOf } from '../plans/runway'
import type { PlanRunway } from '../plans/runway'
import type { Cell, TerrainPlan } from '../plans/terrainPlan'
import { assetUrl } from '../assetUrl'
import { TILE_SIZE_METERS } from './airfield'
import { Bushes } from './Bushes'
import type { BushPlacement } from './Bushes'
import { D520_GROUND_PITCH_RADIANS, D520_SPAN_METERS, d520AxisHeightOnGround, D520Model } from './D520Model'
import { ArrivalFlight } from './arrivalFlight'
import { DepartureFlight } from './departureFlight'
import { DepartureQueue } from './departureQueue'
import type { Assignment } from './departureQueue'
import type { AircraftState } from './aircraftState'
import { smoothStep } from './easing'
import { LiveryTextures } from './liveries'
import { createRenderer, disposeScene, fitToContainer } from './rendering'
import { SeededRandom } from './SeededRandom'
import { TaxiPath } from './TaxiPath'
import { TileGround, tileCenterOf } from './TileGround'

const CAMERA_FIELD_OF_VIEW_DEGREES = 30
const CAMERA_NEAR_METERS = 1
const CAMERA_FAR_METERS = 6000
// The average color of public/textures/herbe.png, for what lies beyond the grass plain.
const GRASS_COLOR = 0x6d7231
const LIGHT_COLOR = 0xffffff
const AMBIENT_LIGHT_INTENSITY = 1.3
const SUN_LIGHT_INTENSITY = 2.2
const SUN_POSITION = new THREE.Vector3(-30, 20, 60)
const WORLD_UP = new THREE.Vector3(0, 0, 1)
const NOSE_ALONG_Y_ROTATION_RADIANS = Math.PI / 2
const MILLISECONDS_PER_SECOND = 1000
const SPRITES_PATH = 'sprites/buildings/'
const SPRITE_LIFT_METERS = 2
// An aircraft grows by this share of its size for each meter of altitude, so that it seems to come toward the camera as it climbs.
const ALTITUDE_GROWTH_PER_METER = 0.0025
const PARKED_STATE: AircraftState = { engine: 0, gearRetraction: 0, flaps: 0, wheels: 0, aileron: 0, rudder: 0, elevator: 0 }
const NORTH_HEADING_RADIANS = Math.PI / 2
// The aircraft in front of which the camera swings, as in the takeoff of the home page, in meters for the real aircraft.
const REAL_FRONT_DISTANCE_METERS = 18
const REAL_FRONT_HEIGHT_METERS = 8
// The aircraft of a group stand in a line this far apart for the real aircraft, the first to come at the rear, at the start of the runway.
const REAL_FORMATION_GAP_METERS = 10.5
const REAR_SLOT_X_METERS = 30
// A slot beyond the junction where all come onto the runway is reached from the north, over the grass, so that no aircraft taxis through another.
const JUNCTION_CLEARANCE_METERS = 20
const NORTH_APPROACH_METERS = 56
const PIVOT_SECONDS = 1
const TAXI_SPEED_METERS_PER_SECOND = 30
// An aircraft that has landed taxis more slowly to its stand, and the next one lands this long after it.
const LANDED_TAXI_SPEED_METERS_PER_SECOND = 18
const HANGAR_TAXI_SPEED_METERS_PER_SECOND = 10
const LANDING_SPACING_SECONDS = 7
const APPROACH_DISTANCE_METERS = 360
const TOUCHDOWN_BEFORE_END_METERS = 40
const EXIT_PAST_ENTRY_METERS = 30
const HEADING_SPAN_METERS = 8
const TAXI_ENGINE = 0.35
const TAXI_WHEELS = 0.4
const MARGIN_METERS = 300
const MARGIN_BUSH_COUNT = 160
const MARGIN_BUSH_WIDTH_METERS = { min: 10, max: 18 }
const MARGIN_SEED = 1940
const FULL_TURN_DEGREES = 360
const DEGREES = Math.PI / 180

type LandingAircraft = {
  aircraftId: number
  model: D520Model
  startSeconds: number
  path: TaxiPath
}

type EmergingAircraft = {
  aircraftId: number
  model: D520Model
  startSeconds: number
  path: TaxiPath
}

type DepartingAircraft = {
  aircraftId: number
  model: D520Model
  assignment: Assignment
  path: TaxiPath
  startSeconds: number
  taxiSeconds: number
  endHeading: number
}

/** From one heading to the other, the short way round. */
function turnBetween(fromHeading: number, toHeading: number): number {
  return Math.atan2(Math.sin(toHeading - fromHeading), Math.cos(toHeading - fromHeading))
}

/** Bushes scattered on the grass around the plan, which the camera sees when it swings in front of the aircraft. */
function marginBushes(plan: TerrainPlan, runway: PlanRunway): BushPlacement[] {
  const west = -runway.firstColumn * TILE_SIZE_METERS
  const east = (plan.tiles[0].length - runway.firstColumn) * TILE_SIZE_METERS
  const north = runway.row * TILE_SIZE_METERS + TILE_SIZE_METERS / 2
  const south = (runway.row - plan.tiles.length) * TILE_SIZE_METERS + TILE_SIZE_METERS / 2
  const random = new SeededRandom(MARGIN_SEED)
  const placements: BushPlacement[] = []
  while (placements.length < MARGIN_BUSH_COUNT) {
    const x = random.integer(west - MARGIN_METERS, east + MARGIN_METERS)
    const y = random.integer(south - MARGIN_METERS, north + MARGIN_METERS)
    const isOnPlan = x > west && x < east && y > south && y < north
    if (!isOnPlan) {
      placements.push({
        x,
        y,
        widthMeters: random.integer(MARGIN_BUSH_WIDTH_METERS.min, MARGIN_BUSH_WIDTH_METERS.max),
        turnRadians: random.integer(0, FULL_TURN_DEGREES) * DEGREES,
      })
    }
  }
  return placements
}

/** Draws the base in 3D over its flat map, the same size and seen from the same place: the aircraft parked, taking off and landing. */
export type AirfieldSceneOptions = {
  /** How wide an aircraft is on the map, in tiles. */
  aircraftWidthTiles: number
}

/**
 * The squadron taking off and landing over the base, which fills the canvas as the flat map does: each group waits on the runway, one aircraft
 * behind the other, then rolls off, climbs, turns back and flies off, the camera swinging in front of the lead and back above the base; an aircraft that comes
 * back lands on the runway and taxis to its stand. Owns its WebGL canvas.
 */
export class AirfieldScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(CAMERA_FIELD_OF_VIEW_DEGREES, 1, CAMERA_NEAR_METERS, CAMERA_FAR_METERS)
  private readonly resizeObserver: ResizeObserver
  private readonly runway: PlanRunway
  private readonly scale: number
  private readonly gapMeters: number
  private readonly flight: DepartureFlight
  private readonly landingFlight: ArrivalFlight
  private readonly queue = new DepartureQueue()
  private readonly models: D520Model[] = []
  private readonly idleModels: D520Model[] = []
  private readonly departing: DepartingAircraft[] = []
  private readonly landing: LandingAircraft[] = []
  private readonly emerging: EmergingAircraft[] = []
  private readonly liveries: LiveryTextures
  private readonly parkedModels: D520Model[] = []
  private readonly parkedLiveries: LiveryTextures
  private readonly topPosition = new THREE.Vector3()
  private readonly frontPosition = new THREE.Vector3()
  private readonly lookMatrix = new THREE.Matrix4()
  private readonly topOrientation = new THREE.Quaternion()
  private readonly frontOrientation = new THREE.Quaternion()
  private readonly startMilliseconds = performance.now()
  private parkedStands: Cell[] = []
  private lastLandingSeconds = Number.NEGATIVE_INFINITY
  private previousSeconds = 0

  constructor(
    private readonly container: HTMLElement,
    private readonly plan: TerrainPlan,
    options: AirfieldSceneOptions,
    private readonly onDeparted: (aircraftId: number) => void,
    private readonly onLanded: (aircraftId: number) => void,
  ) {
    this.runway = runwayOf(plan)
    this.scale = (options.aircraftWidthTiles * TILE_SIZE_METERS) / D520_SPAN_METERS
    this.gapMeters = REAL_FORMATION_GAP_METERS * this.scale
    this.flight = new DepartureFlight()
    const runwayEndX = tileCenterOf(this.runway, this.runway.row, this.runway.lastColumn).x + TILE_SIZE_METERS / 2
    const touchdownX = runwayEndX - TOUCHDOWN_BEFORE_END_METERS
    this.landingFlight = new ArrivalFlight(touchdownX + APPROACH_DISTANCE_METERS, touchdownX, this.exitX())
    this.renderer = createRenderer(container, false)
    this.liveries = new LiveryTextures(this.renderer.capabilities.getMaxAnisotropy(), (livery, texture) => {
      if (livery === 'french') {
        this.models.forEach((model) => model.setLivery(texture))
      }
    })
    // The aircraft parked are small and share the small copy of the livery, with no tail number and no damage painted on it.
    this.parkedLiveries = new LiveryTextures(
      this.renderer.capabilities.getMaxAnisotropy(),
      (livery, texture) => {
        if (livery === 'french') {
          this.parkedModels.forEach((model) => model.setLivery(texture))
        }
      },
      'low',
      ['french'],
    )

    this.scene.background = new THREE.Color(GRASS_COLOR)
    const ground = new TileGround(plan.tiles, (row, column) => tileCenterOf(this.runway, row, column), this.renderer.capabilities.getMaxAnisotropy())
    this.scene.add(ground.object)
    this.scene.add(new Bushes(marginBushes(plan, this.runway)).object)
    this.addBuildings()
    this.scene.add(new THREE.AmbientLight(LIGHT_COLOR, AMBIENT_LIGHT_INTENSITY))
    const sun = new THREE.DirectionalLight(LIGHT_COLOR, SUN_LIGHT_INTENSITY)
    sun.position.copy(SUN_POSITION)
    this.scene.add(sun)

    this.resizeObserver = new ResizeObserver(() => this.fitCamera())
    this.resizeObserver.observe(container)
    this.fitCamera()
    this.renderer.setAnimationLoop(() => this.renderFrame())
  }

  /** Puts the aircraft that stand on the ground, each on its stand, as pictures laid flat on the grass. */
  setParkedStands(stands: Cell[]): void {
    this.parkedStands = stands
    this.showParked()
  }

  /** Sends an aircraft from its stand to the junction, onto the runway and into its place in the line, to leave with the group waiting there, or a new one. */
  depart(aircraftId: number, stand: Cell, tailNumber: number): void {
    const startSeconds = this.secondsNow()
    const rearPath = this.taxiPathFrom(stand, 0)
    const naturalArrivalSeconds = startSeconds + rearPath.lengthMeters / TAXI_SPEED_METERS_PER_SECOND + PIVOT_SECONDS
    const assignment = this.queue.join(startSeconds, naturalArrivalSeconds)
    const path = assignment.slot === 0 ? rearPath : this.taxiPathFrom(stand, assignment.slot)
    this.departing.push({
      aircraftId,
      model: this.acquireModel(tailNumber),
      assignment,
      path,
      startSeconds,
      taxiSeconds: assignment.arrivalSeconds - PIVOT_SECONDS - startSeconds,
      endHeading: path.headingAt(path.lengthMeters, HEADING_SPAN_METERS),
    })
  }

  /** Brings an aircraft in to land on the runway, then taxi to its stand, with the damage it has; it lands after those that came in before it. */
  land(aircraftId: number, stand: Cell, damageLevel: number, tailNumber: number): void {
    const model = this.acquireModel(tailNumber)
    for (let level = 0; level < damageLevel; level += 1) {
      model.inflictDamage()
    }
    const startSeconds = Math.max(this.secondsNow(), this.lastLandingSeconds + LANDING_SPACING_SECONDS)
    this.lastLandingSeconds = startSeconds
    model.object.visible = false
    this.landing.push({ aircraftId, model, startSeconds, path: this.taxiPathToStand(stand) })
  }

  /** Brings an aircraft out of the hangar, from behind the building, and down the taxiways to its stand, with the damage it has. */
  emerge(aircraftId: number, stand: Cell, damageLevel: number, tailNumber: number): void {
    const model = this.acquireModel(tailNumber)
    for (let level = 0; level < damageLevel; level += 1) {
      model.inflictDamage()
    }
    this.emerging.push({ aircraftId, model, startSeconds: this.secondsNow(), path: this.taxiPathFromHangar(stand) })
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null)
    this.resizeObserver.disconnect()
    disposeScene(this.scene, this.renderer)
    this.liveries.dispose()
    this.parkedLiveries.dispose()
  }

  /** Where a landed aircraft leaves the runway: a little beyond the junction where aircraft come onto it, on the way it came. */
  private exitX(): number {
    return tileCenterOf(this.runway, this.runway.row, this.runway.entryColumn).x + EXIT_PAST_ENTRY_METERS
  }

  /** From the runway, the way an aircraft that has landed takes to its stand: to the junction, then down the taxiways. */
  private taxiPathToStand(stand: Cell): TaxiPath {
    const steps = findPath(this.plan, { row: this.runway.row, column: this.runway.entryColumn }, stand)
    const points = [new THREE.Vector2(this.exitX(), 0)]
    for (const step of steps) {
      points.push(tileCenterOf(this.runway, step.cell.row, step.cell.column))
    }
    return new TaxiPath(points)
  }

  /** From the hangar, the way an aircraft takes to its stand: down the taxiways and around the aircraft parked, starting from the middle of the tile of the hangar, which hides it. */
  private taxiPathFromHangar(stand: Cell): TaxiPath {
    const hangar = this.plan.sprites.find((sprite) => sprite.building === 'hangar')!
    const steps = findPath(this.plan, { row: hangar.row, column: hangar.column }, stand, this.parkedStands)
    return new TaxiPath(steps.map((step) => tileCenterOf(this.runway, step.cell.row, step.cell.column)))
  }

  private secondsNow(): number {
    return (performance.now() - this.startMilliseconds) / MILLISECONDS_PER_SECOND
  }

  /** The buildings stand up as pictures that face the camera, the foot of each on the foot of its tile, as on the flat map. */
  private addBuildings(): void {
    const loader = new THREE.TextureLoader()
    for (const building of this.plan.sprites) {
      loader.load(assetUrl(`${SPRITES_PATH}${building.sprite}.png`), (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace
        const image = texture.image as HTMLImageElement
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }))
        const widthMeters = building.widthTiles * TILE_SIZE_METERS
        sprite.scale.set(widthMeters, (widthMeters * image.height) / image.width, 1)
        sprite.center.set(0.5, 0)
        const tileCenter = tileCenterOf(this.runway, building.row, building.column)
        sprite.position.set(tileCenter.x, tileCenter.y - TILE_SIZE_METERS / 2, SPRITE_LIFT_METERS)
        this.scene.add(sprite)
      })
    }
  }

  /** A D.520 on each stand, nose to the north and tail down, as the flat map draws it; the models are made as needed and the ones left over are hidden. */
  private showParked(): void {
    this.parkedStands.forEach((stand, index) => {
      const model = this.parkedModels[index] ?? this.createParkedModel()
      const center = tileCenterOf(this.runway, stand.row, stand.column)
      model.object.visible = true
      model.setState(PARKED_STATE)
      this.place(model, center.x, center.y, 0, NORTH_HEADING_RADIANS, D520_GROUND_PITCH_RADIANS, 0)
      model.update(0)
    })
    this.parkedModels.slice(this.parkedStands.length).forEach((model) => {
      model.object.visible = false
    })
  }

  private createParkedModel(): D520Model {
    const model = new D520Model()
    model.object.scale.setScalar(this.scale)
    const texture = this.parkedLiveries.get('french')
    if (texture !== undefined) {
      model.setLivery(texture)
    }
    this.scene.add(model.object)
    this.parkedModels.push(model)
    return model
  }

  /** Places the camera above the middle of the base, high enough for the whole of it to fill the canvas as the flat map does. */
  private fitCamera(): void {
    fitToContainer(this.renderer, this.camera, this.container)
    const halfViewHeight = Math.tan(THREE.MathUtils.degToRad(CAMERA_FIELD_OF_VIEW_DEGREES / 2))
    const columnCount = this.plan.tiles[0].length
    const rowCount = this.plan.tiles.length
    const heightForWidth = (columnCount * TILE_SIZE_METERS) / 2 / (halfViewHeight * this.camera.aspect)
    const heightForHeight = (rowCount * TILE_SIZE_METERS) / 2 / halfViewHeight
    const centerX = ((columnCount / 2 - this.runway.firstColumn) * TILE_SIZE_METERS)
    const centerY = (this.runway.row - (rowCount - 1) / 2) * TILE_SIZE_METERS
    this.topPosition.set(centerX, centerY, Math.max(heightForWidth, heightForHeight))
  }

  /** Where an aircraft of a group stands on the runway: the rear one at the start, the others each a step further. */
  private slotX(slot: number): number {
    return REAR_SLOT_X_METERS + this.gapMeters * slot
  }

  /** The taxiways to the junction and along the runway to a place of the line; a place beyond the junction is reached from the north, over the grass. */
  private taxiPathFrom(stand: Cell, slot: number): TaxiPath {
    const steps = findPath(this.plan, stand, { row: this.runway.row, column: this.runway.entryColumn })
    const junctionX = tileCenterOf(this.runway, this.runway.row, this.runway.entryColumn).x
    const slotX = this.slotX(slot)
    const isBeyondJunction = slotX > junctionX + JUNCTION_CLEARANCE_METERS
    const points: THREE.Vector2[] = []
    for (const step of steps) {
      if (!isBeyondJunction || step.cell.row < this.runway.row - 1) {
        points.push(tileCenterOf(this.runway, step.cell.row, step.cell.column))
      }
    }
    if (isBeyondJunction) {
      points.push(new THREE.Vector2(slotX, NORTH_APPROACH_METERS))
    }
    points.push(new THREE.Vector2(slotX, 0))
    return new TaxiPath(points)
  }

  private acquireModel(tailNumber: number): D520Model {
    const model = this.idleModels.pop() ?? this.createModel()
    model.repair()
    model.setTailNumber(tailNumber)
    model.object.visible = true
    return model
  }

  private createModel(): D520Model {
    const model = new D520Model()
    model.object.scale.setScalar(this.scale)
    const texture = this.liveries.get('french')
    if (texture !== undefined) {
      model.setLivery(texture)
    }
    this.scene.add(model.object)
    this.models.push(model)
    return model
  }

  private renderFrame(): void {
    const seconds = this.secondsNow()
    const deltaSeconds = seconds - this.previousSeconds
    this.previousSeconds = seconds
    for (let index = this.departing.length - 1; index >= 0; index -= 1) {
      const aircraft = this.departing[index]
      const { group, slot } = aircraft.assignment
      if (seconds - group.startSecondsOf(slot) >= this.flight.durationSeconds) {
        aircraft.model.object.visible = false
        this.idleModels.push(aircraft.model)
        this.departing.splice(index, 1)
        this.onDeparted(aircraft.aircraftId)
        continue
      }
      this.move(aircraft, seconds)
      aircraft.model.update(deltaSeconds)
    }
    for (let index = this.landing.length - 1; index >= 0; index -= 1) {
      const aircraft = this.landing[index]
      if (this.moveLanding(aircraft, seconds)) {
        aircraft.model.object.visible = false
        this.idleModels.push(aircraft.model)
        this.landing.splice(index, 1)
        this.onLanded(aircraft.aircraftId)
        continue
      }
      aircraft.model.update(deltaSeconds)
    }
    for (let index = this.emerging.length - 1; index >= 0; index -= 1) {
      const aircraft = this.emerging[index]
      if (this.moveEmerging(aircraft, seconds)) {
        aircraft.model.object.visible = false
        this.idleModels.push(aircraft.model)
        this.emerging.splice(index, 1)
        this.onLanded(aircraft.aircraftId)
        continue
      }
      aircraft.model.update(deltaSeconds)
    }
    this.placeCamera(seconds)
    this.renderer.render(this.scene, this.camera)
  }

  /** Moves an aircraft that comes out of the hangar; true once it has reached its stand. */
  private moveEmerging(aircraft: EmergingAircraft, seconds: number): boolean {
    const distance = (seconds - aircraft.startSeconds) * HANGAR_TAXI_SPEED_METERS_PER_SECOND
    if (distance >= aircraft.path.lengthMeters) {
      return true
    }
    const place = aircraft.path.pointAt(distance)
    aircraft.model.object.visible = true
    aircraft.model.setState({ engine: TAXI_ENGINE, gearRetraction: 0, flaps: 1, wheels: TAXI_WHEELS, aileron: 0, rudder: 0, elevator: 0 })
    this.place(aircraft.model, place.x, place.y, 0, aircraft.path.headingAt(distance, HEADING_SPAN_METERS), D520_GROUND_PITCH_RADIANS, 0)
    return false
  }

  /** Moves a landing aircraft; true once it has reached its stand. It stays out of sight until its turn to come in. */
  private moveLanding(aircraft: LandingAircraft, seconds: number): boolean {
    const elapsedSeconds = seconds - aircraft.startSeconds
    if (elapsedSeconds < 0) {
      return false
    }
    aircraft.model.object.visible = true
    if (elapsedSeconds < this.landingFlight.durationSeconds) {
      const pose = this.landingFlight.pose(elapsedSeconds)
      aircraft.model.setState(pose.state)
      this.place(aircraft.model, pose.x, pose.y, pose.altitude, pose.heading, pose.pitch, pose.roll)
      return false
    }
    const distance = (elapsedSeconds - this.landingFlight.durationSeconds) * LANDED_TAXI_SPEED_METERS_PER_SECOND
    if (distance >= aircraft.path.lengthMeters) {
      return true
    }
    const place = aircraft.path.pointAt(distance)
    aircraft.model.setState({ engine: TAXI_ENGINE, gearRetraction: 0, flaps: 1, wheels: TAXI_WHEELS, aileron: 0, rudder: 0, elevator: 0 })
    this.place(aircraft.model, place.x, place.y, 0, aircraft.path.headingAt(distance, HEADING_SPAN_METERS), D520_GROUND_PITCH_RADIANS, 0)
    return false
  }

  /** On its way to its place in the line, or in its place and then in flight, where each aircraft follows the lead a little behind it. */
  private move(aircraft: DepartingAircraft, seconds: number): void {
    const { assignment, model, path } = aircraft
    if (seconds < assignment.arrivalSeconds) {
      model.setState({ engine: TAXI_ENGINE, gearRetraction: 0, flaps: 1, wheels: TAXI_WHEELS, aileron: 0, rudder: 0, elevator: 0 })
      const taxiedSeconds = seconds - aircraft.startSeconds
      if (taxiedSeconds < aircraft.taxiSeconds) {
        const distance = (path.lengthMeters * taxiedSeconds) / aircraft.taxiSeconds
        const place = path.pointAt(distance)
        this.place(model, place.x, place.y, 0, path.headingAt(distance, HEADING_SPAN_METERS), D520_GROUND_PITCH_RADIANS, 0)
        return
      }
      const place = path.pointAt(path.lengthMeters)
      const turned = turnBetween(aircraft.endHeading, 0) * smoothStep(aircraft.taxiSeconds, aircraft.taxiSeconds + PIVOT_SECONDS, taxiedSeconds)
      this.place(model, place.x, place.y, 0, aircraft.endHeading + turned, D520_GROUND_PITCH_RADIANS, 0)
      return
    }
    const { group, slot } = assignment
    const pose = this.flight.pose(seconds - group.startSecondsOf(slot), this.slotX(group.size - 1))
    const behind = this.gapMeters * (group.size - 1 - slot)
    model.setState(pose.state)
    this.place(model, pose.x - Math.cos(pose.heading) * behind, pose.y - Math.sin(pose.heading) * behind, pose.altitude, pose.heading, pose.pitch, pose.roll)
  }

  private place(model: D520Model, x: number, y: number, altitude: number, heading: number, pitch: number, roll: number): void {
    const scale = this.scale * (1 + ALTITUDE_GROWTH_PER_METER * altitude)
    model.object.scale.setScalar(scale)
    model.object.position.set(x, y, d520AxisHeightOnGround(pitch) * scale + altitude)
    model.object.rotation.set(pitch, roll, heading - NOSE_ALONG_Y_ROTATION_RADIANS, 'ZXY')
  }

  /** Above the base looking down; once a lead is in the air, swinging in front of it and a little above, looking back at it, then back above the base. */
  private placeCamera(seconds: number): void {
    let share = 0
    let lead: D520Model | undefined
    for (const aircraft of this.departing) {
      const { group, slot } = aircraft.assignment
      if (slot === group.size - 1) {
        const leadShare = this.flight.frontViewShare(seconds - group.startSecondsOf(slot))
        if (leadShare > share) {
          share = leadShare
          lead = aircraft.model
        }
      }
    }
    if (lead === undefined) {
      this.camera.position.copy(this.topPosition)
      this.camera.quaternion.copy(this.topOrientation)
      return
    }
    const heading = lead.object.rotation.z + NOSE_ALONG_Y_ROTATION_RADIANS
    this.frontPosition.set(
      lead.object.position.x + Math.cos(heading) * REAL_FRONT_DISTANCE_METERS * this.scale,
      lead.object.position.y + Math.sin(heading) * REAL_FRONT_DISTANCE_METERS * this.scale,
      lead.object.position.z + REAL_FRONT_HEIGHT_METERS * this.scale,
    )
    this.lookMatrix.lookAt(this.frontPosition, lead.object.position, WORLD_UP)
    this.frontOrientation.setFromRotationMatrix(this.lookMatrix)
    this.camera.position.lerpVectors(this.topPosition, this.frontPosition, share)
    this.camera.quaternion.slerpQuaternions(this.topOrientation, this.frontOrientation, share)
  }
}
