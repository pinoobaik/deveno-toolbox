import { NavLink } from 'react-router-dom'

import { cn } from '@/lib/cn'
import { tools, type ToolEntry } from '@/tools/registry'

interface SidebarProps {
  className?: string
  /** Called after a link is activated, used to close the mobile drawer. */
  onNavigate?: () => void
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  return (
    <nav aria-label="Tools" className={cn('flex flex-col gap-4', className)}>
      <p className="px-3 text-xs font-semibold tracking-wider text-neutral-600 uppercase">
        Tools
      </p>

      <ul className="flex flex-col gap-1">
        {tools.map((tool) => (
          <li key={tool.id}>
            <SidebarLink tool={tool} onNavigate={onNavigate ?? undefined} />
          </li>
        ))}
      </ul>
    </nav>
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
