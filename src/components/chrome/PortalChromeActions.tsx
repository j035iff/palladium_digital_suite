import { useState } from 'react'
import { AppSettingsDialog } from './AppSettingsDialog'
import { ReturnToLauncherIcon, SettingsGearIcon } from './PortalChromeIcons'

export type PortalChromeTone = 'dark' | 'sheet' | 'morphus'

const BUTTON_CLASS: Record<PortalChromeTone, string> = {
  dark: 'inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-600 bg-slate-900 text-slate-300 hover:border-slate-400 hover:text-white',
  sheet:
    'inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900',
  morphus:
    'inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-600 bg-slate-900/80 text-slate-300 hover:border-slate-400 hover:text-white',
}

type PortalChromeActionsProps = {
  /** When omitted (or `showReturn` false), only Settings is shown — e.g. launcher. */
  onReturnToLauncher?: () => void
  showReturn?: boolean
  showSettings?: boolean
  /** Accessible name for the exit control (default Return to launcher). */
  returnLabel?: string
  tone?: PortalChromeTone
  className?: string
}

/**
 * Shared portal chrome: exit-to-launcher icon + Settings gear.
 * One control pair for every viewport (Pillar 9 — Unified Path).
 */
export function PortalChromeActions({
  onReturnToLauncher,
  showReturn = true,
  showSettings = true,
  returnLabel = 'Return to launcher',
  tone = 'dark',
  className = '',
}: PortalChromeActionsProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const btn = BUTTON_CLASS[tone]
  const showExit = showReturn && typeof onReturnToLauncher === 'function'

  if (!showExit && !showSettings) return null

  return (
    <>
      <div className={`flex items-center gap-1.5 ${className}`.trim()}>
        {showExit ? (
          <button
            type="button"
            onClick={onReturnToLauncher}
            title={returnLabel}
            aria-label={returnLabel}
            className={btn}
          >
            <ReturnToLauncherIcon />
          </button>
        ) : null}
        {showSettings ? (
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            title="Settings"
            aria-label="Settings"
            className={btn}
          >
            <SettingsGearIcon />
          </button>
        ) : null}
      </div>
      {showSettings ? (
        <AppSettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
    </>
  )
}
