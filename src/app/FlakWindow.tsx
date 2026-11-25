import { useTranslation } from 'react-i18next'
import { FLAK_HITS_TO_DESTROY, FlakScene } from '../three/FlakScene'
import type { FlakStatus } from '../three/FlakScene'
import GroundRunWindow from './GroundRunWindow'
import type { GroundRunProps } from './GroundRunWindow'

const SECONDS_PER_MINUTE = 60
const HINT_VALUES = { destroyed: FLAK_HITS_TO_DESTROY }

/** The flak of an enemy camp: shells burst around the aircraft, each marked by a ring on the sky first, and the player steers out of them; the guns settle on an aircraft that holds its line. */
function FlakWindow(props: GroundRunProps) {
  const { t } = useTranslation()
  const shellsPerSecond = props.alert.flakShellsPerSecond!

  return (
    <GroundRunWindow<FlakStatus>
      {...props}
      namespace="flak"
      hintValues={HINT_VALUES}
      createScene={(view, seed, shadowImage, livery, nationality, windSpeed, onStatus, onEnd) => new FlakScene(view, seed, shadowImage, livery, nationality, windSpeed, shellsPerSecond, onStatus, onEnd)}
      renderStatus={(status) => {
        const secondsLeft = Math.ceil(status.secondsLeft)
        return (
          <>
            <span>{t('flak.hits', { count: status.hits, total: FLAK_HITS_TO_DESTROY })}</span>
            <span>{`${Math.floor(secondsLeft / SECONDS_PER_MINUTE)}:${String(secondsLeft % SECONDS_PER_MINUTE).padStart(2, '0')}`}</span>
          </>
        )
      }}
    />
  )
}

export default FlakWindow
