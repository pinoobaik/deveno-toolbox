import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'

import { RelatedTools } from '@/components/tools/RelatedTools'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/cn'
import { useToolPreferences } from '@/lib/useToolPreferences'
import { buildToolBreadcrumbs } from '@/tools/breadcrumbs'
import { findCategory } from '@/tools/categories'
import type { ToolDefinition } from '@/types/tool'

interface ToolLayoutProps {
  tool: ToolDefinition
  /** Optional toolbar rendered under the tool header. */
  toolbar?: ReactNode
  children: ReactNode
  className?: string
}

const CATEGORY_CLASSES =
  'mt-2 inline-flex w-fit items-center gap-1.5 rounded-full border border-neutral-800 px-2.5 py-1 text-xs text-neutral-400 transition-colors hover:border-neutral-700 hover:text-neutral-100'

/**
 * Shared shell for every tool:
 *
 * 1. breadcrumb trail, so the tool is never an orphan URL,
 * 2. identity header -- icon, name, description, category, favorite,
 * 3. primary actions,
 * 4. the tool's own content,
 * 5. related tools.
 *
 * The slots are all optional except the content: a tool with no toolbar, a
 * category without a descriptor, or a catalog with nothing to relate to simply
 * renders less. That keeps this a layout rather than a configuration system --
 * there is no prop matrix, no render callback, and no context to thread
 * through. Everything is driven by the `ToolDefinition` it is handed.
 *
 * It knows nothing about any individual tool, so adding one needs no edit here.
 */
export function ToolLayout({ tool, toolbar, children, className }: ToolLayoutProps) {
  const Icon = tool.icon
  const category = findCategory(tool.category)
  const CategoryIcon = category?.icon
  const { isFavorite, toggleFavorite } = useToolPreferences()
  const favorited = isFavorite(tool.id)

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <Breadcrumbs items={buildToolBreadcrumbs(tool.id)} />

      <header className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-sky-400"
        >
          <Icon className="size-5" />
        </span>

        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-neutral-50">{tool.name}</h1>
          <p className="mt-1 text-sm text-neutral-400">{tool.description}</p>

          {category === undefined || CategoryIcon === undefined ? null : (
            <Link to={`/category/${category.id}`} className={CATEGORY_CLASSES}>
              <CategoryIcon aria-hidden="true" className="size-3.5" />
              {category.label}
            </Link>
          )}
        </div>

        <IconButton
          label={favorited ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={favorited}
          onClick={() => toggleFavorite(tool.id)}
          icon={
            <Star
              aria-hidden="true"
              className={cn('size-4', favorited && 'fill-current text-amber-400')}
            />
          }
          className="ml-auto shrink-0"
        />
      </header>

      {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}

      {children}

      <RelatedTools tool={tool} />
    </div>
  )
}
