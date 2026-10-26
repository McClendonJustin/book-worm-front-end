import { useEffect, useState } from 'react'

// True once `active` has stayed true for `delayMs`; resets when it goes false.
export function useSlowNote(active, delayMs = 6000) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    if (!active) return undefined
    const t = setTimeout(() => setSlow(true), delayMs)
    return () => {
      clearTimeout(t)
      setSlow(false)
    }
  }, [active, delayMs])
  return active && slow
}
