import { ForgeNavigationBar } from '../forge/ForgeNavigationBar'
import {
  buildLiveSheetOverlayTabViews,
  isLiveSheetOverlayTabId,
  liveSheetModeLabel,
  type LiveSheetMode,
  type LiveSheetOverlayTabId,
} from '../../lib/liveSheetTabs'
import { formatLiveSheetVitalsChipParts } from '../../lib/liveSheetVitalsChrome'

type QuickRef = {
  hpCurrent: number
  hpMax: number
  sdcCurrent: number
  sdcMax: number
  ppeCurrent: number
  ppeMax: number
  showPpe: boolean
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
  sheetMode: LiveSheetMode
  onSelectSheetMode: (mode: LiveSheetMode) => void
  statusEffectsOpen: boolean
  onToggleStatusEffects: () => void
  quickRef: QuickRef
  vitalityFlash: 'damage' | 'heal' | 'none' | null
}

/**
 * Persistent Core Layers 1b–2:
 * - Tab row: optional Become Morphus (far left) · Identity…Gear
 * - Layer 2: Campaigns | Combat · Status Effects stub · vitals chip
 * TABLE/Join and XP moved to Layer 1 tools / Level badge.
 */
export function LiveSheetChromeStrip({
  morphusActive,
  supportsDualForm = false,
  onToggleForm,
  activeOverlayTabId,
  onSelectOverlayTab,
  sheetMode,
  onSelectSheetMode,
  statusEffectsOpen,
  onToggleStatusEffects,
  quickRef,
  vitalityFlash,
}: Props) {
  const tabs = buildLiveSheetOverlayTabViews(activeOverlayTabId)
  const vitalsParts = formatLiveSheetVitalsChipParts(quickRef)

  return (
    <div
      className={`${
        vitalityFlash === 'damage'
          ? 'pds-vitality-flash-damage'
          : vitalityFlash === 'heal'
            ? 'pds-vitality-flash-heal'
            : ''
      }`}
      aria-label="Sheet tools and quick reference"
    >
      {/* Layer 1b — overlay tabs under identity */}
      <div
        className={`border-b-2 px-4 py-2 ${
          morphusActive
            ? 'border-violet-700/80 bg-slate-950/95'
            : 'border-blue-200 bg-white/95'
        }`}
      >
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2">
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
        </div>
      </div>

      {/* Layer 2 — Campaigns/Combat · Status Effects · vitals */}
      <div
        className={`border-b-2 px-4 py-2 ${
          morphusActive
            ? 'border-violet-700/80 bg-slate-950/95'
            : 'border-blue-200 bg-white/95'
        }`}
        aria-label="Live sheet mode and vitals"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-2">
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Character sheet mode"
          >
            {(['story', 'combat'] as const).map((mode) => {
              const active = sheetMode === mode
              return (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelectSheetMode(mode)}
                  className={`rounded-full px-5 py-1.5 text-xs font-black uppercase tracking-wide transition ${
                    active
                      ? morphusActive
                        ? 'bg-violet-700 text-white shadow'
                        : 'bg-blue-700 text-white shadow'
                      : morphusActive
                        ? 'border-2 border-violet-500 bg-transparent text-violet-200 hover:bg-violet-900/50'
                        : 'border-2 border-blue-500 bg-white text-blue-800 hover:bg-blue-50'
                  }`}
                >
                  {liveSheetModeLabel(mode)}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={onToggleStatusEffects}
            aria-expanded={statusEffectsOpen}
            aria-haspopup="dialog"
            className={`mx-auto rounded-full border-2 border-dashed px-4 py-1.5 text-[11px] font-black uppercase tracking-wide transition ${
              statusEffectsOpen
                ? morphusActive
                  ? 'border-violet-300 bg-violet-900/60 text-violet-50'
                  : 'border-blue-500 bg-blue-50 text-blue-900'
                : morphusActive
                  ? 'border-violet-400/70 bg-transparent text-violet-200 hover:bg-violet-900/40'
                  : 'border-blue-300 bg-transparent text-blue-800 hover:bg-blue-50'
            }`}
          >
            Status Effects
          </button>

          <div
            className={`ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full border-2 px-3 py-1.5 font-mono text-xs font-bold tabular-nums ${
              morphusActive
                ? 'border-violet-500 bg-violet-950 text-violet-50'
                : 'border-blue-600 bg-blue-600 text-white'
            }`}
            aria-label="Quick reference pools"
          >
            {vitalsParts.map((part) => (
              <span key={part}>{part}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
