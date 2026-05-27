# Morphus table authoring

How to encode Nightbane Morphus characteristics so the app can apply rules automatically **and** surface edge cases clearly.

## Layers (use all three)

| Layer | When to use | Runtime effect |
|--------|-------------|----------------|
| **Structured fields** | Bonuses the engine already models | Auto: attributes, skills, damage, movement, senses, combat |
| **`morphusRules`** | Named edge cases (mirror walk, reform, etc.) | Trait notes + future automation hooks |
| **`customOneOffs`** | Anything still narrative | Always shown in trait notes |

Prefer structured fields first; push leftovers to `morphusRules` (tagged) then `customOneOffs` (free text).

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
| impervious to cold / half damage from fire | `damageAffinities` (0 = none, 0.5 = half, 2 = double) |
| cannot swim / floats on water | `mobility.aquaticTraits.buoyancy`: `sink` / `float` |
| Natural A.R. 12 | `naturalAr`: 12 |
| bite 2D6 | `naturalWeapons[]` |
| increase height 2D4 inches | `heightModifier.dice`: `"2D4"` (inches; document in description) |
| double weight | `weightModifier.percent`: 100 |

Aggregation rules (stacking) live in `src/lib/morphusCharacteristicAggregation.ts`.

## Edge-case fields (new)

### `entryRole`

- `trait` — default; playable Morphus result
- `table_router` — Step One only (e.g. Disproportion “Head”, “Arms & Hands”)
- `subtable_header` — section label, not rolled alone

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

### `morphusRules`

```json
"morphusRules": [
  {
    "kind": "mirror_walk",
    "summary": "Mirror Walk at will (see Nightbane core Mirror Walk rules)."
  },
  {
    "kind": "reform_after_destruction",
    "summary": "If destroyed, reforms in 2D6 minutes at half S.D.C./H.P. or Facade with Morphus lockout 1D6+1 hours.",
    "params": { "reformMinutesDice": "2D6", "lockoutHoursDice": "1D6+1" }
  }
]
```

Kinds: `mirror_walk`, `reform_after_destruction`, `called_shot_defense`, `environmental_vulnerability`, `immobilization`, `player_choice`, `cross_reference`, `combat_opponent_modifier`, `weapon_living_part`, `other`.

## Ingest workflow

```bash
npm run morphus:ingest -- init --id my_table --display "My Table" \
  --heading "My Table" --book src/data/reference/nightbane/WB5-Nightbane_Survival_Guide.pdf
npm run morphus:ingest -- prepare my_table
npm run morphus:ingest -- scaffold my_table
# Transcribe: add structured fields + morphusRules + trim customOneOffs
npm run morphus:ingest -- merge my_table
npm run morphus:ingest -- build my_table
npm run morphus:ingest -- finalize my_table
```

`prepare` runs schema analysis; extend `scripts/lib/morphus-schema-analysis.mjs` `MECHANIC_PATTERNS` when new book phrasing appears.

## Do not

- Put `conditionalStanceModifiers` at the **top level** — only under `mobility.conditionalStanceModifiers`.
- Rely on description-only rows for mechanics the schema already supports.
- Duplicate full book text in `customOneOffs` if it is already in `description`.
