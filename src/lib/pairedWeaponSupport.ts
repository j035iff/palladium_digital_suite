/** Ancient one-handed melee W.P. ids that can support paired-weapon fighting. */
export const PAIRED_WEAPON_SUPPORT_WP_IDS = [
  'wp_sword',
  'wp_knife',
  'wp_battle_axe',
  'wp_blunt',
  'wp_chain',
  'wp_whip',
] as const

export const WP_PAIRED_WEAPONS_SKILL_ID = 'wp_paired_weapons' as const

const SUPPORT_SET = new Set<string>(PAIRED_WEAPON_SUPPORT_WP_IDS)

export function hasPairedWeaponSupportWp(skillIds: Iterable<string>): boolean {
  for (const id of skillIds) {
    if (SUPPORT_SET.has(id)) return true
  }
  return false
}

export function pairedWeaponsSupportBlockReason(
  skillIds: Iterable<string>,
): string | null {
  if (hasPairedWeaponSupportWp(skillIds)) return null
  return 'Requires at least one ancient one-handed W.P. (e.g. Sword, Knife) before Paired Weapons.'
}

export function isPairedWeaponsSkillId(skillId: string): boolean {
  return skillId === WP_PAIRED_WEAPONS_SKILL_ID
}
