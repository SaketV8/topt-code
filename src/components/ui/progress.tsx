import {useRef, type CSSProperties} from 'react'
import {Progress as ProgressPrimitive} from '@base-ui/react/progress'

import {cn} from '@/lib/utils'

// `value` is 0-100 and sets the (accessible) progress state.
//
// In countdown mode (`countdownMs` + `expiresAt`) the indicator shrinks from
// 100% to 0% via a pure-CSS animation, so it glides at 60fps instead of
// stepping with React's one-second tick. The animation is computed ONCE per
// mount from the real clock (not a React state), so re-renders — for the
// timer text or colour changes — never restart it and it stays in sync with
// wall-clock time. Remount the component (via a `key` on `expiresAt`) to begin
// the next window.
function Progress({
  value,
  className,
  indicatorClassName,
  countdownMs,
  expiresAt
}: {
  value: number
  className?: string
  indicatorClassName?: string
  countdownMs?: number
  expiresAt?: number
}) {
  const animated = countdownMs != null && expiresAt != null
  const styleRef = useRef<CSSProperties | null>(null)

  if (animated && styleRef.current === null) {
    const remaining = Math.max(0, Math.min(countdownMs, expiresAt - Date.now()))
    const elapsed = countdownMs - remaining

    styleRef.current = {
      animation: `totp-countdown ${countdownMs}ms linear forwards`,
      // Negative delay resumes the animation at the current point in the window.
      animationDelay: `-${elapsed}ms`
    }
  }

  const indicatorStyle: CSSProperties =
    animated && styleRef.current
      ? styleRef.current
      : {width: `${Math.max(0, Math.min(100, value))}%`}

  return (
    <ProgressPrimitive.Root
      value={value}
      className={cn(
        'bg-muted relative h-1.5 w-full overflow-hidden rounded-full',
        className
      )}
    >
      <ProgressPrimitive.Track className="h-full w-full">
        <ProgressPrimitive.Indicator
          className={cn(
            'bg-primary h-full rounded-full transition-colors',
            indicatorClassName
          )}
          style={indicatorStyle}
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

export {Progress}
