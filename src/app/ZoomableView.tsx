import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

const MIN_SCALE = 1
const MAX_SCALE = 3
// How much a turn of the wheel zooms: the scale is multiplied by e to the power of minus this, for each pixel of the turn.
const WHEEL_ZOOM_PER_PIXEL = 0.0015
// How far a finger must move before it drags the view and no longer taps what is under it.
const DRAG_THRESHOLD_PIXELS = 6
const PINCH_FINGERS = 2

type View = { scale: number; x: number; y: number }
type Finger = { x: number; y: number }

/** Keeps the content over the whole viewport, so that no empty edge shows, and the scale between its limits. */
function keptOver(view: View, width: number, height: number): View {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale))

  return { scale, x: Math.min(0, Math.max(width * (1 - scale), view.x)), y: Math.min(0, Math.max(height * (1 - scale), view.y)) }
}

/** The view zoomed by a factor around a point of the viewport, which stays where it is. */
function zoomedAround(view: View, factor: number, pointX: number, pointY: number, width: number, height: number): View {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale * factor))
  const applied = scale / view.scale

  return keptOver({ scale, x: pointX - (pointX - view.x) * applied, y: pointY - (pointY - view.y) * applied }, width, height)
}

function distanceBetween(first: Finger, second: Finger): number {
  return Math.hypot(first.x - second.x, first.y - second.y)
}

/**
 * Lets the content be zoomed with the wheel and with two fingers moving apart or together, and dragged once it is zoomed. A tap or a click goes through to what is under it;
 * a drag does not. Whatever the content draws in its own place stays right, since the zoom is only a transform of all of it.
 */
function ZoomableView({ children }: { children: ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<View>({ scale: MIN_SCALE, x: 0, y: 0 })
  const viewRef = useRef(view)
  const fingers = useRef(new Map<number, Finger>())
  const isDragging = useRef(false)

  function show(next: View): void {
    viewRef.current = next
    setView(next)
  }

  useEffect(() => {
    const viewport = viewportRef.current!
    const onWheel = (event: WheelEvent): void => {
      event.preventDefault()
      const box = viewport.getBoundingClientRect()
      show(zoomedAround(viewRef.current, Math.exp(-event.deltaY * WHEEL_ZOOM_PER_PIXEL), event.clientX - box.left, event.clientY - box.top, box.width, box.height))
    }
    // A listener of its own, because React's are passive and a wheel that zooms must not also scroll the page.
    viewport.addEventListener('wheel', onWheel, { passive: false })

    return () => viewport.removeEventListener('wheel', onWheel)
  }, [])

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>): void {
    const previous = fingers.current.get(event.pointerId)
    if (previous === undefined) {
      return
    }
    const box = event.currentTarget.getBoundingClientRect()
    const current = { x: event.clientX, y: event.clientY }
    const others = [...fingers.current.entries()].filter(([id]) => id !== event.pointerId).map(([, finger]) => finger)
    if (others.length === PINCH_FINGERS - 1) {
      const other = others[0]
      const factor = distanceBetween(current, other) / distanceBetween(previous, other)
      const middle = { x: (current.x + other.x) / 2 - box.left, y: (current.y + other.y) / 2 - box.top }
      isDragging.current = true
      event.currentTarget.setPointerCapture(event.pointerId)
      show(zoomedAround(viewRef.current, factor, middle.x, middle.y, box.width, box.height))
    } else if (viewRef.current.scale > MIN_SCALE) {
      const moved = Math.hypot(current.x - previous.x, current.y - previous.y)
      if (!isDragging.current && moved < DRAG_THRESHOLD_PIXELS) {
        return
      }
      isDragging.current = true
      event.currentTarget.setPointerCapture(event.pointerId)
      show(keptOver({ ...viewRef.current, x: viewRef.current.x + current.x - previous.x, y: viewRef.current.y + current.y - previous.y }, box.width, box.height))
    }
    fingers.current.set(event.pointerId, current)
  }

  function endGesture(event: React.PointerEvent<HTMLDivElement>): void {
    fingers.current.delete(event.pointerId)
    if (fingers.current.size === 0) {
      // The click that ends a drag comes right after this, and is dropped by onClickCapture.
      window.setTimeout(() => {
        isDragging.current = false
      })
    }
  }

  return (
    <div
      ref={viewportRef}
      className="zoom-viewport"
      data-zoomed={view.scale > MIN_SCALE}
      onPointerDown={(event) => fingers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })}
      onPointerMove={onPointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      onClickCapture={(event) => {
        if (isDragging.current) {
          event.stopPropagation()
        }
      }}
    >
      <div className="zoom-content" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
        {children}
      </div>
    </div>
  )
}

export default ZoomableView
