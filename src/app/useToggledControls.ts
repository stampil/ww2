import { useState } from 'react'

/** The controls that are on, toggled one at a time; each change is also passed on to the 3D scene. */
export function useToggledControls<Control extends string>(
  initialControls: readonly Control[],
  applyToScene: (control: Control, isActive: boolean) => void,
) {
  const [activeControls, setActiveControls] = useState<ReadonlySet<Control>>(new Set(initialControls))

  function toggle(control: Control): void {
    const nextControls = new Set(activeControls)
    const isActive = !nextControls.has(control)
    if (isActive) {
      nextControls.add(control)
    } else {
      nextControls.delete(control)
    }
    setActiveControls(nextControls)
    applyToScene(control, isActive)
  }

  return { activeControls, toggle }
}
