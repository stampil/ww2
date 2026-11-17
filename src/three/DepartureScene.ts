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
import { DepartureFlight } from './departureFlight'
import { DepartureQueue } from './departureQueue'
import type { Assignment } from './departureQueue'
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
const PARKED_LIFT_METERS = 0.5
// The aircraft in front of which the camera swings, as in the takeoff of the home page, in meters for the real aircraft.
const REAL_FRONT_DISTANCE_METERS = 18
const REAL_FRONT_HEIGHT_METERS = 8
// The aircraft in a group stand this far apart for the real aircraft, and the lead stands this far ahead of the junction where all come onto the runway.
const REAL_FORMATION_GAP_METERS = 12
const ENTRY_CLEARANCE_METERS = 40
const TAXI_SPEED_METERS_PER_SECOND = 30
const HEADING_SPAN_METERS = 8
const TAXI_ENGINE = 0.35
const TAXI_WHEELS = 0.4
const MARGIN_METERS = 300
const MARGIN_BUSH_COUNT = 160
const MARGIN_BUSH_WIDTH_METERS = { min: 10, max: 18 }
const MARGIN_SEED = 1940
const FULL_TURN_DEGREES = 360
const DEGREES = Math.PI / 180

type DepartingAircraft = {
  aircraftId: number
  model: D520Model
  assignment: Assignment
  path: TaxiPath
  startSeconds: number
  taxiSeconds: number
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

/** Draws the base again in 3D over its flat map, the same size and seen from the same place, for the aircraft to take off from it. */
export type DepartureSceneOptions = {
  /** The picture of an aircraft seen from above, as the flat map draws the aircraft parked, and how wide it is there, in tiles. */
  aircraftSprite: string
  aircraftWidthTiles: number
}

/**
 * The squadron taking off over the base, which fills the canvas as the flat map does: each group waits on the runway, one aircraft behind
 * the other, then rolls off, climbs, turns back and flies off; the camera swings in front of the lead in the air, then back above the base. Owns its WebGL canvas.
 */
export class DepartureScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(CAMERA_FIELD_OF_VIEW_DEGREES, 1, CAMERA_NEAR_METERS, CAMERA_FAR_METERS)
  private readonly resizeObserver: ResizeObserver
  private readonly runway: PlanRunway
  private readonly scale: number
  private readonly gapMeters: number
  private readonly leadX: number
  private readonly flight: DepartureFlight
  private readonly queue = new DepartureQueue()
  private readonly models: D520Model[] = []
  private readonly idleModels: D520Model[] = []
  private readonly departing: DepartingAircraft[] = []
  private readonly liveries: LiveryTextures
  private readonly parked = new THREE.Group()
  private readonly topPosition = new THREE.Vector3()
  private readonly frontPosition = new THREE.Vector3()
  private readonly lookMatrix = new THREE.Matrix4()
  private readonly topOrientation = new THREE.Quaternion()
  private readonly frontOrientation = new THREE.Quaternion()
  private readonly startMilliseconds = performance.now()
  private parkedStands: Cell[] = []
  private parkedTexture: THREE.Texture | undefined
  private previousSeconds = 0

  constructor(
    private readonly container: HTMLElement,
    private readonly plan: TerrainPlan,
    private readonly options: DepartureSceneOptions,
    private readonly onDeparted: (aircraftId: number) => void,
  ) {
    this.runway = runwayOf(plan)
    this.scale = (options.aircraftWidthTiles * TILE_SIZE_METERS) / D520_SPAN_METERS
    this.gapMeters = REAL_FORMATION_GAP_METERS * this.scale
    this.leadX = tileCenterOf(this.runway, this.runway.row, this.runway.entryColumn).x + 2 * this.gapMeters + ENTRY_CLEARANCE_METERS
    this.flight = new DepartureFlight(this.leadX)
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
    this.addBuildings()
    this.scene.add(this.parked)
    new THREE.TextureLoader().load(options.aircraftSprite, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace
      this.parkedTexture = texture
      this.showParked()
    })
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
  depart(aircraftId: number, stand: Cell): void {
    const startSeconds = this.secondsNow()
    const leadPath = this.taxiPathFrom(stand, 0)
    const naturalArrivalSeconds = startSeconds + leadPath.lengthMeters / TAXI_SPEED_METERS_PER_SECOND
    const assignment = this.queue.join(startSeconds, naturalArrivalSeconds)
    const path = assignment.slot === 0 ? leadPath : this.taxiPathFrom(stand, assignment.slot)
    this.departing.push({
      aircraftId,
      model: this.acquireModel(),
      assignment,
      path,
      startSeconds,
      taxiSeconds: assignment.arrivalSeconds - startSeconds,
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

  private showParked(): void {
    this.parked.clear()
    if (this.parkedTexture === undefined) {
      return
    }
    const image = this.parkedTexture.image as HTMLImageElement
    const widthMeters = this.options.aircraftWidthTiles * TILE_SIZE_METERS
    const geometry = new THREE.PlaneGeometry(widthMeters, (widthMeters * image.height) / image.width)
    const material = new THREE.MeshBasicMaterial({ map: this.parkedTexture, transparent: true })
    for (const stand of this.parkedStands) {
      const center = tileCenterOf(this.runway, stand.row, stand.column)
      const picture = new THREE.Mesh(geometry, material)
      picture.position.set(center.x, center.y, PARKED_LIFT_METERS)
      this.parked.add(picture)
    }
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

  /** The taxiways to the junction, along the runway, and to a place of the line: the lead stands at the front, the others behind. */
  private taxiPathFrom(stand: Cell, slot: number): TaxiPath {
    const steps = findPath(this.plan, stand, { row: this.runway.row, column: this.runway.entryColumn })
    const points: THREE.Vector2[] = []
    for (const step of steps) {
      points.push(tileCenterOf(this.runway, step.cell.row, step.cell.column))
    }
    points.push(new THREE.Vector2(this.leadX - this.gapMeters * slot, 0))
    return new TaxiPath(points)
  }

  private acquireModel(): D520Model {
    const model = this.idleModels.pop() ?? this.createModel()
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
    this.placeCamera(seconds)
    this.renderer.render(this.scene, this.camera)
  }

  /** On its way to its place in the line, or in its place and then in flight, where each aircraft follows the lead a little behind it. */
  private move(aircraft: DepartingAircraft, seconds: number): void {
    const { assignment, model, path } = aircraft
    if (seconds < assignment.arrivalSeconds) {
      model.setState({ engine: TAXI_ENGINE, gearRetraction: 0, flaps: 1, wheels: TAXI_WHEELS, aileron: 0, rudder: 0, elevator: 0 })
      const distance = (path.lengthMeters * (seconds - aircraft.startSeconds)) / aircraft.taxiSeconds
      const place = path.pointAt(distance)
      this.place(model, place.x, place.y, 0, path.headingAt(distance, HEADING_SPAN_METERS), D520_GROUND_PITCH_RADIANS, 0)
      return
    }
    const pose = this.flight.pose(seconds - assignment.group.startSecondsOf(assignment.slot))
    const behind = this.gapMeters * assignment.slot
    model.setState(pose.state)
    this.place(model, pose.x - Math.cos(pose.heading) * behind, pose.y - Math.sin(pose.heading) * behind, pose.altitude, pose.heading, pose.pitch, pose.roll)
  }

  private place(model: D520Model, x: number, y: number, altitude: number, heading: number, pitch: number, roll: number): void {
    model.object.position.set(x, y, d520AxisHeightOnGround(pitch) * this.scale + altitude)
    model.object.rotation.set(pitch, roll, heading - NOSE_ALONG_Y_ROTATION_RADIANS, 'ZXY')
  }

  /** Above the base looking down; once a lead is in the air, swinging in front of it and a little above, looking back at it, then back above the base. */
  private placeCamera(seconds: number): void {
    let share = 0
    let lead: D520Model | undefined
    for (const aircraft of this.departing) {
      if (aircraft.assignment.slot === 0) {
        const leadShare = this.flight.frontViewShare(seconds - aircraft.assignment.group.startSecondsOf(0))
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
