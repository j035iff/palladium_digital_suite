import type {
  CharacterRootState,
  DerivedSheetSkill,
  FormState,
  HostGenreRuntimeFlags,
  InventoryItem,
} from '../types'

const RUNTIME_STRIP_KEYS: (keyof HostGenreRuntimeFlags)[] = ['isHostGenreLocked']

function stripRuntimeFlags<T extends HostGenreRuntimeFlags>(row: T): Omit<T, keyof HostGenreRuntimeFlags> {
  const out = { ...row }
  for (const key of RUNTIME_STRIP_KEYS) {
    delete out[key]
  }
  return out
}

function stripFormSkills(skills: DerivedSheetSkill[]): FormState['skills'] {
  return skills.map((s) => stripRuntimeFlags(s))
}

function stripFormBranch(branch: FormState): FormState {
  return {
    ...branch,
    skills: stripFormSkills(branch.skills as DerivedSheetSkill[]),
  }
}

function stripInventoryItem(item: InventoryItem): InventoryItem {
  if (!('isHostGenreLocked' in item)) return item
  const copy = { ...item } as InventoryItem & HostGenreRuntimeFlags
  for (const key of RUNTIME_STRIP_KEYS) {
    delete copy[key]
  }
  return copy
}

/**
 * Reverse serialization (master_flow.md §2): remove middleware-injected flags
 * before persisting the pristine save layout.
 */
export function serializeCharacterRootForSave(
  state: CharacterRootState,
): CharacterRootState {
  return {
    ...state,
    facade: stripFormBranch(state.facade),
    morphus: stripFormBranch(state.morphus),
  }
}

export function serializeInventoryForSave(
  items: readonly InventoryItem[],
): InventoryItem[] {
  return items.map(stripInventoryItem)
}
