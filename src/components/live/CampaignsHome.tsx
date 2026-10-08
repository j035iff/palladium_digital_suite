import { useEffect, useMemo, useState } from 'react'
import { useCharacter } from '../../context/CharacterContext'
import {
  ContentLinkedNotesField,
  type ContentLinkWikiAdapter,
} from '../gm/ContentLinkedNotesField'
import { contentLinkKindLabel } from '../../lib/gm/contentLinks'
import {
  resolveContentLinkTarget,
  wikiBagFromPlaceholders,
} from '../../lib/gm/narrativePlaceholders'
import { confirmPermanentDelete } from '../../lib/gm/permanentDeleteConfirm'
import { getSharedGmClientRuntime } from '../../lib/gm/sessionClientHandle'
import type { GmClientRuntimeState } from '../../lib/gm/sessionClientRuntime'
import {
  addSheetCampaignPlaceholder,
  buildCampaignPills,
  CAMPAIGN_MERGE_SOURCE_REMOVED_COPY,
  CAMPAIGNS_SUB_TAB_LABELS,
  CAMPAIGNS_SUB_TAB_ORDER,
  campaignsSubTabEmptyCopy,
  campaignsSubTabForContentKind,
  campaignsSubTabKind,
  confirmDeleteSheetCampaign,
  confirmMergeSheetCampaigns,
  deleteSheetCampaign,
  ensureSheetCampaignForJoin,
  findSheetCampaign,
  hydrateSheetCampaigns,
  mergeSheetCampaigns,
  patchSheetCampaign,
  patchSheetCampaignPlaceholder,
  rememberJoinedCampaign,
  removeSheetCampaignPlaceholder,
  seedSheetCampaignsFromJoinMemory,
  type CampaignsSubTabId,
  type LiveSheetCampaign,
} from '../../lib/liveSheetCampaigns'

/**
 * Campaigns mode Home — forever campaign pills (name-keyed) + per-campaign
 * People/Places/Things/Notes with shared GM Hub wiki-link editor.
 */
export function CampaignsHome({ morphus }: { morphus: boolean }) {
  const { character, setSheetCampaigns } = useCharacter()
  const runtime = useMemo(() => getSharedGmClientRuntime(), [])
  const [clientState, setClientState] = useState<GmClientRuntimeState>(() =>
    runtime.getState(),
  )
  const [activeCampaignKey, setActiveCampaignKey] = useState<string | null>(
    null,
  )
  const [subTab, setSubTab] = useState<CampaignsSubTabId>('notes')
  const [focusStubId, setFocusStubId] = useState<string | null>(null)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergeTargetKey, setMergeTargetKey] = useState('')

  useEffect(() => runtime.subscribe(setClientState), [runtime])

  const campaigns = useMemo(
    () => hydrateSheetCampaigns(character.sheetCampaigns),
    [character.sheetCampaigns],
  )

  /** One-time seed from pass-1 device memory / legacy playNotes. */
  useEffect(() => {
    if (!character.id) return
    const current = hydrateSheetCampaigns(character.sheetCampaigns)
    if (current.length > 0) return
    const seeded = seedSheetCampaignsFromJoinMemory(
      character.id,
      current,
      character.playNotes,
    )
    if (seeded.length > 0) setSheetCampaigns(seeded)
  }, [
    character.id,
    character.playNotes,
    character.sheetCampaigns,
    setSheetCampaigns,
  ])

  const joined =
    clientState.status === 'joined' &&
    clientState.campaignId &&
    clientState.hello
      ? {
          sessionId: clientState.campaignId,
          name:
            clientState.hello.campaignName?.trim() ||
            clientState.hello.sessionName?.trim() ||
            'Campaign',
        }
      : null

  useEffect(() => {
    if (
      clientState.status !== 'joined' ||
      !clientState.campaignId ||
      !clientState.hello ||
      !character.id
    ) {
      return
    }
    const name =
      clientState.hello.campaignName?.trim() ||
      clientState.hello.sessionName?.trim() ||
      'Campaign'
    rememberJoinedCampaign(character.id, {
      id: clientState.campaignId,
      name,
    })
    const current = hydrateSheetCampaigns(character.sheetCampaigns)
    const result = ensureSheetCampaignForJoin(current, {
      name,
      joinSessionId: clientState.campaignId,
      legacyPlayNotes: character.playNotes,
    })
    if (result.campaigns !== current) {
      setSheetCampaigns(result.campaigns)
    }
    setActiveCampaignKey(result.campaign.key)
  }, [
    character.id,
    character.playNotes,
    character.sheetCampaigns,
    clientState.status,
    clientState.campaignId,
    clientState.hello?.campaignName,
    clientState.hello?.sessionName,
    setSheetCampaigns,
  ])

  const pills = useMemo(
    () =>
      buildCampaignPills({
        campaigns,
        joined,
      }),
    [campaigns, joined],
  )

  useEffect(() => {
    if (pills.length === 0) {
      setActiveCampaignKey(null)
      return
    }
    if (
      !activeCampaignKey ||
      !pills.some((p) => p.key === activeCampaignKey)
    ) {
      setActiveCampaignKey(pills[0]!.key)
    }
  }, [pills, activeCampaignKey])

  const activeCampaign: LiveSheetCampaign | null =
    activeCampaignKey != null
      ? findSheetCampaign(campaigns, activeCampaignKey) ?? null
      : null

  const wikiAdapter: ContentLinkWikiAdapter | null = useMemo(() => {
    if (!activeCampaign) return null
    const campaignKey = activeCampaign.key
    const bag = wikiBagFromPlaceholders(activeCampaign.placeholders)
    return {
      bag,
      createContentStub: (input) => {
        const { campaigns: next, entity } = addSheetCampaignPlaceholder(
          campaigns,
          campaignKey,
          input,
        )
        if (entity) setSheetCampaigns(next)
        return entity
      },
      navigateContentLink: (kind, id) => {
        setSubTab(campaignsSubTabForContentKind(kind))
        setFocusStubId(id)
      },
      resolveTarget: (kind, id, label) =>
        resolveContentLinkTarget(bag, kind, id, label),
    }
  }, [activeCampaign, campaigns, setSheetCampaigns])

  const empty = campaignsSubTabEmptyCopy(subTab)
  const otherCampaigns = campaigns.filter(
    (c) => c.key !== activeCampaign?.key,
  )

  const handleDelete = () => {
    if (!activeCampaign) return
    if (!confirmDeleteSheetCampaign(activeCampaign.name)) return
    setSheetCampaigns(deleteSheetCampaign(campaigns, activeCampaign.key))
    setMergeOpen(false)
  }

  const handleMerge = () => {
    if (!activeCampaign || !mergeTargetKey) return
    const target = findSheetCampaign(campaigns, mergeTargetKey)
    if (!target) return
    if (!confirmMergeSheetCampaigns(activeCampaign.name, target.name)) return
    const next = mergeSheetCampaigns(
      campaigns,
      activeCampaign.key,
      target.key,
    )
    setSheetCampaigns(next)
    setActiveCampaignKey(target.key)
    setMergeOpen(false)
    setMergeTargetKey('')
  }

  const stubKind =
    subTab === 'notes' ? null : campaignsSubTabKind(subTab)
  const stubRows =
    activeCampaign && stubKind
      ? activeCampaign.placeholders.filter((p) => p.kind === stubKind)
      : []

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
          No campaigns yet. Join a table to add a campaign tab named after that
          table. The same table name reuses the existing tab; a different name
          creates a new one. Tabs stay until you delete or merge them.
        </p>
      ) : (
        <div className="space-y-2">
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="Campaigns"
          >
            {pills.map((pill) => {
              const active = pill.key === activeCampaignKey
              return (
                <button
                  key={pill.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setActiveCampaignKey(pill.key)
                    setMergeOpen(false)
                    setFocusStubId(null)
                  }}
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

          {activeCampaign ? (
            <div className="flex flex-wrap items-center gap-2">
              <p
                className={`text-[11px] font-semibold uppercase tracking-wide ${
                  morphus ? 'text-violet-300/90' : 'text-slate-500'
                }`}
              >
                {activeCampaign.name}
                {joined &&
                normalizeJoinMatch(joined.name, activeCampaign.key)
                  ? ' · At this table'
                  : ''}
              </p>
              <button
                type="button"
                onClick={handleDelete}
                className={`rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  morphus
                    ? 'border-red-800/80 text-red-300 hover:bg-red-950/40'
                    : 'border-red-300 text-red-700 hover:bg-red-50'
                }`}
              >
                Delete campaign
              </button>
              <button
                type="button"
                disabled={otherCampaigns.length === 0}
                onClick={() => {
                  setMergeOpen((open) => !open)
                  setMergeTargetKey(otherCampaigns[0]?.key ?? '')
                }}
                className={`rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-40 ${
                  morphus
                    ? 'border-violet-600 text-violet-200 hover:bg-violet-900/40'
                    : 'border-blue-300 text-blue-800 hover:bg-blue-50'
                }`}
              >
                Merge…
              </button>
            </div>
          ) : null}

          {mergeOpen && activeCampaign ? (
            <div
              className={`rounded-lg border-2 px-3 py-3 ${
                morphus
                  ? 'border-violet-700 bg-slate-950/70'
                  : 'border-blue-200 bg-blue-50/80'
              }`}
              role="dialog"
              aria-label="Merge campaign"
            >
              <p
                className={`text-xs ${
                  morphus ? 'text-violet-100' : 'text-slate-700'
                }`}
              >
                Merge <strong>{activeCampaign.name}</strong> into another
                campaign. {CAMPAIGN_MERGE_SOURCE_REMOVED_COPY}
              </p>
              <label
                className={`mt-2 block text-[10px] font-bold uppercase tracking-wide ${
                  morphus ? 'text-violet-300' : 'text-slate-500'
                }`}
              >
                Target campaign
                <select
                  value={mergeTargetKey}
                  onChange={(e) => setMergeTargetKey(e.target.value)}
                  className="mt-1 block w-full max-w-sm rounded border border-slate-400 bg-white px-2 py-1.5 text-sm font-normal normal-case tracking-normal text-slate-900"
                >
                  {otherCampaigns.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!mergeTargetKey}
                  onClick={handleMerge}
                  className="rounded bg-slate-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white disabled:opacity-40"
                >
                  Merge into target
                </button>
                <button
                  type="button"
                  onClick={() => setMergeOpen(false)}
                  className="rounded border border-slate-400 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <div
        className="flex flex-wrap gap-1.5 rounded-md bg-slate-900 px-2 py-2"
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
              onClick={() => {
                setSubTab(id)
                setFocusStubId(null)
              }}
              className={`rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide ${
                active
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'bg-transparent text-white hover:bg-slate-800'
              }`}
            >
              {CAMPAIGNS_SUB_TAB_LABELS[id]}
            </button>
          )
        })}
      </div>

      {!activeCampaign ? null : subTab === 'notes' ? (
        wikiAdapter ? (
          <div className="space-y-2">
            <div>
              <p
                className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
                  morphus ? 'text-violet-400' : 'text-slate-400'
                }`}
              >
                Campaign notes
              </p>
              <h2
                className={`mt-0.5 text-lg font-black tracking-tight ${
                  morphus ? 'text-violet-50' : 'text-slate-900'
                }`}
              >
                Notes
              </h2>
              <p
                className={`mt-1 max-w-xl text-sm ${
                  morphus ? 'text-violet-200/80' : 'text-slate-500'
                }`}
              >
                Capture clues, names, objectives, and events during play.
              </p>
            </div>
            <ContentLinkedNotesField
              id={`sheet-campaign-notes-${activeCampaign.key}`}
              value={activeCampaign.notes}
              onChange={(notes) =>
                setSheetCampaigns(
                  patchSheetCampaign(campaigns, activeCampaign.key, { notes }),
                )
              }
              wiki={wikiAdapter}
              density="scratchpad"
              surface="sheet"
              aria-label={`${activeCampaign.name} notes`}
              placeholder="Write story notes…"
            />
          </div>
        ) : null
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2
                className={`text-xs font-black uppercase tracking-[0.2em] ${
                  morphus ? 'text-violet-300' : 'text-blue-800'
                }`}
              >
                {empty.title}
              </h2>
              <p
                className={`mt-1 max-w-xl text-xs ${
                  morphus ? 'text-violet-200/80' : 'text-slate-500'
                }`}
              >
                Stubs for this campaign only. Wiki links use the same{' '}
                <span className="font-mono text-[10px]">[[…]]</span> model as GM
                Hub Notes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!stubKind || !activeCampaign) return
                const name = window.prompt(
                  `Name for new ${contentLinkKindLabel(stubKind).toLowerCase()}?`,
                )
                if (!name?.trim()) return
                const { campaigns: next } = addSheetCampaignPlaceholder(
                  campaigns,
                  activeCampaign.key,
                  { kind: stubKind, name: name.trim() },
                )
                setSheetCampaigns(next)
              }}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wide ${
                morphus
                  ? 'bg-violet-700 text-white hover:bg-violet-600'
                  : 'bg-blue-700 text-white hover:bg-blue-600'
              }`}
            >
              Add {stubKind ? contentLinkKindLabel(stubKind) : empty.title}
            </button>
          </div>

          {stubRows.length === 0 ? (
            <p
              className={`rounded-xl border-2 px-4 py-6 text-sm ${
                morphus
                  ? 'border-violet-700 bg-slate-950/60 text-violet-200'
                  : 'border-blue-200 bg-slate-50 text-slate-600'
              }`}
            >
              {empty.body}
            </p>
          ) : (
            <ul className="space-y-3">
              {stubRows.map((row) => {
                const focused = focusStubId === row.id
                return (
                  <li
                    key={row.id}
                    id={`sheet-focus-${row.kind}-${row.id}`}
                    className={`rounded-xl border-2 p-3 ${
                      focused
                        ? morphus
                          ? 'border-violet-400 bg-violet-950/40 ring-1 ring-violet-400/50'
                          : 'border-cyan-500 bg-cyan-50 ring-1 ring-cyan-400/50'
                        : morphus
                          ? 'border-violet-800 bg-slate-950/60'
                          : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <input
                        value={row.name}
                        onChange={(e) =>
                          setSheetCampaigns(
                            patchSheetCampaignPlaceholder(
                              campaigns,
                              activeCampaign.key,
                              row.id,
                              { name: e.target.value },
                            ),
                          )
                        }
                        className={`min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-sm font-semibold ${
                          morphus ? 'text-violet-50' : 'text-slate-900'
                        }`}
                        aria-label={`${contentLinkKindLabel(row.kind as 'person')} name`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!confirmPermanentDelete(row.name)) return
                          setSheetCampaigns(
                            removeSheetCampaignPlaceholder(
                              campaigns,
                              activeCampaign.key,
                              row.id,
                            ),
                          )
                        }}
                        className="text-[10px] uppercase text-red-500 hover:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                    {wikiAdapter ? (
                      <div className="mt-2">
                        <ContentLinkedNotesField
                          id={`sheet-stub-notes-${row.id}`}
                          value={row.notes}
                          onChange={(notes) =>
                            setSheetCampaigns(
                              patchSheetCampaignPlaceholder(
                                campaigns,
                                activeCampaign.key,
                                row.id,
                                { notes },
                              ),
                            )
                          }
                          wiki={wikiAdapter}
                          density="compact"
                          surface="sheet"
                          aria-label={`${row.name} notes`}
                        />
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

function normalizeJoinMatch(joinedName: string, campaignKey: string): boolean {
  return (
    joinedName.trim().replace(/\s+/g, ' ').toLowerCase() === campaignKey
  )
}
