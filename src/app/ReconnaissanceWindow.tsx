import { useTranslation } from 'react-i18next'
import { DETECTION_LIMIT, PHOTO_REQUIRED, PHOTO_TARGET_COUNT, ReconnaissanceScene } from '../three/ReconnaissanceScene'
import type { PhotoStatus } from '../three/ReconnaissanceScene'
import GroundRunWindow from './GroundRunWindow'
import type { GroundRunProps } from './GroundRunWindow'

const PERCENT = 100
const HINT_VALUES = { required: PHOTO_REQUIRED, total: PHOTO_TARGET_COUNT }

/** A reconnaissance over enemy ground: the camera of the D.520 takes a photo of the target it holds, and the more it is seen, the closer it is to being caught. */
function ReconnaissanceWindow(props: GroundRunProps) {
  const { t } = useTranslation()

  return (
    <GroundRunWindow<PhotoStatus>
      {...props}
      namespace="photo"
      hintValues={HINT_VALUES}
      createScene={(view, seed, shadowImage, onStatus, onEnd) => new ReconnaissanceScene(view, seed, shadowImage, onStatus, onEnd)}
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
