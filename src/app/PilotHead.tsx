import { useTranslation } from 'react-i18next'
import type { CockpitSight } from '../three/CockpitCombatScene'

// How far the head turns toward the enemy, and how far the eyes look: the head follows a third of the angle, up to a limit.
const HEAD_TURN_SHARE = 0.35
const MAX_HEAD_TURN_DEGREES = 30
const HEAD_RISE_PER_DEGREE = 0.18
const MAX_HEAD_RISE = 6
const EYE_REACH_DEGREES = 25
const EYE_REACH_X = 2.6
const EYE_REACH_Y = 1.8
// The enemy counts as ahead, and the head looks straight on, when it is within this many degrees of the nose both ways.
const AHEAD_DEGREES = 12
const BEHIND_DEGREES = 100

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

/** Which way the pilot has to turn to get the enemy in front of him. */
function directionOf(sight: CockpitSight): 'fire' | 'behind' | 'left' | 'right' | 'up' | 'down' | 'ahead' {
  if (sight.isInSight) {
    return 'fire'
  }
  if (Math.abs(sight.azimuthDegrees) > BEHIND_DEGREES) {
    return 'behind'
  }
  if (Math.abs(sight.azimuthDegrees) >= Math.abs(sight.elevationDegrees) && Math.abs(sight.azimuthDegrees) > AHEAD_DEGREES) {
    return sight.azimuthDegrees < 0 ? 'left' : 'right'
  }
  if (Math.abs(sight.elevationDegrees) > AHEAD_DEGREES) {
    return sight.elevationDegrees > 0 ? 'up' : 'down'
  }
  return 'ahead'
}

/**
 * The head of the pilot, as in Wings: it looks toward the enemy and turns to it, to tell the player which way to turn; once the enemy is in the gunsight it says to fire.
 */
function PilotHead({ sight }: { sight: CockpitSight }) {
  const { t } = useTranslation()
  const direction = directionOf(sight)
  const turn = clamp(sight.azimuthDegrees * HEAD_TURN_SHARE, -MAX_HEAD_TURN_DEGREES, MAX_HEAD_TURN_DEGREES)
  const rise = clamp(-sight.elevationDegrees * HEAD_RISE_PER_DEGREE, -MAX_HEAD_RISE, MAX_HEAD_RISE)
  const eyeX = clamp(sight.azimuthDegrees / EYE_REACH_DEGREES, -1, 1) * EYE_REACH_X
  const eyeY = clamp(-sight.elevationDegrees / EYE_REACH_DEGREES, -1, 1) * EYE_REACH_Y

  return (
    <div className="pilot-head" data-direction={direction}>
      <svg viewBox="0 0 100 100" role="img" aria-label={t(`combat.pilot.${direction}`)}>
        <circle cx="50" cy="50" r="48" className="pilot-head-frame" />
        <path d="M18 100c0-18 14-26 32-26s32 8 32 26z" className="pilot-head-overalls" />
        <g transform={`translate(0 ${rise}) rotate(${turn} 50 62)`}>
          <rect x="42" y="62" width="16" height="14" className="pilot-head-skin" />
          <ellipse cx="50" cy="48" rx="19" ry="22" className="pilot-head-skin" />
          <path d="M30 46c0-16 8-26 20-26s20 10 20 26c-4-6-10-9-20-9s-16 3-20 9z" className="pilot-head-cap" />
          <path d="M30 46c-3 6-3 16 0 22l5-3-1-17zM70 46c3 6 3 16 0 22l-5-3 1-17z" className="pilot-head-cap" />
          <rect x="31" y="34" width="38" height="5" className="pilot-head-strap" />
          <circle cx="41" cy="36.5" r="5" className="pilot-head-goggles" />
          <circle cx="59" cy="36.5" r="5" className="pilot-head-goggles" />
          <ellipse cx="42" cy="48" rx="4.6" ry="3.2" className="pilot-head-eye" />
          <ellipse cx="58" cy="48" rx="4.6" ry="3.2" className="pilot-head-eye" />
          <circle cx={42 + eyeX} cy={48 + eyeY} r="1.9" className="pilot-head-pupil" />
          <circle cx={58 + eyeX} cy={48 + eyeY} r="1.9" className="pilot-head-pupil" />
          <path d="M43 60q7 4 14 0" className="pilot-head-mouth" />
        </g>
      </svg>
      <span className="pilot-head-words">{t(`combat.pilot.${direction}`)}</span>
    </div>
  )
}

export default PilotHead
