import { describe, expect, it } from 'vitest'

import { STORAGE_KEY } from '@/lib/storage'
import { renderApp, screen, sidebarNav, userEvent, within } from '@/test/test-utils'

function headingSection(name: string | RegExp): HTMLElement {
  const heading = screen.getByRole('heading', { name })
  const section = heading.closest('section')
  if (section === null) throw new Error(`No <section> wraps the "${name}" heading.`)
  return section
}

function recentCardNames(): readonly string[] {
  return within(headingSection(/^Recent tools/))
    .getAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent ?? '')
}

describe('tool preferences', () => {
  it('persists a favorite and reflects favoriting and the MRU recents order', async () => {
    const user = userEvent.setup()

    renderApp({ route: '/tools/json-formatter' })
    await screen.findByRole('heading', { level: 1, name: 'JSON Formatter' })
    await user.click(screen.getByRole('button', { name: 'Add to favorites' }))

    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '')
    expect(persisted).toMatchObject({ version: 1, favorites: ['json-formatter'] })

    await user.click(
      within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByRole('link', {
        name: 'Home',
      }),
    )

    const favorites = headingSection(/^Favorites/)
    expect(within(favorites).getByRole('heading', { name: 'JSON Formatter' })).toBeInTheDocument()
    expect(within(favorites).getByRole('link', { name: /^JSON Formatter/ })).toHaveAttribute(
      'href',
      '/tools/json-formatter',
    )
    expect(recentCardNames()).toEqual(['JSON Formatter'])

    await user.click(within(sidebarNav()).getByRole('link', { name: 'SHA Hash Generator' }))
    await screen.findByRole('heading', { level: 1, name: 'SHA Hash Generator' })
    await user.click(
      within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByRole('link', {
        name: 'Home',
      }),
    )

    expect(recentCardNames()).toEqual(['SHA Hash Generator', 'JSON Formatter'])
    expect(within(headingSection(/^Favorites/)).getAllByRole('heading', { level: 3 })).toHaveLength(1)

    await user.click(within(sidebarNav()).getByRole('link', { name: 'JSON Formatter' }))
    await screen.findByRole('heading', { level: 1, name: 'JSON Formatter' })
    await user.click(screen.getByRole('button', { name: 'Remove from favorites' }))
    await user.click(
      within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByRole('link', {
        name: 'Home',
      }),
    )

    expect(screen.queryByRole('heading', { name: /^Favorites/ })).not.toBeInTheDocument()
    expect(recentCardNames()).toEqual(['JSON Formatter', 'SHA Hash Generator'])
  })
})