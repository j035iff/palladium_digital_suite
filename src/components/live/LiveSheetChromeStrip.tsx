import { ForgeNavigationBar } from '../forge/ForgeNavigationBar'
import { IdentityXpBar } from './IdentityXpBar'
import {
  buildLiveSheetOverlayTabViews,
  isLiveSheetOverlayTabId,
  type LiveSheetOverlayTabId,
} from '../../lib/liveSheetTabs'

type QuickRef = {
  hpCurrent: number
  hpMax: number
  sdcCurrent: number
  sdcMax: number
  ppeCurrent: number
  ppeMax: number
  showIsp: boolean
  ispCurrent: number
  ispMax: number
}

type Props = {
  morphusActive: boolean
  /** Dual-form only — omit entirely when false (no gap; Pillar 6). */
  supportsDualForm?: boolean
  onToggleForm?: () => void
  activeOverlayTabId: LiveSheetOverlayTabId | null
  onSelectOverlayTab: (id: LiveSheetOverlayTabId) => void
  quickRef: QuickRef
  vitalityFlash: 'damage' | 'heal' | 'none' | null
}

/**
 * Persistent Core strip: Stats/Saves/Skills/Abilities/Gear (+ optional Become
 * Morphus after Gear) + quick-ref pools + XP.
 * Identity Expand pushes this strip down (Visual Continuity).
 */
export function LiveSheetChromeStrip({
  morphusActive,
  supportsDualForm = false,
  onToggleForm,
  activeOverlayTabId,
  onSelectOverlayTab,
  quickRef,
  vitalityFlash,
}: Props) {
  const tabs = buildLiveSheetOverlayTabViews(activeOverlayTabId)

  return (
    <div
      className={`border-b-2 px-4 py-2 ${
        vitalityFlash === 'damage'
          ? 'pds-vitality-flash-damage'
          : vitalityFlash === 'heal'
            ? 'pds-vitality-flash-heal'
            : ''
      } ${
        morphusActive
          ? 'border-violet-700/80 bg-slate-950/95'
          : 'border-blue-200 bg-white/95'
      }`}
      aria-label="Sheet tools and quick reference"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <div className="min-w-0">
            <ForgeNavigationBar
              tabs={tabs}
              activeTabId={activeOverlayTabId ?? ''}
              singleRow
              ariaLabel="Character sheet overlays"
              onDarkSurface={morphusActive}
              onSelectTab={(id) => {
                if (isLiveSheetOverlayTabId(id)) onSelectOverlayTab(id)
              }}
            />
          </div>
          {supportsDualForm && onToggleForm ? (
            <button
              type="button"
              onClick={onToggleForm}
              className="shrink-0 rounded-full border-2 px-3 py-1 text-[10px] font-black uppercase tracking-wide outline-none ring-offset-2 focus-visible:ring-2"
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
        </div>
        <div
          className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border-2 px-3 py-1.5 font-mono text-xs font-bold tabular-nums ${
            morphusActive
              ? 'border-violet-500 bg-violet-950 text-violet-50'
              : 'border-blue-600 bg-blue-600 text-white'
          }`}
          aria-label="Quick reference pools"
        >
          <span title="Hit Points">
            HP {quickRef.hpCurrent}/{quickRef.hpMax}
          </span>
          <span title="Structural Damage Capacity">
            SDC {quickRef.sdcCurrent}/{quickRef.sdcMax}
          </span>
          <span title="P.P.E.">
            PPE {quickRef.ppeCurrent}/{quickRef.ppeMax}
          </span>
          {quickRef.showIsp ? (
            <span title="I.S.P.">
              ISP {quickRef.ispCurrent}/{quickRef.ispMax}
            </span>
          ) : null}
        </div>
        <div className="w-full min-w-[12rem] sm:ml-auto sm:w-auto sm:max-w-xs">
          <IdentityXpBar />
        </div>
      </div>
    </div>
  )
}
