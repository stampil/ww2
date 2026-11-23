import { useTranslation } from 'react-i18next'
import { DETECTION_LIMIT, DETECTION_PER_TOWER, PHOTO_REQUIRED, PHOTO_TARGET_COUNT, ReconnaissanceScene } from '../three/ReconnaissanceScene'
import type { PhotoStatus } from '../three/ReconnaissanceScene'
import GroundRunWindow from './GroundRunWindow'
import type { GroundRunProps } from './GroundRunWindow'

const PERCENT = 100
const HINT_VALUES = { required: PHOTO_REQUIRED, total: PHOTO_TARGET_COUNT, percent: DETECTION_PER_TOWER }

/** A reconnaissance over enemy ground: the camera of the D.520 takes a photo of the target it holds, and each tower it flies over sees it, so that it is caught when the detection is full. */
function ReconnaissanceWindow(props: GroundRunProps) {
  const { t } = useTranslation()

  return (
    <GroundRunWindow<PhotoStatus>
      {...props}
      namespace="photo"
      hintValues={HINT_VALUES}
      createScene={(view, seed, shadowImage, livery, nationality, windSpeed, onStatus, onEnd) => new ReconnaissanceScene(view, seed, shadowImage, livery, nationality, windSpeed, onStatus, onEnd)}
      renderStatus={(status) => (
        <>
          <span>{t('photo.taken', { count: status.photos, total: PHOTO_TARGET_COUNT })}</span>
          <span>
            {t('photo.detection')}
            <span className="cockpit-lock" data-danger="true" aria-hidden="true">
              <span style={{ width: `${(status.detection / DETECTION_LIMIT) * PERCENT}%` }} />
            </span>
          </span>
        </>
      )}
    />
  )
}

export default ReconnaissanceWindow
