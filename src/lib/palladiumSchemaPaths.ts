/**
 * Canonical JSON Schema (draft 2020-12) and catalog JSON locations.
 * Schemas: `src/data/schemas/` · authored catalog data: `src/data/content/`
 */
export const PALLADIUM_SCHEMAS_DIR = 'src/data/schemas' as const

export const PALLADIUM_CONTENT_DIR = 'src/data/content' as const

export const PALLADIUM_SKILL_SCHEMA_PATH =
  `${PALLADIUM_SCHEMAS_DIR}/palladium-skill.schema.json` as const

export const PALLADIUM_RACE_SCHEMA_PATH =
  `${PALLADIUM_SCHEMAS_DIR}/palladium-race.schema.json` as const

export const PALLADIUM_OCC_SCHEMA_PATH =
  `${PALLADIUM_SCHEMAS_DIR}/palladium-occ.schema.json` as const

export const PALLADIUM_WEAPON_PROFICIENCY_SCHEMA_PATH =
  `${PALLADIUM_SCHEMAS_DIR}/palladium-weapon-proficiency.schema.json` as const

export const STANDARD_MODERN_WEAPON_PROGRESSION_SCHEMA_PATH =
  `${PALLADIUM_SCHEMAS_DIR}/standard-modern-weapon-progression.schema.json` as const

export const PALLADIUM_HAND_TO_HAND_SCHEMA_PATH =
  `${PALLADIUM_SCHEMAS_DIR}/palladium-hth.schema.json` as const

export const PALLADIUM_TALENT_SCHEMA_PATH =
  `${PALLADIUM_SCHEMAS_DIR}/palladium-talent.schema.json` as const

export const PALLADIUM_MORPHUS_TABLE_SCHEMA_PATH =
  `${PALLADIUM_SCHEMAS_DIR}/palladium-morphus-table.schema.json` as const

export const PALLADIUM_MORPHUS_CHARACTERISTIC_SCHEMA_PATH =
  `${PALLADIUM_SCHEMAS_DIR}/palladium-morphus.schema.json` as const

/** `$id` inside `palladium-skill.schema.json` — use for `$schema` pointers in skill JSON. */
export const PALLADIUM_SKILL_SCHEMA_ID =
  'https://megaverse-companion.local/schemas/palladium-skill.schema.json' as const

/** `$id` inside `palladium-race.schema.json`. */
export const PALLADIUM_RACE_SCHEMA_ID =
  'https://megaverse-companion.local/schemas/palladium-race.schema.json' as const

export const PALLADIUM_OCC_SCHEMA_ID =
  'https://megaverse-companion.local/schemas/palladium-occ.schema.json' as const

/** `$id` inside `palladium-weapon-proficiency.schema.json`. */
export const PALLADIUM_WEAPON_PROFICIENCY_SCHEMA_ID =
  'https://megaverse-companion.local/schemas/palladium-weapon-proficiency.schema.json' as const

/** `$id` inside `standard-modern-weapon-progression.schema.json`. */
export const STANDARD_MODERN_WEAPON_PROGRESSION_SCHEMA_ID =
  'https://megaverse-companion.local/schemas/standard-modern-weapon-progression.schema.json' as const

export const PALLADIUM_HAND_TO_HAND_SCHEMA_ID =
  'https://megaverse-companion.local/schemas/palladium-hth.schema.json' as const

export const PALLADIUM_TALENT_SCHEMA_ID =
  'https://megaverse-companion.local/schemas/palladium-talent.schema.json' as const

export const PALLADIUM_MORPHUS_TABLE_SCHEMA_ID =
  'https://megaverse-companion.local/schemas/palladium-morphus-table.schema.json' as const

export const PALLADIUM_MORPHUS_CHARACTERISTIC_SCHEMA_ID =
  'https://megaverse-companion.local/schemas/palladium-morphus.schema.json' as const

export const PALLADIUM_SKILL_CATALOG_JSON_PATH =
  `${PALLADIUM_CONTENT_DIR}/palladiumSkills.json` as const

/** Merged player + npc + gm_approval race pools. */
export const PALLADIUM_RACES_DIR = `${PALLADIUM_CONTENT_DIR}/races` as const

export const PALLADIUM_RACE_PLAYER_JSON_PATH =
  `${PALLADIUM_RACES_DIR}/player.json` as const

export const PALLADIUM_RACE_NPC_JSON_PATH =
  `${PALLADIUM_RACES_DIR}/npc.json` as const

export const PALLADIUM_RACE_GM_APPROVAL_JSON_PATH =
  `${PALLADIUM_RACES_DIR}/gm_approval.json` as const

/** @deprecated Use {@link PALLADIUM_RACES_DIR} — legacy single-file path. */
export const PALLADIUM_RACE_CATALOG_JSON_PATH =
  PALLADIUM_RACE_PLAYER_JSON_PATH

/** One JSON array per source book (same slug as `progression/xp_tables/`). */
export const PALLADIUM_OCCS_DIR = `${PALLADIUM_CONTENT_DIR}/occs` as const

export const PALLADIUM_HAND_TO_HAND_CATALOG_JSON_PATH =
  `${PALLADIUM_CONTENT_DIR}/palladiumHandToHand.json` as const

export const PALLADIUM_TALENT_CATALOG_JSON_PATH =
  `${PALLADIUM_CONTENT_DIR}/palladiumTalents.json` as const

export const WEAPON_PROFICIENCIES_CATALOG_JSON_PATH =
  `${PALLADIUM_CONTENT_DIR}/weapon_proficiencies.json` as const

export const STANDARD_MODERN_WEAPON_PROGRESSION_JSON_PATH =
  `${PALLADIUM_CONTENT_DIR}/standard_modern_weapon_progression.json` as const

/** One JSON file per Morphus table (hubs and trait tables). */
export const PALLADIUM_MORPHUS_TABLES_DIR =
  `${PALLADIUM_CONTENT_DIR}/morphus/tables` as const

export const SKILL_TRAIT_REGISTRY_JSON_PATH =
  `${PALLADIUM_CONTENT_DIR}/skill_trait_registry.json` as const

export const PALLADIUM_XP_TABLE_SCHEMA_PATH =
  `${PALLADIUM_SCHEMAS_DIR}/palladium-xp-table.schema.json` as const

export const PALLADIUM_XP_TABLE_BOOK_SCHEMA_PATH =
  `${PALLADIUM_SCHEMAS_DIR}/palladium-xp-table-book.schema.json` as const

export const PALLADIUM_XP_TABLE_SCHEMA_ID =
  'https://megaverse-companion.local/schemas/palladium-xp-table.schema.json' as const

export const PALLADIUM_XP_TABLE_BOOK_SCHEMA_ID =
  'https://megaverse-companion.local/schemas/palladium-xp-table-book.schema.json' as const

/** One JSON file per source book (`tables[]` bundles). */
export const PALLADIUM_XP_TABLES_DIR =
  `${PALLADIUM_CONTENT_DIR}/progression/xp_tables` as const
