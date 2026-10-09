import { NavLink } from 'react-router-dom'

import { cn } from '@/lib/cn'
import type { ToolCategoryDescriptor } from '@/tools/categories'
import {
  categoriesWithTools,
  countToolsByCategory,
  toolsInCategory,
  type ToolEntry,
} from '@/tools/registry'

interface SidebarProps {
  className?: string
  /** Called after a link is activated, used to close the mobile drawer. */
  onNavigate?: () => void
}

const CATEGORY_LINK_CLASSES =
  'flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors'
const CATEGORY_TOOL_LIST_CLASSES = 'flex flex-col gap-1 pl-3'

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const counts = countToolsByCategory()

  return (
    <nav aria-label="Tools" className={cn('flex flex-col gap-4', className)}>
      <p className="px-3 text-xs font-semibold tracking-wider text-neutral-600 uppercase">
        Tools
      </p>

      <ul className="flex flex-col gap-4">
        {categoriesWithTools().map((category) => (
          <SidebarCategory
            key={category.id}
            category={category}
            count={counts.get(category.id) ?? 0}
            onNavigate={onNavigate ?? undefined}
          />
        ))}
      </ul>
    </nav>
  )
}

interface SidebarCategoryProps {
  category: ToolCategoryDescriptor
  count: number
  onNavigate: (() => void) | undefined
}

/**
 * One group: a link to the category page, followed by the tools in it.
 * The nesting is a real nested list, so assistive technology sees the grouping
 * without needing heading levels that would run ahead of the page's `h1`.
 */
function SidebarCategory({ category, count, onNavigate }: SidebarCategoryProps) {
  const Icon = category.icon

  return (
    <li>
      <NavLink
        to={`/category/${category.id}`}
        end
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            CATEGORY_LINK_CLASSES,
            isActive ? 'text-sky-400' : 'text-neutral-500 hover:text-neutral-100',
          )
        }
      >
        {({ isActive }) => (
          <>
            <Icon
              className={cn('size-3.5 shrink-0', isActive ? 'text-sky-400' : 'text-neutral-600')}
              aria-hidden="true"
            />
            <span className="truncate">{category.label}</span>
            <span
              className={cn('ml-auto shrink-0 font-normal tabular-nums', isActive ? 'text-sky-500' : 'text-neutral-600')}
            >
              {count}
            </span>
          </>
        )}
      </NavLink>

      <ul className={CATEGORY_TOOL_LIST_CLASSES}>
        {toolsInCategory(category.id).map((tool) => (
          <li key={tool.id}>
            <SidebarLink tool={tool} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
    </li>
  )
}

interface SidebarLinkProps {
  tool: ToolEntry
  onNavigate: (() => void) | undefined
}

function SidebarLink({ tool, onNavigate }: SidebarLinkProps) {
  const Icon = tool.icon

  return (
    <NavLink
      to={`/tools/${tool.id}`}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
          isActive
            ? 'bg-neutral-800/80 font-medium text-neutral-50'
            : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn('size-4 shrink-0', isActive ? 'text-sky-400' : 'text-neutral-500')}
            aria-hidden="true"
          />
          <span className="truncate">{tool.name}</span>
        </>
      )}
    </NavLink>
  )
}
