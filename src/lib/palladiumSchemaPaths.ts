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

export const PALLADIUM_PSIONIC_SCHEMA_PATH =
  `${PALLADIUM_SCHEMAS_DIR}/palladium-psionic.schema.json` as const

export const PALLADIUM_FEATURE_COMMON_SCHEMA_PATH =
  `${PALLADIUM_SCHEMAS_DIR}/palladium-feature-common.schema.json` as const

export const PALLADIUM_MAGIC_SCHEMA_PATH =
  `${PALLADIUM_SCHEMAS_DIR}/palladium-magic.schema.json` as const

export const PALLADIUM_MORPHUS_TABLE_SCHEMA_PATH =
  `${PALLADIUM_SCHEMAS_DIR}/palladium-morphus-table.schema.json` as const

export const PALLADIUM_MORPHUS_CHARACTERISTIC_SCHEMA_PATH =
  `${PALLADIUM_SCHEMAS_DIR}/palladium-morphus.schema.json` as const

export const PALLADIUM_MORPHUS_FORGE_ROUTING_SCHEMA_PATH =
  `${PALLADIUM_SCHEMAS_DIR}/palladium-morphus-forge-routing.schema.json` as const

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

export const PALLADIUM_PSIONIC_SCHEMA_ID =
  'https://megaverse-companion.local/schemas/palladium-psionic.schema.json' as const

export const PALLADIUM_FEATURE_COMMON_SCHEMA_ID =
  'https://megaverse-companion.local/schemas/palladium-feature-common.schema.json' as const

export const PALLADIUM_MAGIC_SCHEMA_ID =
  'https://megaverse-companion.local/schemas/palladium-magic.schema.json' as const

export const PALLADIUM_MORPHUS_TABLE_SCHEMA_ID =
  'https://megaverse-companion.local/schemas/palladium-morphus-table.schema.json' as const

export const PALLADIUM_MORPHUS_CHARACTERISTIC_SCHEMA_ID =
  'https://megaverse-companion.local/schemas/palladium-morphus.schema.json' as const

export const PALLADIUM_MORPHUS_FORGE_ROUTING_SCHEMA_ID =
  'https://megaverse-companion.local/schemas/palladium-morphus-forge-routing.schema.json' as const

/** One JSON array per Palladium skill category (`categories[0]`). */
export const PALLADIUM_SKILLS_DIR = `${PALLADIUM_CONTENT_DIR}/skills` as const

/** @deprecated Use {@link PALLADIUM_SKILLS_DIR} — legacy single-file path. */
export const PALLADIUM_SKILL_CATALOG_JSON_PATH =
  `${PALLADIUM_SKILLS_DIR}/communications.json` as const

/** Genre-scoped race pools — `races/<genre>/{player,npc,gm_approval}.json`. */
export const PALLADIUM_RACES_DIR = `${PALLADIUM_CONTENT_DIR}/races` as const

export const PALLADIUM_RACE_NIGHTBANE_PLAYER_JSON_PATH =
  `${PALLADIUM_RACES_DIR}/nightbane/player.json` as const

/** @deprecated Use genre-scoped paths under {@link PALLADIUM_RACES_DIR}. */
export const PALLADIUM_RACE_PLAYER_JSON_PATH =
  PALLADIUM_RACE_NIGHTBANE_PLAYER_JSON_PATH

/** @deprecated Use genre-scoped paths under {@link PALLADIUM_RACES_DIR}. */
export const PALLADIUM_RACE_NPC_JSON_PATH =
  `${PALLADIUM_RACES_DIR}/nightbane/npc.json` as const

/** @deprecated Use genre-scoped paths under {@link PALLADIUM_RACES_DIR}. */
export const PALLADIUM_RACE_GM_APPROVAL_JSON_PATH =
  `${PALLADIUM_RACES_DIR}/nightbane/gm_approval.json` as const

/** @deprecated Use {@link PALLADIUM_RACES_DIR} — legacy single-file path. */
export const PALLADIUM_RACE_CATALOG_JSON_PATH =
  PALLADIUM_RACE_NIGHTBANE_PLAYER_JSON_PATH

/** One JSON array per source book (genre folder mirrors `occs/<genre>/`). */
export const PALLADIUM_OCCS_DIR = `${PALLADIUM_CONTENT_DIR}/occs` as const

export const PALLADIUM_HAND_TO_HAND_CATALOG_JSON_PATH =
  `${PALLADIUM_CONTENT_DIR}/palladiumHandToHand.json` as const

/** One JSON array per talent tier band (`common`, `elite`). */
export const PALLADIUM_TALENTS_DIR = `${PALLADIUM_CONTENT_DIR}/talents` as const

export const PALLADIUM_TALENT_COMMON_JSON_PATH =
  `${PALLADIUM_TALENTS_DIR}/common.json` as const

export const PALLADIUM_TALENT_ELITE_JSON_PATH =
  `${PALLADIUM_TALENTS_DIR}/elite.json` as const

/** @deprecated Use {@link PALLADIUM_TALENTS_DIR} — legacy single-file path. */
export const PALLADIUM_TALENT_CATALOG_JSON_PATH =
  `${PALLADIUM_CONTENT_DIR}/palladiumTalents.json` as const

/** Psionic power catalog (`schemas/palladium-psionic.schema.json`). */
export const PALLADIUM_PSIONICS_DIR =
  `${PALLADIUM_CONTENT_DIR}/psionics` as const

/** @deprecated Use {@link PALLADIUM_PSIONICS_DIR} — legacy monolithic path removed. */
export const PALLADIUM_PSIONIC_CATALOG_JSON_PATH =
  `${PALLADIUM_CONTENT_DIR}/palladiumPsionics.json` as const

/** One JSON array per magic school (`schemas/palladium-magic.schema.json`). */
export const PALLADIUM_MAGIC_DIR = `${PALLADIUM_CONTENT_DIR}/magic` as const

export const PALLADIUM_WIZARD_MAGIC_JSON_PATH =
  `${PALLADIUM_MAGIC_DIR}/wizard.json` as const

export const WEAPON_PROFICIENCIES_CATALOG_JSON_PATH =
  `${PALLADIUM_CONTENT_DIR}/weapon_proficiencies.json` as const

export const STANDARD_MODERN_WEAPON_PROGRESSION_JSON_PATH =
  `${PALLADIUM_CONTENT_DIR}/standard_modern_weapon_progression.json` as const

/** One JSON file per Morphus table (hubs and trait tables). */
export const PALLADIUM_MORPHUS_TABLES_DIR =
  `${PALLADIUM_CONTENT_DIR}/morphus/tables` as const

/** Morphus Sub-Forge routing tables (Appearance, Characteristics). */
export const PALLADIUM_MORPHUS_FORGE_DIR =
  `${PALLADIUM_CONTENT_DIR}/morphus/forge` as const

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

/** One JSON file per source book (`tables[]` bundles), grouped under `progression/xp_tables/<genre>/`. */
export const PALLADIUM_XP_TABLES_DIR =
  `${PALLADIUM_CONTENT_DIR}/progression/xp_tables` as const
