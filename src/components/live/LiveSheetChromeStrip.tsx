import {
  liveSheetModeLabel,
  type LiveSheetMode,
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
  sheetMode: LiveSheetMode
  onSelectSheetMode: (mode: LiveSheetMode) => void
  statusEffectsOpen: boolean
  onToggleStatusEffects: () => void
  quickRef: QuickRef
  vitalityFlash: 'damage' | 'heal' | 'none' | null
}

/**
 * Persistent Core Layer 2 only (mockup 01):
 * Campaigns | Combat · Status Effects stub · vitals chip with " | " separators.
 * Layer 1 identity + overlay tabs live in MainLayout (centered stack, no rule between).
 */
export function LiveSheetChromeStrip({
  morphusActive,
  sheetMode,
  onSelectSheetMode,
  statusEffectsOpen,
  onToggleStatusEffects,
  quickRef,
  vitalityFlash,
}: Props) {
  const vitalsParts = formatLiveSheetVitalsChipParts(quickRef)
  const vitalsLabel = vitalsParts.join(' | ')

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
      <div
        className={`border-b px-4 py-2.5 ${
          morphusActive
            ? 'border-violet-700/80 bg-slate-950/95'
            : 'border-slate-200 bg-white/95'
        }`}
        aria-label="Live sheet mode and vitals"
      >
        <div className="mx-auto grid w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-x-3 gap-y-2">
          <div
            className="flex flex-wrap items-center justify-start gap-2"
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
                        ? 'bg-violet-700 text-white shadow-sm'
                        : 'bg-blue-700 text-white shadow-sm'
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
            className={`justify-self-center rounded-full border-2 border-dashed px-4 py-1.5 text-[11px] font-black uppercase tracking-wide transition ${
              statusEffectsOpen
                ? morphusActive
                  ? 'border-violet-300 bg-violet-900/60 text-violet-50'
                  : 'border-blue-400 bg-blue-50 text-black'
                : morphusActive
                  ? 'border-violet-400/70 bg-transparent text-violet-200 hover:bg-violet-900/40'
                  : 'border-sky-300 bg-transparent text-black hover:bg-sky-50'
            }`}
          >
            Status Effects
          </button>

          <div
            className={`justify-self-end rounded-full border-2 px-3.5 py-1.5 font-mono text-xs font-bold tabular-nums ${
              morphusActive
                ? 'border-violet-500 bg-violet-950 text-violet-50'
                : 'border-blue-700 bg-blue-700 text-white'
            }`}
            aria-label="Quick reference pools"
          >
            {vitalsLabel}
          </div>
        </div>
      </div>
    </div>
  )
}
