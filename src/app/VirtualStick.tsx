import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  /** Whether the stick gives left and right only, or up and down too. */
  axes: 'horizontal' | 'both'
  /** Called as the knob moves, with x and y each from -1 to 1 (right and up are positive), and with zeros once it is let go. */
  onChange: (x: number, y: number) => void
}

const CENTER = { x: 0, y: 0 }

/** The stick of a mini-game, under its view so that a thumb on it hides nothing of the game: the knob follows the finger or the mouse inside its base, and goes back to the middle when let go. */
function VirtualStick({ axes, onChange }: Props) {
  const { t } = useTranslation()
  const baseRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLSpanElement>(null)
  const [offset, setOffset] = useState(CENTER)

  function follow(event: ReactPointerEvent<HTMLDivElement>): void {
    const box = baseRef.current!.getBoundingClientRect()
    const knobSize = knobRef.current!.offsetWidth
    const reachX = (box.width - knobSize) / 2
    const reachY = (box.height - knobSize) / 2
    let x = (event.clientX - (box.left + box.width / 2)) / reachX
    let y = axes === 'both' ? -(event.clientY - (box.top + box.height / 2)) / reachY : 0
    const length = Math.hypot(x, y)
    if (length > 1) {
      x /= length
      y /= length
    }
    setOffset({ x: x * reachX, y: -y * reachY })
    onChange(x, y)
  }

  function release(): void {
    setOffset(CENTER)
    onChange(0, 0)
  }

  return (
    <div className="virtual-stick-bar">
      <div
        ref={baseRef}
        className="virtual-stick"
        data-axes={axes}
        role="group"
        aria-label={t('stick.label')}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          follow(event)
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            follow(event)
          }
        }}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <span ref={knobRef} className="virtual-stick-knob" style={{ transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }} />
      </div>
    </div>
  )
}

export default VirtualStick
