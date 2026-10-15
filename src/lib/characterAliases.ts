/**
 * Character aliases + join-table projected name (live sheet / Join Table).
 * Pillar 9: one resolver for sheet profile, join picker, and peer-facing seat labels.
 * Nightbane: separate Facade (`aliases`) and Morphus (`morphusAliases`) lists;
 * peers resolve via {@link presentedForm}.
 * GM Hub keeps using canonical {@link Character.name} from party.snapshot.
 */

import type { ActiveForm, Character, CharacterAlias } from '../types'
import { isCharacterNameFilled } from './characterIdentity'

/** Sentinel select value — project the real character name at the table. */
export const TABLE_PROJECTED_REAL_NAME_ID = '' as const

/** Sentinel select value — open Add alias dialog on Join Table (not a projection id). */
export const TABLE_ADD_ALIAS_OPTION_ID = '__add_alias__' as const

export const JOIN_ADD_ALIAS_ENTER_LABEL = 'Enter table with alias'
export const JOIN_ADD_ALIAS_CANCEL_LABEL = 'Cancel'
export const JOIN_ADD_ALIAS_OPTION_LABEL = 'Add alias'

export function newAliasId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `alias_${crypto.randomUUID()}`
  }
  return `alias_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function normalizeAliases(
  aliases: readonly CharacterAlias[] | undefined | null,
): CharacterAlias[] {
  if (!aliases?.length) return []
  const out: CharacterAlias[] = []
  for (const row of aliases) {
    if (!row || typeof row !== 'object') continue
    const id = typeof row.id === 'string' ? row.id.trim() : ''
    const name = typeof row.name === 'string' ? row.name.trim() : ''
    if (!id || !name) continue
    out.push({ id, name })
  }
  return out
}

export function normalizePresentedForm(
  form: ActiveForm | undefined | null,
  supportsDualForm: boolean,
): ActiveForm {
  if (!supportsDualForm) return 'primary'
  return form === 'morphus' ? 'morphus' : 'primary'
}

/** Alias list for one form (Morphus list is independent of Facade). */
export function aliasesForForm(
  character: Pick<Character, 'aliases' | 'morphusAliases'>,
  form: ActiveForm,
): CharacterAlias[] {
  return normalizeAliases(
    form === 'morphus' ? character.morphusAliases : character.aliases,
  )
}

export function projectedAliasIdForForm(
  character: Pick<
    Character,
    'tableProjectedAliasId' | 'morphusTableProjectedAliasId'
  >,
  form: ActiveForm,
): string | null {
  if (form === 'morphus') {
    const id = character.morphusTableProjectedAliasId
    return typeof id === 'string' && id.trim() ? id.trim() : null
  }
  const id = character.tableProjectedAliasId
  return typeof id === 'string' && id.trim() ? id.trim() : null
}

export function addCharacterAlias(
  aliases: readonly CharacterAlias[] | undefined,
  name: string,
  id = newAliasId(),
): CharacterAlias[] {
  const trimmed = name.trim()
  if (!trimmed) return normalizeAliases(aliases)
  return [...normalizeAliases(aliases), { id, name: trimmed }]
}

export function removeCharacterAlias(
  aliases: readonly CharacterAlias[] | undefined,
  aliasId: string,
): CharacterAlias[] {
  return normalizeAliases(aliases).filter((a) => a.id !== aliasId)
}

export function renameCharacterAlias(
  aliases: readonly CharacterAlias[] | undefined,
  aliasId: string,
  name: string,
): CharacterAlias[] {
  const trimmed = name.trim()
  return normalizeAliases(aliases).map((a) =>
    a.id === aliasId ? { ...a, name: trimmed || a.name } : a,
  )
}

/**
 * Resolve the name peers see at the table for a form.
 * Empty / unknown projected alias id → real character name.
 */
export function resolveTableProjectedName(
  character: Pick<
    Character,
    | 'name'
    | 'aliases'
    | 'morphusAliases'
    | 'tableProjectedAliasId'
    | 'morphusTableProjectedAliasId'
    | 'presentedForm'
  >,
  projectedAliasId?: string | null,
  form: ActiveForm = normalizePresentedForm(character.presentedForm, true),
): string {
  const realName = character.name.trim() || 'Unnamed'
  const id = (
    projectedAliasId !== undefined
      ? projectedAliasId
      : projectedAliasIdForForm(character, form)
  )?.trim()
  if (!id || id === TABLE_PROJECTED_REAL_NAME_ID) return realName
  const match = aliasesForForm(character, form).find((a) => a.id === id)
  return match?.name?.trim() || realName
}

export type TableProjectionOption = {
  /** Empty string = real character name; {@link TABLE_ADD_ALIAS_OPTION_ID} = add flow. */
  id: string
  label: string
  isRealName: boolean
  /** True for the Join Table “Add alias” row (not a projection target). */
  isAddAlias?: boolean
}

/** Familiar Surface options for Join Session “Name at the table” picker. */
export function listTableProjectionOptions(
  character: Pick<Character, 'name' | 'aliases' | 'morphusAliases'>,
  form: ActiveForm = 'primary',
): TableProjectionOption[] {
  const real =
    character.name.trim() ||
    (isCharacterNameFilled(character.name) ? character.name.trim() : 'Character name')
  const options: TableProjectionOption[] = [
    {
      id: TABLE_PROJECTED_REAL_NAME_ID,
      label: real.trim() || 'Character name',
      isRealName: true,
    },
  ]
  for (const alias of aliasesForForm(character, form)) {
    options.push({ id: alias.id, label: alias.name, isRealName: false })
  }
  options.push({
    id: TABLE_ADD_ALIAS_OPTION_ID,
    label: JOIN_ADD_ALIAS_OPTION_LABEL,
    isRealName: false,
    isAddAlias: true,
  })
  return options
}

/**
 * Add a new alias on Join Table and select it as the projected name.
 * Returns null when the draft name is empty after trim.
 */
export function commitJoinTableNewAlias<
  T extends Pick<
    Character,
    | 'aliases'
    | 'morphusAliases'
    | 'tableProjectedAliasId'
    | 'morphusTableProjectedAliasId'
  >,
>(
  character: T,
  aliasName: string,
  id = newAliasId(),
  form: ActiveForm = 'primary',
): (T & {
  aliases: CharacterAlias[]
  morphusAliases: CharacterAlias[]
  tableProjectedAliasId: string | null
  morphusTableProjectedAliasId: string | null
}) | null {
  const trimmed = aliasName.trim()
  if (!trimmed) return null
  if (form === 'morphus') {
    return {
      ...character,
      aliases: normalizeAliases(character.aliases),
      morphusAliases: addCharacterAlias(character.morphusAliases, trimmed, id),
      tableProjectedAliasId: character.tableProjectedAliasId ?? null,
      morphusTableProjectedAliasId: id,
    }
  }
  return {
    ...character,
    aliases: addCharacterAlias(character.aliases, trimmed, id),
    morphusAliases: normalizeAliases(character.morphusAliases),
    tableProjectedAliasId: id,
    morphusTableProjectedAliasId: character.morphusTableProjectedAliasId ?? null,
  }
}

/** Persist-safe default when an alias was deleted. */
export function coerceTableProjectedAliasId(
  aliases: readonly CharacterAlias[] | undefined,
  projectedAliasId: string | null | undefined,
): string | null {
  const id = (projectedAliasId ?? '').trim()
  if (!id) return null
  return normalizeAliases(aliases).some((a) => a.id === id) ? id : null
}
