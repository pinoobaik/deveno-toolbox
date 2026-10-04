import { Link } from 'react-router-dom'

import { ToolCard } from '@/components/tools/ToolCard'
import { APP_NAME } from '@/lib/constants'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { tools } from '@/tools/registry'
import type { ToolCategory } from '@/types/tool'

const CATEGORY_LABELS: Record<ToolCategory, string> = {
  data: 'Data',
  developer: 'Developer',
}

const CATEGORY_ORDER: readonly ToolCategory[] = ['data', 'developer']

export function HomePage() {
  useDocumentTitle(APP_NAME)

  const featuredTool = tools[0]

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">{APP_NAME}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-neutral-400">
          A small set of focused utilities for everyday development work. Everything runs locally
          in your browser: no account, no server, no data leaves this page.
        </p>
      </section>

      <section aria-label="Available tools" className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-neutral-100">
          Available tools
          <span className="ml-2 text-xs font-normal text-neutral-500">{tools.length} total</span>
        </h2>

        <ul className="grid gap-3 sm:grid-cols-2">
          {tools.map((tool) => (
            <li key={tool.id}>
              <ToolCard tool={tool} />
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-neutral-100">Categories</h2>
        <ul className="flex flex-wrap gap-2 text-xs text-neutral-400">
          {CATEGORY_ORDER.map((category) => {
            const count = tools.filter((tool) => tool.category === category).length
            if (count === 0) return null

            return (
              <li key={category} className="rounded-full border border-neutral-800 px-2.5 py-1">
                {CATEGORY_LABELS[category]} · {count}
              </li>
            )
          })}
        </ul>
      </section>

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
