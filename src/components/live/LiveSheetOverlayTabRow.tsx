import { ForgeNavigationBar } from '../forge/ForgeNavigationBar'
import {
  buildLiveSheetOverlayTabViews,
  isLiveSheetOverlayTabId,
  type LiveSheetOverlayTabId,
} from '../../lib/liveSheetTabs'

type Props = {
  morphusActive: boolean
  /** Dual-form only — omit entirely when false (no gap; Pillar 6). */
  supportsDualForm?: boolean
  onToggleForm?: () => void
  activeOverlayTabId: LiveSheetOverlayTabId | null
  onSelectOverlayTab: (id: LiveSheetOverlayTabId) => void
}

/**
 * Layer 1b — Identity…Gear pills centered under the identity stack.
 * Become Morphus/Facade sits far left (as left as Campaigns on Layer 2).
 */
export function LiveSheetOverlayTabRow({
  morphusActive,
  supportsDualForm = false,
  onToggleForm,
  activeOverlayTabId,
  onSelectOverlayTab,
}: Props) {
  const tabs = buildLiveSheetOverlayTabViews(activeOverlayTabId)

  return (
    <div className="relative mt-2.5 w-full" aria-label="Character sheet overlays">
      {supportsDualForm && onToggleForm ? (
        <button
          type="button"
          onClick={onToggleForm}
          className="absolute left-0 top-1/2 z-10 -translate-y-1/2 shrink-0 rounded-full border-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide outline-none ring-offset-2 focus-visible:ring-2"
          style={{
            borderColor: morphusActive ? '#fbbf24' : '#0f172a',
            backgroundColor: morphusActive ? '#4c1d95' : '#eff6ff',
            color: morphusActive ? '#fef9c3' : '#0f172a',
          }}
          aria-pressed={morphusActive}
          aria-label={
            morphusActive
              ? 'Become Facade: switch to human presentation'
              : 'Become Morphus: switch to morphus form'
          }
        >
          Become {morphusActive ? 'Facade' : 'Morphus'}
        </button>
      ) : null}
      <div className="flex min-w-0 justify-center px-2">
        <ForgeNavigationBar
          tabs={tabs}
          activeTabId={activeOverlayTabId ?? ''}
          singleRow
          align="center"
          availableTone="navy"
          ariaLabel="Character sheet overlays"
          onDarkSurface={morphusActive}
          onSelectTab={(id) => {
            if (isLiveSheetOverlayTabId(id)) onSelectOverlayTab(id)
          }}
        />
      </div>
    </div>
  )
}
