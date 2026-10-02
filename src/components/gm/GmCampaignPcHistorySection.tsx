import { useMemo, useState } from 'react'
import { useGmSession } from '../../context/GmSessionContext'
import {
  campaignPcHistoryOptionLabel,
} from '../../lib/gm/campaignPcHistory'
import { joinedPartyCharacterIds } from '../../lib/gm/joinTableLeave'
import { buildPartyObserverSlice } from '../../lib/gm/partyObserver'
import { confirmPermanentDelete } from '../../lib/gm/permanentDeleteConfirm'
import type { ActiveForm } from '../../types'
import { GmPartySummaryFields } from './GmPartySummaryFields'

/**
 * People → PCs — Campaign history: unique spawned PCs ever at this table.
 * Dropdown pins stacked summary cards (multi-open). Seated rows greyed.
 */
export function GmCampaignPcHistorySection() {
  const {
    session,
    joinSeats,
    setCampaignPcHistoryComment,
    deleteCampaignPcHistoryEntry,
  } = useGmSession()
  const [pinnedIds, setPinnedIds] = useState<string[]>([])
  const [pickerValue, setPickerValue] = useState('')
  const [viewForms, setViewForms] = useState<Record<string, ActiveForm>>({})

  const seatedIds = useMemo(
    () => new Set(joinedPartyCharacterIds(joinSeats)),
    [joinSeats],
  )

  const history = session?.campaignPcHistory ?? []

  const pinnedEntries = useMemo(
    () =>
      pinnedIds
        .map((id) => history.find((row) => row.characterId === id))
        .filter((row): row is NonNullable<typeof row> => row != null),
    [pinnedIds, history],
  )

  if (!session) return null

  const pinCharacter = (characterId: string) => {
    if (!characterId) return
    if (seatedIds.has(characterId)) return
    setPinnedIds((prev) =>
      prev.includes(characterId) ? prev : [...prev, characterId],
    )
    setPickerValue('')
  }

  const unpinCharacter = (characterId: string) => {
    setPinnedIds((prev) => prev.filter((id) => id !== characterId))
  }

  return (
    <section className="mt-8 border-t border-slate-800 pt-6">
      <div className="mb-4">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-amber-200/90">
          Campaign history
        </h2>
        <p className="mt-1 max-w-xl text-xs text-slate-400">
          Unique complete characters that have sat at this campaign’s table
          (Review &amp; Spawn). Drafts at the table are not listed until
          spawned. Pick a character to pin a summary card — several can stay
          open.
        </p>
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-slate-500">
          No campaign history yet. Spawned characters appear here after they
          join a play session.
        </p>
      ) : (
        <>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Open history card
            <select
              value={pickerValue}
              onChange={(e) => {
                const id = e.target.value
                setPickerValue(id)
                pinCharacter(id)
              }}
              className="mt-1 w-full max-w-md rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              aria-label="Campaign history characters"
            >
              <option value="">Select a character</option>
              {history.map((entry) => {
                const seated = seatedIds.has(entry.characterId)
                const pinned = pinnedIds.includes(entry.characterId)
                const label = campaignPcHistoryOptionLabel(entry)
                return (
                  <option
                    key={entry.characterId}
                    value={entry.characterId}
                    disabled={seated || pinned}
                  >
                    {seated
                      ? `${label} — currently at table`
                      : pinned
                        ? `${label} — open`
                        : label}
                  </option>
                )
              })}
            </select>
          </label>
          <p className="mt-2 max-w-md text-[11px] text-slate-500">
            Characters currently at the table are greyed with “currently at
            table” (use At the table above).
          </p>
        </>
      )}

      {pinnedEntries.length > 0 ? (
        <ul className="mt-4 grid gap-3 lg:grid-cols-2">
          {pinnedEntries.map((entry) => {
            const viewForm = viewForms[entry.characterId] ?? 'primary'
            const pc = buildPartyObserverSlice(
              entry.characterJson,
              session.hostGenreId,
              session.conversionPolicy,
              viewForm,
            )
            return (
              <li
                key={entry.characterId}
                className="rounded-xl border border-slate-700 bg-slate-900/80 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white">{pc.name}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">
                      Lv {pc.level} · {pc.creationGenreLabel}
                      {pc.crossGenre ? ` → ${pc.hostGenreLabel}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {entry.playerLabel ? (
                      <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-300/90">
                        {entry.playerLabel}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => unpinCharacter(entry.characterId)}
                      className="text-[10px] uppercase text-slate-400 hover:text-slate-200"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!confirmPermanentDelete(entry.characterName)) return
                        deleteCampaignPcHistoryEntry(entry.characterId)
                        unpinCharacter(entry.characterId)
                      }}
                      className="text-[10px] uppercase text-red-400/80 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {pc.crossGenre ? (
                  <p className="mt-2 rounded-md border border-amber-800/50 bg-amber-950/30 px-2 py-1.5 text-[11px] leading-snug text-amber-100/90">
                    {pc.conversionNote}
                  </p>
                ) : (
                  <p className="mt-2 text-[11px] text-slate-500">
                    {pc.conversionNote}
                  </p>
                )}
                {pc.supportsDualForm ? (
                  <div className="mt-2 flex gap-1">
                    {(['primary', 'morphus'] as const).map((form) => (
                      <button
                        key={form}
                        type="button"
                        onClick={() =>
                          setViewForms((prev) => ({
                            ...prev,
                            [entry.characterId]: form,
                          }))
                        }
                        className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${
                          pc.viewForm === form
                            ? 'bg-violet-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {form === 'primary' ? 'Facade' : 'Morphus'}
                      </button>
                    ))}
                  </div>
                ) : null}
                <GmPartySummaryFields pc={pc} />
                <label className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  GM comment
                  <textarea
                    value={entry.gmComment}
                    onChange={(e) =>
                      setCampaignPcHistoryComment(
                        entry.characterId,
                        e.target.value,
                      )
                    }
                    rows={2}
                    placeholder="Campaign-local note (no stat override)…"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200"
                  />
                </label>
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}
