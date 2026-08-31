import { formatGenreSlug, isGenreId, type GenreId } from '../../data/genres'
import {
  isGmConversionPolicy,
  type GmConversionPolicy,
} from './sessionTypes'

/**
 * Campaign Creation Forge — option registry.
 *
 * v1 Identity (`name` + `hostGenreId`) plus Rules (`conversionPolicy`).
 * Add future campaign choices as new {@link CampaignForgeOptionDef} rows
 * (and a renderer `kind` if needed). Do not fork a second campaign-create form.
 */

export type CampaignForgeOptionKind = 'text' | 'genreSelect' | 'select'

export type CampaignForgeGroupId = 'identity' | 'rules'

export type CampaignForgeOptionId = 'name' | 'hostGenreId' | 'conversionPolicy'

export type CampaignForgeValidationCtx = {
  takenNames: readonly string[]
}

export type CampaignForgeGroupDef = {
  id: CampaignForgeGroupId
  label: string
  description: string
}

export type CampaignForgeSelectChoice = {
  value: string
  label: string
  description?: string
}

export type CampaignForgeOptionDef = {
  id: CampaignForgeOptionId
  groupId: CampaignForgeGroupId
  kind: CampaignForgeOptionKind
  label: string
  hint: string
  required: boolean
  defaultValue: string
  emptyLabel?: string
  choices?: readonly CampaignForgeSelectChoice[]
  validate: (value: string, ctx: CampaignForgeValidationCtx) => string[]
}

export type CampaignForgeDraft = {
  values: Record<CampaignForgeOptionId, string>
}

export const CAMPAIGN_FORGE_GROUPS: readonly CampaignForgeGroupDef[] = [
  {
    id: 'identity',
    label: 'Identity',
    description: 'Name the table and lock the host setting for this campaign.',
  },
  {
    id: 'rules',
    label: 'Rules',
    description:
      'How this table treats characters from other Palladium lines. Locked after create.',
  },
]

export const CAMPAIGN_CONVERSION_RULES: readonly CampaignForgeSelectChoice[] = [
  {
    value: 'disable_non_native',
    label: 'Disable non-native',
    description:
      'Keep native scale. Grey out host-illegal gear and skills. No M.D.C. ↔ S.D.C. conversion.',
  },
  {
    value: 'apply_conversion',
    label: 'Apply conversion',
    description:
      'Request session-duration conversion in the view-model only. Structural mapping is not implemented yet — assets still lock to the host whitelist. Saves stay native.',
  },
]

function normalizeCampaignName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function validateCampaignName(
  value: string,
  ctx: CampaignForgeValidationCtx,
): string[] {
  const name = normalizeCampaignName(value)
  if (!name) return ['Give this campaign a name.']
  const taken = ctx.takenNames.some(
    (existing) =>
      normalizeCampaignName(existing).toLowerCase() === name.toLowerCase(),
  )
  if (taken) return [`“${name}” is already in use. Choose a unique name.`]
  return []
}

function validateHostGenre(value: string): string[] {
  if (!value.trim()) return ['Select a host genre.']
  if (!isGenreId(value)) return ['That setting is not available yet.']
  return []
}

function validateConversionPolicy(value: string): string[] {
  if (!value.trim()) return ['Select conversion rules.']
  if (!isGmConversionPolicy(value)) {
    return ['That conversion rule is not available.']
  }
  return []
}

export const CAMPAIGN_FORGE_OPTIONS: readonly CampaignForgeOptionDef[] = [
  {
    id: 'name',
    groupId: 'identity',
    kind: 'text',
    label: 'Campaign name',
    hint: 'Must be unique among campaigns on this machine.',
    required: true,
    defaultValue: '',
    validate: validateCampaignName,
  },
  {
    id: 'hostGenreId',
    groupId: 'identity',
    kind: 'genreSelect',
    label: 'Host genre',
    hint: 'Locked for the life of the campaign. Upcoming settings stay visible but cannot be selected.',
    required: true,
    defaultValue: '',
    validate: validateHostGenre,
  },
  {
    id: 'conversionPolicy',
    groupId: 'rules',
    kind: 'select',
    label: 'Conversion rules',
    hint: 'Locked for the life of the campaign. Applies when a character was built in a different setting than this table.',
    required: true,
    defaultValue: '',
    emptyLabel: 'Select conversion rules',
    choices: CAMPAIGN_CONVERSION_RULES,
    validate: validateConversionPolicy,
  },
]

export function blankCampaignForgeDraft(): CampaignForgeDraft {
  const values = {} as Record<CampaignForgeOptionId, string>
  for (const option of CAMPAIGN_FORGE_OPTIONS) {
    values[option.id] = option.defaultValue
  }
  return { values }
}

export function campaignForgeOptionById(
  id: CampaignForgeOptionId,
): CampaignForgeOptionDef {
  const row = CAMPAIGN_FORGE_OPTIONS.find((option) => option.id === id)
  if (!row) {
    throw new Error(`Unknown campaign forge option: ${id}`)
  }
  return row
}

export function patchCampaignForgeValue(
  draft: CampaignForgeDraft,
  id: CampaignForgeOptionId,
  value: string,
): CampaignForgeDraft {
  return { values: { ...draft.values, [id]: value } }
}

export function optionsForGroup(
  groupId: CampaignForgeGroupId,
): readonly CampaignForgeOptionDef[] {
  return CAMPAIGN_FORGE_OPTIONS.filter((option) => option.groupId === groupId)
}

export type CampaignForgeOptionIssue = {
  optionId: CampaignForgeOptionId
  messages: string[]
}

export function campaignForgeIssues(
  draft: CampaignForgeDraft,
  ctx: CampaignForgeValidationCtx,
): CampaignForgeOptionIssue[] {
  return CAMPAIGN_FORGE_OPTIONS.flatMap((option) => {
    const messages = option.validate(draft.values[option.id] ?? '', ctx)
    return messages.length > 0 ? [{ optionId: option.id, messages }] : []
  })
}

export function campaignForgeReady(
  draft: CampaignForgeDraft,
  ctx: CampaignForgeValidationCtx,
): boolean {
  return campaignForgeIssues(draft, ctx).length === 0
}

export function readCampaignForgeName(draft: CampaignForgeDraft): string {
  return normalizeCampaignName(draft.values.name ?? '')
}

export function readCampaignForgeGenre(
  draft: CampaignForgeDraft,
): GenreId | null {
  const raw = draft.values.hostGenreId ?? ''
  return isGenreId(raw) ? raw : null
}

export function readCampaignForgeConversion(
  draft: CampaignForgeDraft,
): GmConversionPolicy | null {
  const raw = draft.values.conversionPolicy ?? ''
  return isGmConversionPolicy(raw) ? raw : null
}

export function conversionRuleLabel(policy: GmConversionPolicy): string {
  return (
    CAMPAIGN_CONVERSION_RULES.find((row) => row.value === policy)?.label ??
    policy
  )
}

export function conversionRuleDescription(
  policy: GmConversionPolicy,
): string | undefined {
  return CAMPAIGN_CONVERSION_RULES.find((row) => row.value === policy)
    ?.description
}

export function campaignForgeConfirmLabel(draft: CampaignForgeDraft): string {
  const genre = readCampaignForgeGenre(draft)
  const genreLabel = genre ? formatGenreSlug(genre) : 'this'
  return `Are you sure you want to create a new ${genreLabel} Campaign?`
}
