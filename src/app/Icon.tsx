import { ICON_PATHS } from './iconPaths'
import type { IconName } from './iconPaths'

/** An icon, drawn in the colour of the text around it. It says nothing to a screen reader: whatever holds it carries the name. */
function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {ICON_PATHS[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  )
}

export default Icon
