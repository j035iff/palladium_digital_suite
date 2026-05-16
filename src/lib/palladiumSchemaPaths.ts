/**
 * Canonical JSON Schema (draft 2020-12) locations for Palladium **skill**, **weapon proficiency (W.P.)**,
 * and **bundled standard modern W.P. progression** (`usesStandardModernProgression` on modern W.P. rows).
 * Schemas live at repo root under `schemas/` (authored in Megaverse Companion v0; compiled by `npm run validate:schemas`).
 */
export const PALLADIUM_SKILL_SCHEMA_PATH = 'schemas/palladium-skill.schema.json' as const

export const PALLADIUM_WEAPON_PROFICIENCY_SCHEMA_PATH =
  'schemas/palladium-weapon-proficiency.schema.json' as const

/** Shared modern W.P. ladder bundles — `$ref`s `palladium-weapon-proficiency` defs `levelTier` / `skillPercentageRoll`. */
export const STANDARD_MODERN_WEAPON_PROGRESSION_SCHEMA_PATH =
  'schemas/standard-modern-weapon-progression.schema.json' as const

/** `$id` inside `palladium-skill.schema.json` — use for `$schema` pointers in skill JSON. */
export const PALLADIUM_SKILL_SCHEMA_ID =
  'https://megaverse-companion.local/schemas/palladium-skill.schema.json' as const

/** `$id` inside `palladium-weapon-proficiency.schema.json`. */
export const PALLADIUM_WEAPON_PROFICIENCY_SCHEMA_ID =
  'https://megaverse-companion.local/schemas/palladium-weapon-proficiency.schema.json' as const

/** `$id` inside `standard-modern-weapon-progression.schema.json`. */
export const STANDARD_MODERN_WEAPON_PROGRESSION_SCHEMA_ID =
  'https://megaverse-companion.local/schemas/standard-modern-weapon-progression.schema.json' as const

/** Imported skill catalog (Nightbane v0 data; must not be named `skills.json` — shadows `library/skills/`). */
export const PALLADIUM_SKILL_CATALOG_JSON_PATH =
  'src/data/library/palladiumSkills.json' as const

export const WEAPON_PROFICIENCIES_CATALOG_JSON_PATH =
  'src/data/library/weapon_proficiencies.json' as const

export const STANDARD_MODERN_WEAPON_PROGRESSION_JSON_PATH =
  'src/data/library/standard_modern_weapon_progression.json' as const
