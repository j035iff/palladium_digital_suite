# Morphus table authoring

How to encode Nightbane Morphus characteristics so the app can apply rules automatically **and** surface edge cases clearly.

## Layers (prefer top to bottom)

| Layer | When to use | Runtime effect |
|--------|-------------|----------------|
| **Core structured fields** | Stats, skills, damage, movement, senses | Aggregated into passive modifiers and combat |
| **Capability fields** | One-offs that must appear on the character sheet | `buildMorphusCapabilitySummary()` → grouped player digest |
| **`customOneOffs`** | Pure flavor not worth typing yet | Still shown in trait notes |

Avoid new `morphusRules` — use the capability fields below.

### Capability fields (character sheet digest)

| Field | Examples |
|-------|----------|
| `appearanceConstraints` | Clothing fit, narrow openings, hide among mannequins |
| `combatContextModifiers` | Opponent -5 strike in bright light; surprise +2 strike |
| `recoveryBehaviors` | Reform after destruction, waterlog, immobilization |
| `conditionalPenalties` | Cold halves Spd/APM |
| `atWillAbilities` | Mirror Walk, stand motionless |
| `playerChoices` | Scythe vs sickle at creation |
| `tableWorkflow` | Roll Step One twice (Disproportion) |
| `livingWeaponRules` | Living scarecrow weapon |
| `skillContextModifiers` | Prowl -50% in bright light |
| `disguiseLimits` | Soft Clay impersonation rules |
| Extended `sensory` | `peripheralVisionDegrees`, `lightSensitivity`, `scentTracking`, `prowlUnderwaterModifierPercent` |
| Extended `mobility` | `balanceModifierPercent`, `reachPercentBonus`, `jumpMultiplier`, `waterlogMinutesDice` |
| Extended `saveModifiers` | `nauseaVomiting` |
| Extended `limbDurability` | `requiresCalledShot` |

Runtime: `morphusDerived.capabilitySummary` in CharacterContext (grouped by `senses`, `movement`, `combat`, `defense`, `skills`, `appearance`, `abilities`, `recovery`, `choices`, `workflow`).

## Structured fields (engine-backed)

See `palladium-morphus.schema.json` and `src/data/schemas/examples/palladium-morphus-characteristic.example.json`.

Common mappings from book prose:

| Book text | JSON path |
|-----------|-----------|
| +1D6×10+12 S.D.C. | `statModifiers.sdc.dice`: `"1D6x10+12"` |
| +1 to P.B. / M.A. / I.Q. | `statModifiers.pb.flat`, etc. |
| +2 on Perception Rolls | `statModifiers.perception.flat` or `sensory.perceptionSpecialties` |
| +1 to Horror Factor | `statModifiers.hf.flat` |
| +5 to roll with impact | `statModifiers.rollWithPunch.flat` |
| -20% to Disguise | `skillModifiers.specificSkillOverrides` → `skill_disguise` |
| -5% to skills requiring dexterity / light touch / focus / timing, or related to electrical / repair / mechanics | `specificSkillOverrides` with `targetType`: `skill_trait` and a registry id (`requires_dexterity`, `requires_light_touch`, `related_to_electrical`, `related_to_repair`, `related_to_mechanics`, `requires_timing`, `requires_focus`) — membership lists in `src/data/source/skill_trait_lists/` |
| Disguise impossible in Morphus | `specificSkillOverrides` with `impossibleInMorphus`: true (sheet shows **Impossible**) |
| impervious to cold / half damage from fire | `damageAffinities` (0 = none, 0.5 = half, 2 = double) |
| cannot swim / floats on water | `mobility.aquaticTraits.buoyancy`: `sink` / `float` |
| Natural A.R. 12 | `naturalAr`: 12 |
| bite 2D6 | `naturalWeapons[]` |
| increase height 2D4 inches | `heightModifier.dice`: `"2D4"` (inches; document in description) |
| double weight | `weightModifier.percent`: 100 |

Aggregation rules (stacking) live in `src/lib/morphusCharacteristicAggregation.ts`.

## Edge-case fields (new)

### `entryRole`

- `trait` — default; playable Morphus result (only these are ingested into catalog JSON)
- `table_router` — Step One routing row (e.g. Disproportion “Head”); **not ingested**
- `subtable_header` — section label, not rolled alone; **not ingested**

### `variantPercentiles`

Inner rolls inside one trait (Junk Golem body type, Mirror Man mirror style):

```json
"variantPercentiles": [
  { "roll": "01-25%", "label": "Hodgepodge junk", "description": "..." },
  { "roll": "26-50%", "label": "Car parts", "description": "..." }
]
```

### `crossTableRoll`

```json
"crossTableRoll": {
  "targetTableId": "animal_form",
  "targetTableName": "Animal Form Table",
  "note": "Use half S.D.C., Spd, and bonuses from Animal Form."
}
```

### Example: Mirror Man

```json
"atWillAbilities": [{ "id": "mirror_walk", "label": "Mirror Walk", "note": "At will." }],
"combatContextModifiers": [{
  "condition": "bright_light",
  "target": "opponent",
  "strike": -5,
  "parry": -5,
  "dodge": -5
}],
"skillContextModifiers": [
  { "skillId": "skill_prowl", "modifierPercent": -20, "context": "darkness" },
  { "skillId": "skill_prowl", "modifierPercent": -50, "context": "bright_light" }
]
```

## Ingest workflow

**Playbook:** [`docs/ingest/morphus.md`](ingest/morphus.md) (Pass A/B batches, PDF pipeline, validation). **This section** covers encoding layers and CLI commands.

Ingest **playable traits only**. The pipeline skips table routers (Disproportion Step One rows like Head/Torso), "Other" / roll-twice rows, instruction-only percentile bands, and **cross-table redirect rows** (e.g. Modern Soldier 91–00% “Biomechanical” → roll Biomechanical tables) that have no `Bonuses:`/`Penalties:` on the row itself. Traits that include their own mechanics plus an optional roll on another table (e.g. Stuffed Animal → Animal Form with halved stats) are kept. Percentile ranges are used for PDF extraction only — they are not stored on catalog entries. Manifest flag `excludeNonPlayable` (default `true`) controls this; pass `--include-non-playable` to `init` to disable.

**Multi-section tables (Disproportion, Animal):** use a `category_hub` parent (`disproportion.json`) with leaf `morphus_trait_table` files per book section (`disproportion_head.json`, etc.). Step One routing stays in the hub `description`; traits live on leaf tables with `parentTable: "disproportion"`.

```bash
npm run morphus:ingest -- init --id my_table --display "My Table" \
  --heading "My Table" --book src/data/reference/nightbane/WB5-Nightbane_Survival_Guide.pdf
npm run morphus:ingest -- prepare my_table
# prepare = extract → schema-loop → scaffold → structure-entries (auto-parse book text)
npm run morphus:ingest -- merge my_table
npm run morphus:ingest -- build my_table
npm run morphus:ingest -- finalize my_table
```

### `structure-entries` (mechanical transcription)

After schema is ready, `structure-entries` reads `extracted-authoritative.txt` and fills:

- `statModifiers`, `saveModifiers`, `damageAffinities`, `skillModifiers`, `mobility`, `sensory`
- Capability fields (`atWillAbilities`, `combatContextModifiers`, `recoveryBehaviors`, …)
- Full `description` from book (replaces `TODO: transcribe` stubs)

By default it **fills missing fields only** (`--force` overwrites). Run on target JSON with `--target`.

```bash
npm run morphus:ingest -- structure-entries my_table
npm run morphus:ingest -- structure-entries my_table --target --force
```

Extend parsers in `scripts/lib/morphus-transcribe-structure.mjs`, `scripts/lib/morphus-skill-modifier-parse.mjs`, and `MECHANIC_PATTERNS` in `morphus-schema-analysis.mjs` when new book phrasing appears. Goal: **zero or minimal `customOneOffs`** per trait.

**Skill trait lists:** Trait membership is defined in `src/data/source/skill_trait_lists/*.txt` (dexterity, light touch, electrical, repair, mechanics, timing, focus). Run `npm run apply:skill-traits` after editing any list so rows in `src/data/content/skills/*.json` carry `skillTraits` (written back via `scripts/lib/skills-catalog-fs.mjs`). Registry ids live in `src/data/content/skills/utils/skill_trait_registry.json`. Ingest maps book phrases like “manual dexterity related skills”, “skills related to electronics”, or “requiring a light touch” to `skill_trait` overrides, not hand-enumerated skill ids.

**Impossible skills:** Use `impossibleInMorphus: true` on a `specificSkillOverrides` row (not `isNegated`). Conditional impossibility (“Prowl impossible while music plays”) stays in `description` / `skillContextModifiers` until modeled; `structure-entries` skips “is impossible while …” for auto-flagging.

**Bulk normalize existing tables:** `npm run migrate:morphus-skills` (add `--dry-run` to preview). Re-run after editing trait list files or ingest parsers.

**Strip duplicate skill prose:** After migration, run `npm run dedupe:morphus-skill-prose` to remove `% to … skill` clauses from entry `description` / `customOneOffs` when the same rule exists in `skillModifiers`, and to trim table-level header `description` when entries already encode those rules. Conformity checks can be scoped (e.g. insectoid Table I grants vs Table II add-ons; Stigmata II −20%; unusual facial Table I −40%). The dedupe pass also syncs table-wide rules onto entries when needed (biomechanical impossible Disguise/Seduction/Undercover Ops, etc.) before stripping the header. Humanoid/head rows missing impossible flags get them synced when the header or `customOneOffs` already say disguise is not viable.

**Tier-3 entry prose:** `migrate:morphus-skills` uses `parseExtendedSkillModifierProse` for category penalties (appearance, espionage, combat), global skill performance, skill lists (“skills like …”), RCC/occ bonuses, and PDF watermark repair. `parseContextualMorphusFields` maps color-change Prowl/Climb bonuses to `skillContextModifiers` (`color_change`) and clown Espionage/Rogue picks to `playerChoices`. Re-run migrate then dedupe after extending parsers.

## Do not

- Put `conditionalStanceModifiers` at the **top level** — only under `mobility.conditionalStanceModifiers`.
- Rely on description-only rows for mechanics the schema already supports.
- Duplicate full book text in `customOneOffs` if it is already in `description`.
- Add new `morphusRules` — use capability fields so `capabilitySummary` and future automation stay typed.
