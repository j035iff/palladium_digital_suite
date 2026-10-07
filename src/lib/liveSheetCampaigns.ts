/**
 * Live sheet Campaigns mode — campaign pills from join presence + lightweight
 * device-local join memory. Does **not** fork GM Hub wiki / narrative storage.
 */

export type LiveSheetCampaignPill = {
  id: string
  name: string
}

export type CampaignsSubTabId = 'people' | 'places' | 'things' | 'notes'

export const CAMPAIGNS_SUB_TAB_ORDER: readonly CampaignsSubTabId[] = [
  'people',
  'places',
  'things',
  'notes',
] as const

export const CAMPAIGNS_SUB_TAB_LABELS: Record<CampaignsSubTabId, string> = {
  people: 'People',
  places: 'Places',
  things: 'Things',
  notes: 'Notes',
}

const STORAGE_KEY = 'pds:liveSheetCampaignJoins'

type JoinMemoryStore = Record<string, LiveSheetCampaignPill[]>

function readStore(): JoinMemoryStore {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as JoinMemoryStore
  } catch {
    return {}
  }
}

function writeStore(store: JoinMemoryStore): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* quota / private mode — pills still work for the active join */
  }
}

export function listRememberedCampaigns(
  characterId: string,
): LiveSheetCampaignPill[] {
  if (!characterId.trim()) return []
  const rows = readStore()[characterId] ?? []
  return rows.filter(
    (row) =>
      row &&
      typeof row.id === 'string' &&
      row.id.trim() &&
      typeof row.name === 'string' &&
      row.name.trim(),
  )
}

/** Persist a joined campaign name for multi-pill Campaigns chrome (per character). */
export function rememberJoinedCampaign(
  characterId: string,
  campaign: LiveSheetCampaignPill,
): LiveSheetCampaignPill[] {
  const id = characterId.trim()
  const campaignId = campaign.id.trim()
  const name = campaign.name.trim()
  if (!id || !campaignId || !name) return listRememberedCampaigns(characterId)

  const store = readStore()
  const prev = store[id] ?? []
  const next: LiveSheetCampaignPill[] = [
    { id: campaignId, name },
    ...prev.filter((row) => row.id !== campaignId),
  ]
  store[id] = next
  writeStore(store)
  return next
}

/**
 * Pills for Campaigns mode: active join first (live name), then remembered joins.
 * Empty when the character has never joined a table on this device.
 */
export function buildCampaignPills(opts: {
  characterId: string
  joined: LiveSheetCampaignPill | null
}): LiveSheetCampaignPill[] {
  const remembered = listRememberedCampaigns(opts.characterId)
  if (!opts.joined) return remembered
  const live = {
    id: opts.joined.id.trim(),
    name: opts.joined.name.trim() || 'Campaign',
  }
  if (!live.id) return remembered
  return [live, ...remembered.filter((row) => row.id !== live.id)]
}

export function isCampaignsSubTabId(id: string): id is CampaignsSubTabId {
  return (CAMPAIGNS_SUB_TAB_ORDER as readonly string[]).includes(id)
}

export function campaignsSubTabEmptyCopy(tab: CampaignsSubTabId): {
  title: string
  body: string
} {
  switch (tab) {
    case 'people':
      return {
        title: 'People',
        body: 'NPC and party notes for this campaign will appear here. Pass 1 is a stub — GM Hub remains the host for shared cast data.',
      }
    case 'places':
      return {
        title: 'Places',
        body: 'Locations for this campaign will appear here. Pass 1 is a stub — no separate Places store on the sheet.',
      }
    case 'things':
      return {
        title: 'Things',
        body: 'Campaign items and props will appear here. Pass 1 is a stub — Gear on the strip stays the character inventory path.',
      }
    case 'notes':
      return {
        title: 'Notes',
        body: 'Capture clues, names, objectives, and events during play.',
      }
  }
}
