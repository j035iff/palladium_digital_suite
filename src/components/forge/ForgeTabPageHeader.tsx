import type { ReactNode } from 'react'
import { useCharacter } from '../../context/CharacterContext'

export const FORGE_TAB_PAGE_HEADING_ID = 'forge-tab-page-heading'

export function ForgeTabPageHeader({
  title,
  actions,
}: {
  title: string
  actions?: ReactNode
}) {
  const { activeForm, supportsDualForm } = useCharacter()
  const morphus = supportsDualForm && activeForm === 'morphus'

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <h2
        id={FORGE_TAB_PAGE_HEADING_ID}
        className="min-w-0 text-sm font-semibold uppercase tracking-wide"
        style={{ color: morphus ? '#c4b5fd' : '#1e40af' }}
      >
        {title}
      </h2>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  )
}
