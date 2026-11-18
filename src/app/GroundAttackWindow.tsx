import { useTranslation } from 'react-i18next'
import { GroundAttackScene, STRAFE_REQUIRED_DESTROYED, STRAFE_VEHICLE_COUNT } from '../three/GroundAttackScene'
import type { StrafeStatus } from '../three/GroundAttackScene'
import GroundRunWindow from './GroundRunWindow'
import type { GroundRunProps } from './GroundRunWindow'

const SECONDS_PER_MINUTE = 60
const HINT_VALUES = { required: STRAFE_REQUIRED_DESTROYED, total: STRAFE_VEHICLE_COUNT }

/** A strafing run over a German convoy: the guns of the D.520 fire by themselves at what is ahead, and the player steers. */
function GroundAttackWindow(props: GroundRunProps) {
  const { t } = useTranslation()

  return (
    <GroundRunWindow<StrafeStatus>
      {...props}
      namespace="strafe"
      hintValues={HINT_VALUES}
      createScene={(view, seed, shadowImage, onStatus, onEnd) => new GroundAttackScene(view, seed, shadowImage, onStatus, onEnd)}
      renderStatus={(status) => {
        const secondsLeft = Math.ceil(status.secondsLeft)
        return (
          <>
            <span>{t('strafe.destroyed', { count: status.destroyed, total: STRAFE_VEHICLE_COUNT, required: STRAFE_REQUIRED_DESTROYED })}</span>
            <span>{`${Math.floor(secondsLeft / SECONDS_PER_MINUTE)}:${String(secondsLeft % SECONDS_PER_MINUTE).padStart(2, '0')}`}</span>
          </>
        )
      }}
    />
  )
}

export default GroundAttackWindow
