import { useRef } from "react"
import { heightFromDrag, heightFromKey, PANEL_HEIGHT_MIN_PX } from "@/lib/layout/panel-layout"

export interface HeightHandleProps {
  heightPx: number
  maxPx: number
  onCommit(height: number): void
  onReset(): void
}

/** Bottom-edge handle. A drag restyles the card directly and commits once, on release. */
export function HeightHandle({ heightPx, maxPx, onCommit, onReset }: HeightHandleProps) {
  const drag = useRef<{
    pointerId: number
    startY: number
    startHeight: number
    latestY: number
    frame: number
  } | null>(null)

  const finish = (clientY: number) => {
    const current = drag.current
    if (!current) return
    if (current.frame) cancelAnimationFrame(current.frame)
    drag.current = null
    onCommit(heightFromDrag(current.startHeight, current.startY, clientY, window.innerHeight))
  }

  return (
    <hr
      tabIndex={0}
      aria-orientation="horizontal"
      aria-label="Resize panel height"
      aria-valuemin={PANEL_HEIGHT_MIN_PX}
      aria-valuemax={maxPx}
      aria-valuenow={heightPx}
      aria-valuetext={`${heightPx} pixels`}
      title="Drag to change the height. Double-click to reset."
      className="absolute inset-x-0 bottom-0 z-30 m-0 h-[10px] w-auto cursor-row-resize touch-none appearance-none border-0 bg-transparent p-0 outline-none before:absolute before:inset-x-[16px] before:top-1/2 before:h-[2px] before:-translate-y-1/2 before:rounded-full before:bg-transparent before:transition-colors before:duration-150 before:content-[''] hover:before:bg-foreground/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:before:bg-foreground/55"
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = {
          pointerId: event.pointerId,
          startY: event.clientY,
          startHeight: heightPx,
          latestY: event.clientY,
          frame: 0,
        }
      }}
      onPointerMove={(event) => {
        const current = drag.current
        if (!current || event.pointerId !== current.pointerId) return
        current.latestY = event.clientY
        if (current.frame) return
        const handle = event.currentTarget
        current.frame = requestAnimationFrame(() => {
          const latest = drag.current
          if (!latest) return
          latest.frame = 0
          const next = heightFromDrag(
            latest.startHeight,
            latest.startY,
            latest.latestY,
            window.innerHeight,
          )
          handle.setAttribute("aria-valuenow", String(next))
          handle.setAttribute("aria-valuetext", `${next} pixels`)
          // WHY: restyle the card in place so a drag does not re-render the whole panel per frame.
          if (handle.parentElement) handle.parentElement.style.height = `${next}px`
        })
      }}
      onPointerUp={(event) => finish(event.clientY)}
      onPointerCancel={(event) => finish(event.clientY)}
      onDoubleClick={(event) => {
        event.preventDefault()
        onReset()
      }}
      onKeyDown={(event) => {
        const next = heightFromKey(heightPx, event.key, event.shiftKey, window.innerHeight)
        if (next === null) return
        event.preventDefault()
        onCommit(next)
      }}
    />
  )
}
