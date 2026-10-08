/**
 * Live sheet Campaigns mode — campaign tabs + per-campaign PPTN/wiki journals.
 *
 * Tabs persist on the character save forever until the player deletes (or merges
 * away) them. Join reuses an existing tab when the **table/campaign name** matches
 * (normalized); a new name creates a new tab. Wiki tokens share GM Hub’s
 * `[[kind:id|label]]` model — do not fork.
 */

import {
  createPlaceholderEntity,
  type GmPlaceholderEntity,
} from './gm/narrativePlaceholders'
import { remapContentLinkIds } from './gm/contentLinks'
import type { GmContentLinkKind } from './gm/contentLinks'
import { createGmId } from './gm/sessionId'
import { permanentDeleteConfirmMessage } from './gm/permanentDeleteConfirm'

export type LiveSheetCampaignPill = {
  /** Stable key = {@link normalizeCampaignName}. */
  key: string
  name: string
  /** Last join session id when known (highlights “At this table”). */
  lastJoinSessionId?: string
}

/** Per-campaign People / Places / Things / Notes wiki bag on the character save. */
export type LiveSheetCampaign = {
  key: string
  name: string
  /** Notes body — storage uses shared `[[kind:id|label]]` tokens. */
  notes: string
  /** Shared stub type with GM Hub (`GmPlaceholderEntity`). */
  placeholders: GmPlaceholderEntity[]
  lastJoinSessionId?: string
  createdAtMs: number
  updatedAtMs: number
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

const KIND_BY_SUB: Record<
  Exclude<CampaignsSubTabId, 'notes'>,
  GmContentLinkKind
> = {
  people: 'person',
  places: 'place',
  things: 'thing',
}

/** Device-local join memory (pass-1); seeds character journals once. */
const STORAGE_KEY = 'pds:liveSheetCampaignJoins'

type JoinMemoryStore = Record<string, Array<{ id: string; name: string }>>

/** Normalize table/campaign name for forever-tab identity (case/space insensitive). */
export function normalizeCampaignName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

/** Tooltip when Delete / Merge are locked for the campaign of the seated table. */
export const CAMPAIGN_AT_TABLE_LOCK_TOOLTIP =
  "Cannot delete or merge a campaign if you're currently at that table."

/** True when this campaign pill is the table the player is currently seated at. */
export function isSheetCampaignAtJoinedTable(
  campaignKey: string,
  joinedName: string | null | undefined,
): boolean {
  if (!joinedName?.trim() || !campaignKey.trim()) return false
  return normalizeCampaignName(campaignKey) === normalizeCampaignName(joinedName)
}

export function emptyLiveSheetCampaign(
  name: string,
  opts: { notes?: string; lastJoinSessionId?: string; nowMs?: number } = {},
): LiveSheetCampaign {
  const display = name.trim() || 'Campaign'
  const now = opts.nowMs ?? Date.now()
  return {
    key: normalizeCampaignName(display),
    name: display,
    notes: opts.notes ?? '',
    placeholders: [],
    lastJoinSessionId: opts.lastJoinSessionId,
    createdAtMs: now,
    updatedAtMs: now,
  }
}

export function hydrateSheetCampaigns(raw: unknown): LiveSheetCampaign[] {
  if (!Array.isArray(raw)) return []
  const out: LiveSheetCampaign[] = []
  const seen = new Set<string>()
  for (const row of raw) {
    if (row == null || typeof row !== 'object') continue
    const r = row as Partial<LiveSheetCampaign>
    if (typeof r.name !== 'string' || !r.name.trim()) continue
    const key =
      typeof r.key === 'string' && r.key.trim()
        ? normalizeCampaignName(r.key)
        : normalizeCampaignName(r.name)
    if (!key || seen.has(key)) continue
    seen.add(key)
    const placeholders = Array.isArray(r.placeholders)
      ? (r.placeholders as GmPlaceholderEntity[]).filter(
          (p) =>
            p &&
            typeof p.id === 'string' &&
            typeof p.kind === 'string' &&
            typeof p.name === 'string' &&
            typeof p.notes === 'string' &&
            typeof p.createdAtMs === 'number',
        )
      : []
    out.push({
      key,
      name: r.name.trim(),
      notes: typeof r.notes === 'string' ? r.notes : '',
      placeholders,
      lastJoinSessionId:
        typeof r.lastJoinSessionId === 'string'
          ? r.lastJoinSessionId
          : undefined,
      createdAtMs:
        typeof r.createdAtMs === 'number' ? r.createdAtMs : Date.now(),
      updatedAtMs:
        typeof r.updatedAtMs === 'number' ? r.updatedAtMs : Date.now(),
    })
  }
  return out
}

function readJoinMemory(): JoinMemoryStore {
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

/** Pass-1 device memory → campaign seeds (name-keyed). */
export function listRememberedCampaignSeeds(
  characterId: string,
): LiveSheetCampaignPill[] {
  if (!characterId.trim()) return []
  const rows = readJoinMemory()[characterId] ?? []
  const byKey = new Map<string, LiveSheetCampaignPill>()
  for (const row of rows) {
    if (!row || typeof row.name !== 'string' || !row.name.trim()) continue
    const key = normalizeCampaignName(row.name)
    if (!key || byKey.has(key)) continue
    byKey.set(key, {
      key,
      name: row.name.trim(),
      lastJoinSessionId:
        typeof row.id === 'string' && row.id.trim() ? row.id.trim() : undefined,
    })
  }
  return [...byKey.values()]
}

/**
 * Seed character journals from pass-1 localStorage when the save has none yet.
 * Does not overwrite existing journals.
 */
export function seedSheetCampaignsFromJoinMemory(
  characterId: string,
  existing: LiveSheetCampaign[],
  legacyPlayNotes?: string,
): LiveSheetCampaign[] {
  if (existing.length > 0) return existing
  const seeds = listRememberedCampaignSeeds(characterId)
  if (seeds.length === 0) return existing
  const notes = legacyPlayNotes?.trim() ?? ''
  return seeds.map((seed, index) =>
    emptyLiveSheetCampaign(seed.name, {
      lastJoinSessionId: seed.lastJoinSessionId,
      notes: index === 0 ? notes : '',
    }),
  )
}

/**
 * Join / rejoin: reuse tab when normalized **name** matches; else create.
 * Optionally seeds notes from legacy global `playNotes` on first campaign.
 */
export function ensureSheetCampaignForJoin(
  campaigns: LiveSheetCampaign[],
  input: {
    name: string
    joinSessionId?: string
    legacyPlayNotes?: string
    nowMs?: number
  },
): { campaigns: LiveSheetCampaign[]; campaign: LiveSheetCampaign; created: boolean } {
  const display = input.name.trim() || 'Campaign'
  const key = normalizeCampaignName(display)
  const now = input.nowMs ?? Date.now()
  const existing = campaigns.find((c) => c.key === key)
  if (existing) {
    const nextSessionId =
      input.joinSessionId ?? existing.lastJoinSessionId
    if (
      existing.name === display &&
      existing.lastJoinSessionId === nextSessionId
    ) {
      return { campaigns, campaign: existing, created: false }
    }
    const next: LiveSheetCampaign = {
      ...existing,
      name: display,
      lastJoinSessionId: nextSessionId,
      updatedAtMs: now,
    }
    return {
      campaigns: campaigns.map((c) => (c.key === key ? next : c)),
      campaign: next,
      created: false,
    }
  }
  const seedNotes =
    campaigns.length === 0 && input.legacyPlayNotes?.trim()
      ? input.legacyPlayNotes
      : ''
  const created = emptyLiveSheetCampaign(display, {
    notes: seedNotes,
    lastJoinSessionId: input.joinSessionId,
    nowMs: now,
  })
  return {
    campaigns: [created, ...campaigns],
    campaign: created,
    created: true,
  }
}

/** @deprecated Prefer {@link ensureSheetCampaignForJoin} on character journals. */
export function rememberJoinedCampaign(
  characterId: string,
  campaign: { id: string; name: string },
): LiveSheetCampaignPill[] {
  const id = characterId.trim()
  const sessionId = campaign.id.trim()
  const name = campaign.name.trim()
  if (!id || !name) return listRememberedCampaignSeeds(characterId)

  const store = readJoinMemory()
  const prev = store[id] ?? []
  const key = normalizeCampaignName(name)
  const next = [
    { id: sessionId || key, name },
    ...prev.filter((row) => normalizeCampaignName(row.name) !== key),
  ]
  store[id] = next
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    }
  } catch {
    /* quota */
  }
  return listRememberedCampaignSeeds(characterId)
}

/**
 * Pills for Campaigns mode from character journals (+ optional live join bump).
 */
export function buildCampaignPills(opts: {
  campaigns: LiveSheetCampaign[]
  joined?: { name: string; sessionId?: string } | null
}): LiveSheetCampaignPill[] {
  let list = opts.campaigns
  if (opts.joined?.name.trim()) {
    list = ensureSheetCampaignForJoin(list, {
      name: opts.joined.name,
      joinSessionId: opts.joined.sessionId,
    }).campaigns
  }
  return list.map((c) => ({
    key: c.key,
    name: c.name,
    lastJoinSessionId: c.lastJoinSessionId,
  }))
}

export function findSheetCampaign(
  campaigns: LiveSheetCampaign[],
  key: string,
): LiveSheetCampaign | undefined {
  const k = normalizeCampaignName(key)
  return campaigns.find((c) => c.key === k)
}

export function patchSheetCampaign(
  campaigns: LiveSheetCampaign[],
  key: string,
  patch: Partial<
    Pick<LiveSheetCampaign, 'notes' | 'placeholders' | 'name' | 'lastJoinSessionId'>
  >,
  nowMs = Date.now(),
): LiveSheetCampaign[] {
  const k = normalizeCampaignName(key)
  return campaigns.map((c) => {
    if (c.key !== k) return c
    return {
      ...c,
      ...patch,
      name: patch.name != null ? patch.name.trim() || c.name : c.name,
      notes: patch.notes != null ? patch.notes : c.notes,
      placeholders:
        patch.placeholders != null ? patch.placeholders : c.placeholders,
      updatedAtMs: nowMs,
    }
  })
}

export function deleteSheetCampaign(
  campaigns: LiveSheetCampaign[],
  key: string,
): LiveSheetCampaign[] {
  const k = normalizeCampaignName(key)
  return campaigns.filter((c) => c.key !== k)
}

export function campaignDeleteConfirmMessage(campaignName: string): string {
  return permanentDeleteConfirmMessage(campaignName.trim() || 'this campaign')
}

export function confirmDeleteSheetCampaign(campaignName: string): boolean {
  return globalThis.confirm(campaignDeleteConfirmMessage(campaignName))
}

export const CAMPAIGN_MERGE_SOURCE_REMOVED_COPY =
  'All People, Places, Things, Notes, and wiki links from the source campaign move into the target. The source campaign tab is removed after a successful merge.'

export function campaignMergeConfirmMessage(
  sourceName: string,
  targetName: string,
): string {
  const source = sourceName.trim() || 'source'
  const target = targetName.trim() || 'target'
  return `Merge "${source}" into "${target}"? ${CAMPAIGN_MERGE_SOURCE_REMOVED_COPY}`
}

export function confirmMergeSheetCampaigns(
  sourceName: string,
  targetName: string,
): boolean {
  return globalThis.confirm(campaignMergeConfirmMessage(sourceName, targetName))
}

/**
 * Merge source → target: union placeholders (remap colliding source ids),
 * append notes, then remove source tab.
 */
export function mergeSheetCampaigns(
  campaigns: LiveSheetCampaign[],
  sourceKey: string,
  targetKey: string,
  nowMs = Date.now(),
): LiveSheetCampaign[] {
  const sKey = normalizeCampaignName(sourceKey)
  const tKey = normalizeCampaignName(targetKey)
  if (!sKey || !tKey || sKey === tKey) return campaigns
  const source = campaigns.find((c) => c.key === sKey)
  const target = campaigns.find((c) => c.key === tKey)
  if (!source || !target) return campaigns

  const idMap = new Map<string, string>()
  const mergedPlaceholders = [...target.placeholders]
  const targetIds = new Set(target.placeholders.map((p) => p.id))

  for (const stub of source.placeholders) {
    if (!targetIds.has(stub.id)) {
      mergedPlaceholders.push(stub)
      targetIds.add(stub.id)
      continue
    }
    const remapped = {
      ...stub,
      id: createGmId(stub.kind),
    }
    idMap.set(`${stub.kind}:${stub.id}`, remapped.id)
    mergedPlaceholders.push(remapped)
    targetIds.add(remapped.id)
  }

  const sourceNotes = remapContentLinkIds(source.notes, idMap)
  const remappedPlaceholders = mergedPlaceholders.map((row) => {
    if (!idMap.size) return row
    const nextNotes = remapContentLinkIds(row.notes, idMap)
    return nextNotes === row.notes ? row : { ...row, notes: nextNotes }
  })

  let mergedNotes = target.notes
  if (sourceNotes.trim()) {
    mergedNotes = target.notes.trim()
      ? `${target.notes.trim()}\n\n— Merged from ${source.name} —\n${sourceNotes}`
      : sourceNotes
  }

  const nextTarget: LiveSheetCampaign = {
    ...target,
    notes: mergedNotes,
    placeholders: remappedPlaceholders,
    updatedAtMs: nowMs,
  }

  return campaigns
    .filter((c) => c.key !== sKey)
    .map((c) => (c.key === tKey ? nextTarget : c))
}

export function addSheetCampaignPlaceholder(
  campaigns: LiveSheetCampaign[],
  campaignKey: string,
  input: { kind: GmContentLinkKind; name: string; notes?: string },
  nowMs = Date.now(),
): { campaigns: LiveSheetCampaign[]; entity: GmPlaceholderEntity | null } {
  const campaign = findSheetCampaign(campaigns, campaignKey)
  if (!campaign) return { campaigns, entity: null }
  const entity = createPlaceholderEntity(input)
  return {
    campaigns: patchSheetCampaign(
      campaigns,
      campaignKey,
      { placeholders: [entity, ...campaign.placeholders] },
      nowMs,
    ),
    entity,
  }
}

export function patchSheetCampaignPlaceholder(
  campaigns: LiveSheetCampaign[],
  campaignKey: string,
  placeholderId: string,
  patch: Partial<Pick<GmPlaceholderEntity, 'name' | 'notes'>>,
  nowMs = Date.now(),
): LiveSheetCampaign[] {
  const campaign = findSheetCampaign(campaigns, campaignKey)
  if (!campaign) return campaigns
  let changed = false
  const placeholders = campaign.placeholders.map((row) => {
    if (row.id !== placeholderId) return row
    changed = true
    return {
      ...row,
      name: patch.name != null ? patch.name.trim() || row.name : row.name,
      notes: patch.notes != null ? patch.notes : row.notes,
    }
  })
  if (!changed) return campaigns
  return patchSheetCampaign(campaigns, campaignKey, { placeholders }, nowMs)
}

export function removeSheetCampaignPlaceholder(
  campaigns: LiveSheetCampaign[],
  campaignKey: string,
  placeholderId: string,
  nowMs = Date.now(),
): LiveSheetCampaign[] {
  const campaign = findSheetCampaign(campaigns, campaignKey)
  if (!campaign) return campaigns
  const placeholders = campaign.placeholders.filter(
    (row) => row.id !== placeholderId,
  )
  if (placeholders.length === campaign.placeholders.length) return campaigns
  return patchSheetCampaign(campaigns, campaignKey, { placeholders }, nowMs)
}

export function campaignsSubTabKind(
  tab: Exclude<CampaignsSubTabId, 'notes'>,
): GmContentLinkKind {
  return KIND_BY_SUB[tab]
}

/** Map content-link kind → Campaigns PPTN sub-tab (sheet nav; not Hub chrome). */
export function campaignsSubTabForContentKind(
  kind: GmContentLinkKind,
): CampaignsSubTabId {
  switch (kind) {
    case 'person':
    case 'npc':
    case 'pc':
      return 'people'
    case 'place':
      return 'places'
    case 'thing':
      return 'things'
    case 'note':
      return 'notes'
  }
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
        body: 'No people stubs yet for this campaign. Add a person here or create one from Notes with @ or Insert link.',
      }
    case 'places':
      return {
        title: 'Places',
        body: 'No places yet for this campaign. Add a place here or create one from Notes with @ or Insert link.',
      }
    case 'things':
      return {
        title: 'Things',
        body: 'No things yet for this campaign. Add a thing here or create one from Notes with @ or Insert link. Character Gear stays on the strip.',
      }
    case 'notes':
      return {
        title: 'Notes',
        body: 'Capture clues, names, objectives, and events during play. Type @ to link People, Places, and Things.',
      }
  }
}

/** @deprecated Use character `sheetCampaigns` + {@link buildCampaignPills}. */
export function listRememberedCampaigns(
  characterId: string,
): Array<{ id: string; name: string }> {
  return listRememberedCampaignSeeds(characterId).map((p) => ({
    id: p.lastJoinSessionId ?? p.key,
    name: p.name,
  }))
}
