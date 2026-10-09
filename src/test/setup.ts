import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

/**
 * Runs after every test, in every environment (node and jsdom). Cleaning
 * between tests matters because the app's preference store is singleton
 * state, and the DOM tree must never leak across cases.
 */
afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.unstubAllGlobals()
})