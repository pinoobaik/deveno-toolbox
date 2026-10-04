import { useEffect } from 'react'

import { APP_NAME } from '@/lib/constants'

/**
 * Keeps `document.title` in sync with the mounted page. Each route owns its own
 * title so navigating between tools, the home page, and a missing URL all
 * report the correct name instead of a single mount-time value.
 */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} | ${APP_NAME}`
  }, [title])
}