import type { ReactNode } from 'react'
import { ConfiguratorListItem } from './ConfiguratorListItem'

/**
 * Race / O.C.C. column: frozen header (placeholder + current selection) + scrollable catalog.
 */
export function ConfiguratorPinScrollColumn<T>({
  panel,
  morphus,
  placeholderLabel,
  placeholderSelected,
  onSelectPlaceholder,
  pinned,
  scrollItems,
  renderScrollItem,
  emptyScrollMessage,
  ariaLabel,
}: {
  panel: string
  morphus: boolean
  placeholderLabel: string
  placeholderSelected: boolean
  onSelectPlaceholder: () => void
  /** Frozen row for the active race or O.C.C. (null when placeholder only). */
  pinned: ReactNode | null
  scrollItems: readonly T[]
  renderScrollItem: (item: T) => ReactNode
  emptyScrollMessage?: ReactNode
  ariaLabel?: string
}) {
  const freezeBar = morphus
    ? 'border-violet-800/90 bg-slate-950'
    : 'border-slate-200 bg-white'

  return (
    <div
      className={`flex min-h-0 flex-col rounded-lg border-2 p-3 ${panel}`}
      aria-label={ariaLabel}
    >
      <div className="flex min-h-0 max-h-[28rem] flex-col overflow-hidden">
        <div
          className={`z-10 shrink-0 flex flex-col gap-2 border-b-2 border-dashed pb-2 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.15)] ${freezeBar}`}
        >
          <ConfiguratorListItem
            morphus={morphus}
            selected={placeholderSelected}
            tierResult={{ tier: 1 }}
            onSelect={onSelectPlaceholder}
          >
            <span className="text-sm font-semibold">{placeholderLabel}</span>
          </ConfiguratorListItem>
          {pinned}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="flex flex-col gap-2 py-2 pr-1">
            {scrollItems.length === 0 ? emptyScrollMessage : null}
            {scrollItems.map((item) => renderScrollItem(item))}
          </div>
        </div>
      </div>
    </div>
  )
}
