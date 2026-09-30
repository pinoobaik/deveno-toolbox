import { useCallback, useEffect, useRef, useState } from 'react'

import { copyToClipboard } from './clipboard'
import type { CopyState } from '@/types/common'

const RESET_DELAY_MS = 2000

/**
 * Copy text to the clipboard and expose a short lived `copied` / `error` state
 * so the caller can render feedback without duplicating timers.
 */
export function useCopyToClipboard(resetDelayMs: number = RESET_DELAY_MS) {
  const [state, setState] = useState<CopyState>('idle')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  useEffect(() => clearTimer, [clearTimer])

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      clearTimer()
      const copied = await copyToClipboard(text)
      setState(copied ? 'copied' : 'error')

      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null
        setState('idle')
      }, resetDelayMs)

      return copied
    },
    [clearTimer, resetDelayMs],
  )

  return { copy, state }
}
