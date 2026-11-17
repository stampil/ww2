import * as THREE from 'three'
import { findPath } from '../plans/pathfinding'
import { runwayOf } from '../plans/runway'
import type { PlanRunway } from '../plans/runway'
import type { Cell, TerrainPlan } from '../plans/terrainPlan'
import { TILE_SIZE_METERS } from './airfield'
import { Bushes } from './Bushes'
import type { BushPlacement } from './Bushes'
import { D520_GROUND_PITCH_RADIANS, d520AxisHeightOnGround, D520Model } from './D520Model'
import { DEPARTURE_START_X_METERS, DepartureFlight } from './departureFlight'
import { DepartureQueue } from './departureQueue'
import type { Assignment } from './departureQueue'
import { smoothStep } from './easing'
import { LiveryTextures } from './liveries'
import { createRenderer, disposeScene, fitToContainer } from './rendering'
import { SeededRandom } from './SeededRandom'
import { TaxiPath } from './TaxiPath'
import { TileGround, tileCenterOf } from './TileGround'

const CAMERA_FIELD_OF_VIEW_DEGREES = 30
const CAMERA_NEAR_METERS = 1
const CAMERA_FAR_METERS = 3000
// The ground the camera frames: the start of the runway, the roll, and the half turn on the far side of the runway.
const VIEW_CENTER = new THREE.Vector2(170, -85)
const VIEW_WIDTH_METERS = 440
const VIEW_HEIGHT_METERS = 330
// The average color of public/textures/herbe.png, for what lies beyond the grass plain.
const GRASS_COLOR = 0x6d7231
const LIGHT_COLOR = 0xffffff
const AMBIENT_LIGHT_INTENSITY = 1.3
const SUN_LIGHT_INTENSITY = 2.2
const SUN_POSITION = new THREE.Vector3(-30, 20, 60)
const NOSE_ALONG_Y_ROTATION_RADIANS = Math.PI / 2
const MILLISECONDS_PER_SECOND = 1000
// The aircraft is drawn larger than life so that it can be seen from so high; the distances between aircraft grow with it.
const AIRCRAFT_SCALE = 2.5
const REAL_FORMATION_BACK_METERS = 12
const REAL_FORMATION_SIDE_METERS = 9
const REAL_APPROACH_AHEAD_METERS = 14
const REAL_APPROACH_SIDE_METERS = 11
const TAXI_SPEED_METERS_PER_SECOND = 30
const HEADING_SPAN_METERS = 8
const PIVOT_SECONDS = 1
const TAXI_ENGINE = 0.35
const TAXI_WHEELS = 0.4
const MARGIN_METERS = 220
const MARGIN_BUSH_COUNT = 120
const MARGIN_BUSH_WIDTH_METERS = { min: 10, max: 18 }
const MARGIN_SEED = 1940
const FULL_TURN_DEGREES = 360
const DEGREES = Math.PI / 180

// Where each slot of a group stands, from the lead's place, in the frame of an aircraft heading east: x ahead, y to the left.
// After the lead come the right (south) and the left (north), a little behind, as the points of a triangle.
const SLOT_OFFSETS = [
  new THREE.Vector2(0, 0),
  new THREE.Vector2(-REAL_FORMATION_BACK_METERS * AIRCRAFT_SCALE, -REAL_FORMATION_SIDE_METERS * AIRCRAFT_SCALE),
  new THREE.Vector2(-REAL_FORMATION_BACK_METERS * AIRCRAFT_SCALE, REAL_FORMATION_SIDE_METERS * AIRCRAFT_SCALE),
]

type DepartingAircraft = {
  aircraftId: number
  model: D520Model
  assignment: Assignment
  path: TaxiPath
  startSeconds: number
  taxiSeconds: number
  endHeading: number
}

/** From one to the other heading, the short way round. */
function turnBetween(fromHeading: number, toHeading: number): number {
  return Math.atan2(Math.sin(toHeading - fromHeading), Math.cos(toHeading - fromHeading))
}

/** Bushes scattered on the grass around the plan, where the aircraft that fly off have room to go. */
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

/** The squadron taking off over the terrain plan of the base: each group waits in a triangle at the start of the runway, then rolls off. Owns its WebGL canvas. */
export class DepartureScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(CAMERA_FIELD_OF_VIEW_DEGREES, 1, CAMERA_NEAR_METERS, CAMERA_FAR_METERS)
  private readonly resizeObserver: ResizeObserver
  private readonly runway: PlanRunway
  private readonly flight = new DepartureFlight()
  private readonly queue = new DepartureQueue()
  private readonly models: D520Model[] = []
  private readonly idleModels: D520Model[] = []
  private readonly departing: DepartingAircraft[] = []
  private readonly liveries: LiveryTextures
  private readonly startMilliseconds = performance.now()
  private previousSeconds = 0

  constructor(
    private readonly container: HTMLElement,
    private readonly plan: TerrainPlan,
    private readonly onDeparted: (aircraftId: number) => void,
  ) {
    this.runway = runwayOf(plan)
    this.renderer = createRenderer(container, false)
    this.liveries = new LiveryTextures(this.renderer.capabilities.getMaxAnisotropy(), (livery, texture) => {
      if (livery === 'french') {
        this.models.forEach((model) => model.setLivery(texture))
      }
    })

    this.scene.background = new THREE.Color(GRASS_COLOR)
    const ground = new TileGround(plan.tiles, (row, column) => tileCenterOf(this.runway, row, column), this.renderer.capabilities.getMaxAnisotropy())
    this.scene.add(ground.object)
    this.scene.add(new Bushes(marginBushes(plan, this.runway)).object)
    this.scene.add(new THREE.AmbientLight(LIGHT_COLOR, AMBIENT_LIGHT_INTENSITY))
    const sun = new THREE.DirectionalLight(LIGHT_COLOR, SUN_LIGHT_INTENSITY)
    sun.position.copy(SUN_POSITION)
    this.scene.add(sun)

    this.resizeObserver = new ResizeObserver(() => this.fitCamera())
    this.resizeObserver.observe(container)
    this.fitCamera()
    this.renderer.setAnimationLoop(() => this.renderFrame())
  }

  /** Sends an aircraft from its stand to the start of the runway, to leave with the group that is waiting there, or with a new one. */
  depart(aircraftId: number, stand: Cell): void {
    const startSeconds = this.secondsNow()
    const leadPath = this.taxiPathFrom(stand, 0)
    const naturalArrivalSeconds = startSeconds + leadPath.lengthMeters / TAXI_SPEED_METERS_PER_SECOND + PIVOT_SECONDS
    const assignment = this.queue.join(startSeconds, naturalArrivalSeconds)
    const path = assignment.slot === 0 ? leadPath : this.taxiPathFrom(stand, assignment.slot)
    this.departing.push({
      aircraftId,
      model: this.acquireModel(),
      assignment,
      path,
      startSeconds,
      taxiSeconds: assignment.arrivalSeconds - PIVOT_SECONDS - startSeconds,
      endHeading: path.headingAt(path.lengthMeters, HEADING_SPAN_METERS),
    })
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null)
    this.resizeObserver.disconnect()
    disposeScene(this.scene, this.renderer)
    this.liveries.dispose()
  }

  private secondsNow(): number {
    return (performance.now() - this.startMilliseconds) / MILLISECONDS_PER_SECOND
  }

  /** Frames the ground the departures cover, whatever the shape of the canvas. */
  private fitCamera(): void {
    fitToContainer(this.renderer, this.camera, this.container)
    const halfViewHeight = Math.tan(THREE.MathUtils.degToRad(CAMERA_FIELD_OF_VIEW_DEGREES / 2))
    const heightForWidth = VIEW_WIDTH_METERS / 2 / (halfViewHeight * this.camera.aspect)
    const heightForHeight = VIEW_HEIGHT_METERS / 2 / halfViewHeight
    this.camera.position.set(VIEW_CENTER.x, VIEW_CENTER.y, Math.max(heightForWidth, heightForHeight))
  }

  /** The taxiways and the runway from the stand to the start of the runway, then to the slot: the others go round the lead. */
  private taxiPathFrom(stand: Cell, slot: number): TaxiPath {
    const steps = findPath(this.plan, stand, { row: this.runway.row, column: this.runway.firstColumn })
    const points: THREE.Vector2[] = []
    for (let index = 0; index < steps.length - 1; index += 1) {
      points.push(tileCenterOf(this.runway, steps[index].cell.row, steps[index].cell.column))
    }
    const slotPlace = new THREE.Vector2(DEPARTURE_START_X_METERS, 0).add(SLOT_OFFSETS[slot])
    if (slot > 0) {
      const side = Math.sign(SLOT_OFFSETS[slot].y)
      points.push(new THREE.Vector2(DEPARTURE_START_X_METERS + REAL_APPROACH_AHEAD_METERS * AIRCRAFT_SCALE, side * REAL_APPROACH_SIDE_METERS * AIRCRAFT_SCALE))
    }
    points.push(slotPlace)
    return new TaxiPath(points)
  }

  private acquireModel(): D520Model {
    const model = this.idleModels.pop() ?? this.createModel()
    model.object.visible = true
    return model
  }

  private createModel(): D520Model {
    const model = new D520Model()
    model.object.scale.setScalar(AIRCRAFT_SCALE)
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
    this.renderer.render(this.scene, this.camera)
  }

  /** On its way to the slot, turning round in it, or in its slot and then in flight, where the group has its triangle. */
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
    const pose = this.flight.pose(seconds - assignment.group.startSecondsOf(assignment.slot))
    const offset = SLOT_OFFSETS[assignment.slot]
    const cosine = Math.cos(pose.heading)
    const sine = Math.sin(pose.heading)
    model.setState(pose.state)
    this.place(model, pose.x + offset.x * cosine - offset.y * sine, pose.y + offset.x * sine + offset.y * cosine, pose.altitude, pose.heading, pose.pitch, pose.roll)
  }

  private place(model: D520Model, x: number, y: number, altitude: number, heading: number, pitch: number, roll: number): void {
    model.object.position.set(x, y, d520AxisHeightOnGround(pitch) * AIRCRAFT_SCALE + altitude)
    model.object.rotation.set(pitch, roll, heading - NOSE_ALONG_Y_ROTATION_RADIANS, 'ZXY')
  }
}
