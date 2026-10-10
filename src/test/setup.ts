import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

/**
 * Lazy tool chunks loaded through React Suspense can take longer than the
 * 1s default to resolve when several jsdom test files run in parallel, so
 * `findBy*`/`waitFor` queries get a more tolerant window.
 */
configure({ asyncUtilTimeout: 5000 })

/**
 * Runs after every test. Cleaning between tests matters because the app's
 * preference store is singleton state, and the DOM tree must never leak
 * across cases.
 */
afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.unstubAllGlobals()
})