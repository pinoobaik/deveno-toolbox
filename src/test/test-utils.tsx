import { render, screen, waitFor, within } from '@testing-library/react'
import type { RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { App } from '@/App'
import { STORAGE_KEY } from '@/lib/storage'

export { screen, userEvent, waitFor, within }

export interface RenderAppOptions {
  /** Initial route to render. Defaults to the home page. */
  route?: string
  /**
   * Optional raw value stored under the preferences key before the app reads
   * it. Only meaningful on the first render of a file: the preferences store
   * is a module-level singleton that reads storage once per test file.
   */
  storage?: string
}

/**
 * Renders the full app at `route` inside a memory router, so navigation,
 * lazy tool chunks, and the shared layout are all exercised together.
 */
export function renderApp(options: RenderAppOptions = {}): RenderResult {
  const { route = '/', storage } = options

  localStorage.clear()
  if (storage !== undefined) {
    localStorage.setItem(STORAGE_KEY, storage)
  }

  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  )
}

/** The sidebar's own navigation landmark, free of the main content's cards. */
export function sidebarNav(): HTMLElement {
  return screen.getByRole('navigation', { name: 'Tools' })
}