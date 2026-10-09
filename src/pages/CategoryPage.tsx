import { SearchX } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { CategoryNav } from '@/components/tools/CategoryNav'
import { ToolCard } from '@/components/tools/ToolCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { findCategory } from '@/tools/categories'
import { toolsInCategory } from '@/tools/registry'

/**
 * `/category/:categoryId`.
 *
 * An unknown id renders the shared Not Found experience instead of throwing.
 * A known id with no tools is a real page with an empty state, because a
 * declared category is part of the roadmap even before it has tools.
 */
export function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>()
  const category = findCategory(categoryId)

  useDocumentTitle(category === undefined ? 'Page not found' : category.label)

  if (category === undefined) {
    return <NotFoundPage />
  }

  const categoryTools = toolsInCategory(category.id)
  const CategoryIcon = category.icon
  const toolWord = categoryTools.length === 1 ? 'tool' : 'tools'

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-md border border-neutral-800 bg-neutral-950 text-sky-400"
          >
            <CategoryIcon className="size-4.5" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">{category.label}</h1>
        </div>

        <p className="max-w-2xl text-sm leading-relaxed text-neutral-400">
          {category.description}
        </p>
        <p className="text-xs text-neutral-500">
          {categoryTools.length} {toolWord}
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-neutral-100">Tools in this category</h2>

        {categoryTools.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {categoryTools.map((tool) => (
              <li key={tool.id}>
                <ToolCard tool={tool} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<SearchX className="size-6" />}
            title="No tools here yet"
            description="This category is declared but has no tools to open. The full catalog is one click away."
            action={
              <Link
                to="/"
                className="inline-flex h-9 items-center rounded-md border border-neutral-800 px-3.5 text-sm text-neutral-200 transition-colors hover:border-neutral-700 hover:bg-neutral-900"
              >
                Back to all tools
              </Link>
            }
          />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-100">Browse all categories</h2>
        <CategoryNav showAll />
      </section>
    </div>
  )
}

export default CategoryPage
