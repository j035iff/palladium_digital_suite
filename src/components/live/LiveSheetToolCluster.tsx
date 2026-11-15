import { useEffect, useState } from 'react'
import {
  JoinTableIcon,
  ReturnToLauncherIcon,
  SettingsGearIcon,
} from '../chrome/PortalChromeIcons'
import { AppSettingsDialog } from '../chrome/AppSettingsDialog'
import {
  LIVE_SHEET_JOIN_NO_TABLE_TOOLTIP,
  LIVE_SHEET_RETURN_TO_LAUNCHER_LABEL,
} from '../../lib/liveSheetSave'
import { listLanSessions } from '../../lib/gm/sessionDiscovery'

type Tone = 'sheet' | 'morphus'

const BUTTON_CLASS: Record<Tone, string> = {
  sheet:
    'inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900',
  morphus:
    'inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-600 bg-slate-900/80 text-slate-300 hover:border-slate-400 hover:text-white',
}

const BUTTON_DISABLED: Record<Tone, string> = {
  sheet:
    'inline-flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-slate-400 opacity-70',
  morphus:
    'inline-flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-md border border-slate-700 bg-slate-900/40 text-slate-600 opacity-70',
}

const BUTTON_SEATED: Record<Tone, string> = {
  sheet:
    'inline-flex h-9 w-9 items-center justify-center rounded-md border border-emerald-600 bg-emerald-50 text-emerald-800 hover:border-emerald-700',
  morphus:
    'inline-flex h-9 w-9 items-center justify-center rounded-md border border-emerald-400 bg-emerald-950/60 text-emerald-200 hover:border-emerald-300',
}

type Props = {
  tone?: Tone
  /** Seated table/campaign name, or null when not joined. */
  seatedTableName: string | null
  onJoinTable: () => void
  /** Leave the open table but stay on the sheet (Q11 default). */
  onLeaveTable: () => void
  onReturnToLauncher: () => void
}

const DISCOVER_POLL_MS = 4000

/**
 * Persistent Core tools L→R: Join · Portal · Settings.
 * Seated Join default (Q11): green icon + table tooltip; click confirms leave-table
 * (stay on sheet). Campaigns pill still shows the seated table name.
 */
export function LiveSheetToolCluster({
  tone = 'sheet',
  seatedTableName,
  onJoinTable,
  onLeaveTable,
  onReturnToLauncher,
}: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tablesAvailable, setTablesAvailable] = useState(true)
  const seated = Boolean(seatedTableName?.trim())
  const btn = BUTTON_CLASS[tone]

  useEffect(() => {
    if (seated) {
      setTablesAvailable(true)
      return
    }
    let cancelled = false
    const refresh = async () => {
      try {
        const result = await listLanSessions({})
        if (cancelled) return
        setTablesAvailable(result.sessions.length > 0)
      } catch {
        if (!cancelled) setTablesAvailable(false)
      }
    }
    void refresh()
    const id = window.setInterval(() => void refresh(), DISCOVER_POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [seated])

  const joinDisabled = !seated && !tablesAvailable
  const joinTitle = seated
    ? `Seated at ${seatedTableName} — click to leave table`
    : joinDisabled
      ? LIVE_SHEET_JOIN_NO_TABLE_TOOLTIP
      : 'Join table'
  const joinClass = seated
    ? BUTTON_SEATED[tone]
    : joinDisabled
      ? BUTTON_DISABLED[tone]
      : btn

  return (
    <>
      <div
        className="flex items-center gap-1.5"
        role="group"
        aria-label="Sheet tools"
      >
        <button
          type="button"
          disabled={joinDisabled}
          title={joinTitle}
          aria-label={joinTitle}
          className={joinClass}
          onClick={() => {
            if (seated) {
              onLeaveTable()
              return
            }
            if (!joinDisabled) onJoinTable()
          }}
        >
          <JoinTableIcon />
        </button>
        <button
          type="button"
          onClick={onReturnToLauncher}
          title={LIVE_SHEET_RETURN_TO_LAUNCHER_LABEL}
          aria-label={LIVE_SHEET_RETURN_TO_LAUNCHER_LABEL}
          className={btn}
        >
          <ReturnToLauncherIcon />
        </button>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          aria-label="Settings"
          className={btn}
        >
          <SettingsGearIcon />
        </button>
      </div>
      <AppSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  )
}
