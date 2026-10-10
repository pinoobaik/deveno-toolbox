import { describe, expect, it } from 'vitest'

import { renderApp, screen, sidebarNav, userEvent, within } from '@/test/test-utils'

function headingSection(name: string | RegExp): HTMLElement {
  const heading = screen.getByRole('heading', { name })
  const section = heading.closest('section')
  if (section === null) throw new Error(`No <section> wraps the "${name}" heading.`)
  return section
}

describe('app shell', () => {
  it('renders the home page with the search box, catalog, and sidebar navigation', () => {
    renderApp()

    expect(
      screen.getByRole('heading', { level: 1, name: 'Dev Toolbox' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Search tools' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear search' })).toBeDisabled()

    const available = screen.getByRole('region', { name: 'Available tools' })
    expect(
      within(available).getByRole('heading', { name: 'Base64 Encoder & Decoder' }),
    ).toBeInTheDocument()
    expect(screen.getByText('15 total')).toBeInTheDocument()

    const sidebar = sidebarNav()
    expect(within(sidebar).getByRole('link', { name: /^Developer/ })).toBeInTheDocument()
    expect(
      within(sidebar).getByRole('link', { name: 'Regular Expression Tester' }),
    ).toBeInTheDocument()
  })

  it('searches by name and shows an empty state that clears back to the catalog', async () => {
    const user = userEvent.setup()
    renderApp()

    const search = screen.getByRole('textbox', { name: 'Search tools' })
    await user.type(search, 'hash')

    const available = screen.getByRole('region', { name: 'Available tools' })
    expect(within(available).getByRole('heading', { name: 'SHA Hash Generator' })).toBeInTheDocument()
    expect(
      within(available).queryByRole('heading', { name: 'Base64 Encoder & Decoder' }),
    ).not.toBeInTheDocument()

    await user.clear(search)
    await user.type(search, 'zzzz-no-tool')
    expect(within(available).getByText('No tools match your search')).toBeInTheDocument()
    expect(screen.getByText(/Nothing in the catalog matches/)).toBeInTheDocument()

    await user.click(within(available).getByRole('button', { name: 'Clear search' }))
    expect(
      within(available).getByRole('heading', { name: 'Base64 Encoder & Decoder' }),
    ).toBeInTheDocument()
    expect(screen.getByText('15 total')).toBeInTheDocument()
  })

  it('links categories from the home page and renders a category page', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(within(sidebarNav()).getByRole('link', { name: /^Developer/ }))

    expect(screen.getByRole('heading', { level: 1, name: 'Developer' })).toBeInTheDocument()
    expect(screen.getByText('3 tools')).toBeInTheDocument()

    const section = headingSection('Tools in this category')
    for (const tool of ['Regular Expression Tester', 'URL Parser', 'Cron Expression Parser']) {
      expect(within(section).getByRole('heading', { name: tool })).toBeInTheDocument()
      expect(
        within(section).getByRole('link', { name: new RegExp(`^${tool}`) }),
      ).toHaveAttribute('href', `/tools/${toolId(tool)}`)
    }
  })

  it('loads a tool through lazy Suspense with breadcrumbs, a favorite toggle, and related tools', async () => {
    const user = userEvent.setup()
    renderApp({ route: '/tools/json-formatter' })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'JSON Formatter' }),
    ).toBeInTheDocument()

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(breadcrumb).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(within(breadcrumb).getByRole('link', { name: 'Data & JSON' })).toBeInTheDocument()
    expect(within(breadcrumb).getByText('JSON Formatter')).toHaveAttribute('aria-current', 'page')

    const favorite = screen.getByRole('button', { name: 'Add to favorites' })
    expect(favorite).toHaveAttribute('aria-pressed', 'false')
    await user.click(favorite)
    expect(screen.getByRole('button', { name: 'Remove from favorites' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    const related = screen.getByRole('region', { name: /^Related tools/ })
    expect(within(related).getByRole('heading', { name: 'Base64 Encoder & Decoder' })).toBeInTheDocument()
  })

  it('renders the not-found page for unknown routes, categories, and tools', () => {
    renderApp({ route: '/nope' })
    expect(
      screen.getByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument()
  })

  it('renders the not-found page for an unknown category id', () => {
    renderApp({ route: '/category/nope' })
    expect(
      screen.getByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument()
  })

  it('renders the not-found page for an unknown tool id', async () => {
    renderApp({ route: '/tools/nope' })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Tool not found' }),
    ).toBeInTheDocument()
  })
})

function toolId(name: string): string {
  const known: Record<string, string> = {
    'Regular Expression Tester': 'regex-tester',
    'URL Parser': 'url-parser',
    'Cron Expression Parser': 'cron-parser',
  }
  return known[name] ?? name
}