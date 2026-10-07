import { useEffect, useMemo, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import { getSharedGmClientRuntime } from '../../lib/gm/sessionClientHandle'
import type { GmClientRuntimeState } from '../../lib/gm/sessionClientRuntime'
import {
  buildCampaignPills,
  CAMPAIGNS_SUB_TAB_LABELS,
  CAMPAIGNS_SUB_TAB_ORDER,
  campaignsSubTabEmptyCopy,
  rememberJoinedCampaign,
  type CampaignsSubTabId,
} from '../../lib/liveSheetCampaigns'
import { PlayNotesEditor } from './PlayNotesEditor'

/**
 * Campaigns mode Home — campaign pills (table name) + People/Places/Things/Notes.
 * PPTN content is stubbed except Notes (reuses character `playNotes`).
 */
export function CampaignsHome({ morphus }: { morphus: boolean }) {
  const { character } = useCharacter()
  const runtime = useMemo(() => getSharedGmClientRuntime(), [])
  const [clientState, setClientState] = useState<GmClientRuntimeState>(() =>
    runtime.getState(),
  )
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null)
  const [subTab, setSubTab] = useState<CampaignsSubTabId>('notes')

  useEffect(() => runtime.subscribe(setClientState), [runtime])

  const joined =
    clientState.status === 'joined' &&
    clientState.campaignId &&
    clientState.hello
      ? {
          id: clientState.campaignId,
          name:
            clientState.hello.campaignName?.trim() ||
            clientState.hello.sessionName?.trim() ||
            'Campaign',
        }
      : null

  const [memoryEpoch, setMemoryEpoch] = useState(0)

  useEffect(() => {
    if (
      clientState.status !== 'joined' ||
      !clientState.campaignId ||
      !clientState.hello ||
      !character.id
    ) {
      return
    }
    rememberJoinedCampaign(character.id, {
      id: clientState.campaignId,
      name:
        clientState.hello.campaignName?.trim() ||
        clientState.hello.sessionName?.trim() ||
        'Campaign',
    })
    setMemoryEpoch((n) => n + 1)
  }, [
    character.id,
    clientState.status,
    clientState.campaignId,
    clientState.hello?.campaignName,
    clientState.hello?.sessionName,
  ])

  const pills = useMemo(
    () =>
      buildCampaignPills({
        characterId: character.id,
        joined,
      }),
    [character.id, joined, memoryEpoch],
  )

  useEffect(() => {
    if (pills.length === 0) {
      setActiveCampaignId(null)
      return
    }
    if (!activeCampaignId || !pills.some((p) => p.id === activeCampaignId)) {
      setActiveCampaignId(pills[0]!.id)
    }
  }, [pills, activeCampaignId])

  const activePill = pills.find((p) => p.id === activeCampaignId) ?? null
  const empty = campaignsSubTabEmptyCopy(subTab)

  return (
    <section aria-label="Campaigns" className="space-y-3">
      {pills.length === 0 ? (
        <p
          className={`rounded-lg border-2 px-3 py-2 text-xs ${
            morphus
              ? 'border-violet-700 bg-slate-950/70 text-violet-200'
              : 'border-blue-200 bg-blue-50/80 text-slate-700'
          }`}
        >
          No campaigns yet. Join a table to add a campaign pill named after that
          table. Multiple joins on this device create multiple pills.
        </p>
      ) : (
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Campaigns"
        >
          {pills.map((pill) => {
            const active = pill.id === activeCampaignId
            return (
              <button
                key={pill.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveCampaignId(pill.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide transition ${
                  active
                    ? morphus
                      ? 'bg-violet-700 text-white shadow'
                      : 'bg-blue-700 text-white shadow'
                    : morphus
                      ? 'border border-violet-600 text-violet-200 hover:bg-violet-900/50'
                      : 'border border-blue-300 text-blue-900 hover:bg-blue-50'
                }`}
              >
                {pill.name}
              </button>
            )
          })}
        </div>
      )}

      <div
        className={`flex flex-wrap gap-1 rounded-lg p-1 ${
          morphus ? 'bg-slate-900' : 'bg-slate-900'
        }`}
        role="tablist"
        aria-label="Campaign sections"
      >
        {CAMPAIGNS_SUB_TAB_ORDER.map((id) => {
          const active = subTab === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSubTab(id)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide ${
                active
                  ? 'bg-white text-slate-900'
                  : 'text-slate-200 hover:bg-slate-800'
              }`}
            >
              {CAMPAIGNS_SUB_TAB_LABELS[id]}
            </button>
          )
        })}
      </div>

      {activePill ? (
        <p
          className={`text-[11px] font-semibold uppercase tracking-wide ${
            morphus ? 'text-violet-300/90' : 'text-slate-500'
          }`}
        >
          {activePill.name}
          {joined?.id === activePill.id ? ' · At this table' : ''}
        </p>
      ) : null}

      {subTab === 'notes' ? (
        <PlayNotesEditor morphus={morphus} eyebrow="Campaign notes" />
      ) : (
        <div
          className={`rounded-xl border-2 px-4 py-6 ${
            morphus
              ? 'border-violet-700 bg-slate-950/60'
              : 'border-blue-200 bg-slate-50'
          }`}
        >
          <p
            className={`text-[10px] font-black uppercase tracking-wider ${
              morphus ? 'text-violet-300' : 'text-blue-800'
            }`}
          >
            {empty.title}
          </p>
          <h2
            className={`mt-1 text-lg font-black ${
              morphus ? 'text-violet-50' : 'text-slate-900'
            }`}
          >
            {empty.title}
          </h2>
          <p
            className={`mt-2 max-w-xl text-sm ${
              morphus ? 'text-violet-200/90' : 'text-slate-600'
            }`}
          >
            {empty.body}
          </p>
        </div>
      )}
    </section>
  )
}
