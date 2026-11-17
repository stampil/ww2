import * as THREE from 'three'
import { D520_SPAN_METERS, D520Model } from './D520Model'
import { LiveryTextures } from './liveries'
import { CAMERA_FIELD_OF_VIEW_DEGREES, OrbitViewScene } from './OrbitViewScene'
import type { OrbitView } from './OrbitViewScene'
import { createStaticEnemy } from './StaticEnemy'
import type { EnemyBody } from './StaticEnemy'
import { TileGround } from './TileGround'

/** Where an aircraft stands on the grid of a dogfight, and which way it points: 0 north, 1 east, 2 south, 3 west. */
type DuelPosition = { x: number; y: number; heading: number }
/** What the scene shows of a dogfight: where both aircraft are, and how it ended once it is over. */
export type DuelView = { player: DuelPosition; enemy: DuelPosition; outcome: 'won' | 'escaped' | null }

type Pose = { x: number; y: number; angle: number }

const CELL_METERS = 12
const ARENA_MARGIN = 1.1
const AIRCRAFT_ALTITUDE_METERS = 14
const FOLLOW_RATE_PER_SECOND = 5
const BANK_PER_RADIAN = 0.6
const MAX_BANK_RADIANS = 0.5
const GRID_COLOR = 0xffffff
const GRID_OPACITY = 0.25
const GRID_LIFT_METERS = 0.6
const CONE_COLOR = 0xe0382c
const CONE_OPACITY = 0.38
const CONE_LIFT_METERS = 0.8
const CONE_CELL_SHARE = 0.94
// The firing cone, as the rules have it: how far to either side of the line ahead it reaches, at one, two and three cells ahead.
const CONE_HALF_WIDTHS = [0, 1, 1]
// One cell ahead for each heading: north, east, south, west.
const AHEAD_BY_HEADING = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
]
const QUARTER_TURN_RADIANS = Math.PI / 2
const NOSE_ALONG_Y_ROTATION_RADIANS = Math.PI / 2
const BOMBER_SPAN_CELLS = 1.4
const FLYING = { engine: 1, gearRetraction: 1, flaps: 0, wheels: 0, aileron: 0, rudder: 0, elevator: 0 }

/** The enemy bombers the player can meet on the grid. */
export type DuelBomber = 'he111' | 'ju87'

/** The view from straight above, far enough for the whole grid to fill it. */
function viewFor(arenaSize: number): OrbitView {
  const halfFieldOfViewRadians = THREE.MathUtils.degToRad(CAMERA_FIELD_OF_VIEW_DEGREES / 2)
  const heightMeters = (arenaSize * CELL_METERS * ARENA_MARGIN) / 2 / Math.tan(halfFieldOfViewRadians)
  return { cameraStart: new THREE.Vector3(0, -1, heightMeters), target: new THREE.Vector3(0, 0, 0), farMeters: heightMeters * 4, isDraggable: false }
}

/** The shortest way round from one angle to another, in radians. */
function turnBetween(fromAngle: number, toAngle: number): number {
  return Math.atan2(Math.sin(toAngle - fromAngle), Math.cos(toAngle - fromAngle))
}

/**
 * A dogfight seen from straight above, on a grid of cells: the player's D.520 in French colors and an enemy bomber glide from cell to cell,
 * and the firing cone of the player shows in red. The bomber is blown up when it is shot down. Owns its WebGL canvas.
 */
export class DogfightScene extends OrbitViewScene {
  private readonly player = new D520Model()
  private readonly enemyRoot = new THREE.Group()
  private enemy: EnemyBody | undefined
  private readonly liveries: LiveryTextures
  private readonly playerPose: Pose = { x: 0, y: 0, angle: 0 }
  private readonly enemyPose: Pose = { x: 0, y: 0, angle: 0 }
  private readonly playerTarget: Pose = { x: 0, y: 0, angle: 0 }
  private readonly enemyTarget: Pose = { x: 0, y: 0, angle: 0 }
  private readonly coneCells: THREE.Mesh[] = []
  private hasView = false
  private isEnemyDestroyed = false

  constructor(
    container: HTMLElement,
    private readonly arenaSize: number,
    bomber: DuelBomber,
  ) {
    super(container, viewFor(arenaSize))
    this.liveries = new LiveryTextures(
      this.renderer.capabilities.getMaxAnisotropy(),
      (livery, texture) => {
        if (livery === 'french') {
          this.player.setLivery(texture)
        }
      },
      ['french'],
    )
    this.scene.add(new TileGround([[{ kind: 'grass', quarterTurns: 0 }]], () => new THREE.Vector2(0, 0), this.renderer.capabilities.getMaxAnisotropy()).object)
    this.addGrid()
    this.addCone()
    this.player.object.scale.setScalar(CELL_METERS / D520_SPAN_METERS)
    this.scene.add(this.player.object, this.enemyRoot)
    void createStaticEnemy(bomber).then((enemy) => {
      enemy.object.scale.setScalar((CELL_METERS * BOMBER_SPAN_CELLS) / enemy.spanMeters)
      this.enemyRoot.add(enemy.object)
      this.enemy = enemy
      if (this.isEnemyDestroyed) {
        enemy.destroy()
      }
    })
  }

  /** Where both aircraft go: they glide there, and the firing cone of the player moves with it. */
  setView(view: DuelView): void {
    this.targetOf(view.player, this.playerTarget)
    this.targetOf(view.enemy, this.enemyTarget)
    if (!this.hasView) {
      Object.assign(this.playerPose, this.playerTarget)
      Object.assign(this.enemyPose, this.enemyTarget)
      this.hasView = true
    }
    this.showCone(view.player)
    if (view.outcome === 'won' && !this.isEnemyDestroyed) {
      this.isEnemyDestroyed = true
      this.enemy?.destroy()
    }
  }

  dispose(): void {
    super.dispose()
    this.liveries.dispose()
  }

  protected advance(deltaSeconds: number): void {
    this.follow(this.playerPose, this.playerTarget, this.player.object, deltaSeconds)
    this.player.setState(FLYING)
    this.player.update(deltaSeconds)
    this.follow(this.enemyPose, this.enemyTarget, this.enemyRoot, deltaSeconds)
    this.enemy?.update(deltaSeconds)
  }

  private cellCenter(cell: number): number {
    return (cell - (this.arenaSize - 1) / 2) * CELL_METERS
  }

  private targetOf(position: DuelPosition, target: Pose): void {
    target.x = this.cellCenter(position.x)
    target.y = this.cellCenter(position.y)
    target.angle = QUARTER_TURN_RADIANS - position.heading * QUARTER_TURN_RADIANS
  }

  /** Moves the aircraft a part of the way to its target, banking it while it turns. */
  private follow(pose: Pose, target: Pose, object: THREE.Object3D, deltaSeconds: number): void {
    const share = Math.min(1, deltaSeconds * FOLLOW_RATE_PER_SECOND)
    const turn = turnBetween(pose.angle, target.angle)
    pose.x += (target.x - pose.x) * share
    pose.y += (target.y - pose.y) * share
    pose.angle += turn * share
    const roll = Math.min(Math.max(-turn * BANK_PER_RADIAN, -MAX_BANK_RADIANS), MAX_BANK_RADIANS)
    object.position.set(pose.x, pose.y, AIRCRAFT_ALTITUDE_METERS)
    object.rotation.set(0, roll, pose.angle - NOSE_ALONG_Y_ROTATION_RADIANS, 'ZXY')
  }

  private addGrid(): void {
    const grid = new THREE.GridHelper(this.arenaSize * CELL_METERS, this.arenaSize, GRID_COLOR, GRID_COLOR)
    grid.rotation.x = Math.PI / 2
    grid.position.z = GRID_LIFT_METERS
    const material = grid.material as THREE.LineBasicMaterial
    material.transparent = true
    material.opacity = GRID_OPACITY
    material.depthWrite = false
    this.scene.add(grid)
  }

  private addCone(): void {
    const geometry = new THREE.PlaneGeometry(CELL_METERS * CONE_CELL_SHARE, CELL_METERS * CONE_CELL_SHARE)
    const material = new THREE.MeshBasicMaterial({ color: CONE_COLOR, transparent: true, opacity: CONE_OPACITY, depthWrite: false })
    for (const halfWidth of CONE_HALF_WIDTHS) {
      for (let place = 0; place < 2 * halfWidth + 1; place += 1) {
        const cell = new THREE.Mesh(geometry, material)
        cell.position.z = CONE_LIFT_METERS
        this.coneCells.push(cell)
        this.scene.add(cell)
      }
    }
  }

  /** The cells straight ahead of the aircraft, as far as the rules reach, left out where they fall off the grid. */
  private showCone(position: DuelPosition): void {
    const [aheadX, aheadY] = AHEAD_BY_HEADING[position.heading]
    const [rightX, rightY] = AHEAD_BY_HEADING[(position.heading + 1) % AHEAD_BY_HEADING.length]
    let next = 0
    CONE_HALF_WIDTHS.forEach((halfWidth, index) => {
      const distance = index + 1
      for (let side = -halfWidth; side <= halfWidth; side += 1) {
        const cellX = position.x + aheadX * distance + rightX * side
        const cellY = position.y + aheadY * distance + rightY * side
        const cell = this.coneCells[next]
        cell.visible = cellX >= 0 && cellX < this.arenaSize && cellY >= 0 && cellY < this.arenaSize
        cell.position.x = this.cellCenter(cellX)
        cell.position.y = this.cellCenter(cellY)
        next += 1
      }
    })
  }
}
