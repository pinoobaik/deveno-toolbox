import { SearchX, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { CategoryNav } from '@/components/tools/CategoryNav'
import { ToolCard } from '@/components/tools/ToolCard'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton } from '@/components/ui/IconButton'
import { TextField } from '@/components/ui/TextField'
import { APP_NAME } from '@/lib/constants'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { categoriesWithTools, tools } from '@/tools/registry'
import { searchTools } from '@/tools/search'

/** Keeps a no-results message from echoing an unbounded query back to the page. */
const MAX_ECHOED_QUERY_LENGTH = 60

function displayQuery(query: string): string {
  const trimmed = query.trim()
  if (trimmed.length <= MAX_ECHOED_QUERY_LENGTH) return trimmed
  return `${trimmed.slice(0, MAX_ECHOED_QUERY_LENGTH - 1)}…`
}

/**
 * The catalog and its search box.
 *
 * The query lives in component state rather than a URL parameter: the category
 * is already carried by the `/category/:categoryId` route, and search is a
 * transient view of one page, so mirroring it into the URL would add a second
 * piece of state to keep in sync without making the result shareable in a way
 * anyone has asked for.
 */
export function HomePage() {
  useDocumentTitle(APP_NAME)

  const [query, setQuery] = useState('')

  const isFiltering = query.trim().length > 0
  const results = useMemo(() => searchTools(tools, query), [query])

  const featuredTool = tools[0]
  const populatedCategories = categoriesWithTools()

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">{APP_NAME}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-neutral-400">
          A small set of focused utilities for everyday development work. Everything runs locally
          in your browser: no account, no server, no data leaves this page.
        </p>
      </section>

      <div className="flex items-end gap-2">
        <TextField
          label="Search tools"
          type="text"
          placeholder="Name, description, or keyword"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          containerClassName="min-w-0 flex-1"
        />
        <IconButton
          label="Clear search"
          icon={<X className="size-4" aria-hidden="true" />}
          onClick={() => setQuery('')}
          disabled={query.length === 0}
        />
      </div>

      <section aria-label="Available tools" className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-neutral-100">
          Available tools
          <span className="ml-2 text-xs font-normal text-neutral-500">
            {isFiltering ? `${results.length} of ${tools.length}` : `${tools.length} total`}
          </span>
        </h2>

        {results.length === 0 ? (
          <EmptyState
            icon={<SearchX className="size-6" />}
            title="No tools match your search"
            description={`Nothing in the catalog matches “${displayQuery(query)}”. Try a shorter term, or clear the search to see everything again.`}
            action={<Button onClick={() => setQuery('')}>Clear search</Button>}
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {results.map((tool) => (
              <li key={tool.id}>
                <ToolCard tool={tool} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {populatedCategories.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-neutral-100">Categories</h2>
          <CategoryNav />
        </section>
      ) : null}

      {featuredTool === undefined ? null : (
        <p className="text-xs text-neutral-600">
          Looking for something specific? Pick a tool from the sidebar, or{' '}
          <Link to={`/tools/${featuredTool.id}`} className="text-sky-400 hover:text-sky-300">
            start with the {featuredTool.name}
          </Link>
          .
        </p>
      )}
    </div>
  )
}

export default HomePage
