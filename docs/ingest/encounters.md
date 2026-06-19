# Palladium encounter archetype ingest

How agents should add or update **GM encounter archetypes** — lightweight random/minor NPC stat blocks from Palladium books' *Enemies & Minor NPCs* (and similar) sections. These rows power a future GM quick-generate module; they are **not** player-creation races, R.C.C.s, or O.C.C.s.

---

## What you need to provide

Send one batch per message (or per agent session). **Default to Pass A only** — Pass B is reserved for future GM calculators (morale automation, reinforcement timers, attribute dice rollers).

### Batch sizes

| Pass | Scope | Items per batch | Use a smaller batch when… |
|------|-------|-----------------|---------------------------|
| **Pass A** | Full archetype row — vitals, H2H, W.P. options, equipment, disposition, variants | **3–8 archetypes** from one book section | Single archetype with many variants or long disposition prose |
| **Pass B** | GM module hooks — automated morale rolls, reinforcement spawn timers, level distribution UI | **1 archetype or 1 variant family** | Not needed until GM module exists |

### Required in every batch request

| Field | Required | Example |
|-------|----------|---------|
| **PDF + page range** | Yes | `Nightbane RPG pp. 199–202` |
| **Genre** | Yes | `nightbane` — sets `gameSystems` |
| **Scope** | Yes | `composition-only` (Pass A) |
| **Section name** | Yes | `Enemies & Minor NPCs` |

Optional: note when an archetype **composes atop** an existing race row (Doppleganger NSB agent) vs **inline human defaults** only.

### Copy-paste template (Pass A)

```text
Batch: Nightbane RPG pp. 199–202
Genre: nightbane
Scope: composition-only (Pass A)
Section: Enemies & Minor NPCs
Archetypes: Preserver Activist, Nightbane Gang Member, Corrupted Police, Night Cultist, NSB Field Agent
```

After each batch the agent runs `npm run validate:schemas` (includes **race / O.C.C. / H2H / W.P. cross-refs**). **Flag ambiguous book text and ask for a ruling** before encoding.

---

**Source of truth (code):**

| Artifact | Path |
|----------|------|
| Schema | `src/data/schemas/palladium-encounter-archetype.schema.json` |
| Example row | `src/data/schemas/examples/palladium-encounter-archetype.example.json` |
| Catalog | `src/data/content/encounters/<genre>/<book>.json` |
| Loader | `src/data/library/encounterArchetypeCatalogLoader.ts` |
| Types | `src/lib/encounterArchetypes.ts` |
| Path constants | `src/lib/palladiumSchemaPaths.ts` |
| Reference PDFs | `src/data/reference/<genre>/` (gitignored) |

When the schema changes, **update the matching example JSON** under `src/data/schemas/examples/`.

### Living document (process rules)

**This file is the shared ingest playbook.** Update it when conventions change. See `.cursorrules`. **Layout:** [`../content-catalog-layout.md`](../content-catalog-layout.md). **Doc sync:** [`../gemini-project-context.md`](../gemini-project-context.md) § Development workflow.

---

## What encounter archetypes are (and are not)

| Do | Don't |
|----|-------|
| Encode printed **minor NPC / random encounter** blocks | Put these in `races/npc.json` or `races/player.json` |
| Reference existing **race** / **O.C.C.** rows via `composition` and `related*Ids` | Create Shadow O.C.C.s or R.C.C. rows for thugs and cops |
| Store **flat combat bonuses**, equipment damage, armor presets | Duplicate full race innate ability trees |
| Use `packageNotes` for reinforcements, faction behavior, GM guidance | Hide options — GM module will show all templates with tap-to-expand math |
| Keep rows **genre-scoped** under `encounters/<genre>/` | Multi-tag one row with several `gameSystems` when genre folders exist |

**Pillar alignment:** Total GM Agency (all values inspectable/overridable), Radical Visibility (templates listed in GM picker when module ships), Megaversal Bridge (same schema works for Nightbane, Rifts, Fantasy minor NPC sections).

---

## Catalog layout (genre folder → book file)

**See [`../content-catalog-layout.md`](../content-catalog-layout.md)** for the shared layout contract.

```
src/data/content/encounters/
  nightbane/
    nightbane_core.json
  rifts/                    # (future)
  palladium_fantasy/        # (future)
```

| Rule | Detail |
|------|--------|
| **Genre folder** | Stable slug matching `gameSystems` on rows (`nightbane`, `rifts`, …) |
| **Book file** | One JSON array per source book; snake_case basename mirroring O.C.C. book files when they share a source |
| **No loose JSON at `encounters/` root** | Book files live only inside genre subfolders |
| **Global unique `id`** | `encounter_<snake_case>` across all genre folders and book files |
| **`gameSystems` on row** | Must match folder genre (validator enforces) |
| **Loader resolution** | Runtime looks up `(hostGenreId, encounterId)` via `getEncounterArchetypeById(id, genreId)` |

**Loader:** `encounterArchetypeCatalogLoader.ts` globs `encounters/*/*.json`. Not wired to the player creation forge.

---

## Composition modes

Archetypes compose NPCs in three common patterns:

### 1. Inline human overlay (`race_human` baseline)

Use when the book gives flat S.D.C./H.P. and attribute prose without supernatural abilities.

```json
"composition": {
  "defaultBaseRaceId": "race_human",
  "speciesBaselineRaceId": "race_human",
  "notes": "Average or below average attributes."
}
```

Attribute dice stay GM/manual unless a future Pass B roller is added — store guidance in `attributeNotes`.

### 2. Alternate base race (human default + supernatural swap)

Use when the block says "human or Doppleganger" (corrupt police patrol).

```json
"composition": {
  "defaultBaseRaceId": "race_human",
  "alternateBaseRaceIds": ["race_doppleganger"],
  "speciesBaselineRaceId": "race_human"
},
"variants": [
  {
    "variantId": "patrol_doppleganger",
    "label": "Patrol officer (Doppleganger)",
    "baseRaceId": "race_doppleganger",
    "vitals": { "sdc": 50, "hp": 16 },
    "modifiers": { "save_horror_factor": 2 }
  }
]
```

List every swappable race in `relatedRaceIds` for GM picker cross-links.

### 3. Full race reference (supernatural default)

Use when the printed block assumes a specific R.C.C. (NSB Doppleganger agent).

```json
"composition": {
  "defaultBaseRaceId": "race_doppleganger",
  "alternateBaseRaceIds": ["race_ashmedai", "race_hollow_man"],
  "notes": "Swap base race and use that row's supernatural abilities."
}
```

Do **not** re-encode Doppleganger shapeshifting, P.P.E., etc. — point at the race catalog.

---

## Field encoding guide

### Identity & metadata

| Field | Rule |
|-------|------|
| `id` | `encounter_<snake_case>` — stable forever once published |
| `name` | Printed archetype title (include parenthetical nicknames) |
| `description` | One paragraph — role, threat, faction |
| `sources[]` | One entry per cited page; `reference` = book title |
| `tags[]` | Lowercase faction/role slugs for GM filters (`preserver`, `nsb`, `cult`, …) |
| `packageNotes[]` | Reinforcements, entourage sizes, faction interactions — not player-facing forge copy |

### Encounter scale

| Field | Rule |
|-------|------|
| `numberAppearing.formula` | Verbatim dice (`3D4`, `3D6`, `2`) |
| `minimum` / `maximum` | Set when book gives hard floors/ceilings |
| `numberAppearing.notes` | Backup timers (`2D6 in 1D6 minutes`), raid sizes |

### Combat block

| Field | Rule |
|-------|------|
| `vitals.sdc` / `vitals.hp` | Integer when book gives a single value; string when range or formula |
| `handToHand.skillId` | Must exist in `skills/hand_to_hand.json` (`hth_basic`, `hth_expert`, …) |
| `handToHand.attacksPerMelee` | Only when book states APM separately from H2H tier |
| `levelOfExperience.defaultLevel` | Typical level for the printed bonus block |
| `levelOfExperience.distributionRoll` + `outcomes[]` | Percentile or `1D4` level spreads — use `min`/`max`/`level` |
| `modifiers` | Flat bonuses from the book's stat block — additive with H2H at GM discretion |
| `weaponProficiencies[]` | Prefer catalog `skillId` (`wp_*`); use `category: "any"` when book says "any two W.P." |
| `equipment[]` | Typical weapons with `damageFormula` when printed |
| `armor[]` | Optional — `label`, `ar`, `sdc` when book lists vests or SWAT hard armor |

### Morale & behavior

| Field | Rule |
|-------|------|
| `horrorFactorMorale` | When book gives explicit H.F. save target and flee/surrender rules |
| `horrorFactorMorale.useNightbaneHorrorFactor` | `true` when save is vs Morphus Nightbane H.F. specifically |
| `dispositionNotes[]` | Dress, social behavior, faction attitudes — one bullet per distinct behavior |
| `alignmentNotes` | Prose alignment tendencies; note rare good/minority cases in disposition |

### Cross-references

| Field | Rule |
|-------|------|
| `relatedRaceIds[]` | Every race the GM might swap in (including Hollow Man / Namtar pairs) |
| `relatedOccIds[]` | Leaders or upgraded roles (`occ_priest_of_night_rcc` for cult leaders — use actual catalog id) |

Validator checks all `race_*`, `occ_*`, `hth_*`, and `wp_*` refs against loaded catalogs.

---

## Nightbane core reference (pp. 199–202)

| `id` | Printed name | Composition | Notes |
|------|--------------|-------------|-------|
| `encounter_preserver_activist` | Preserver Activist ("Preevert") | `race_human` | H.F. 10 morale; 3D4 appearing |
| `encounter_nightbane_gang_member` | Nightbane Gang Member | `race_human` | Warlord Nightbane backing % in `packageNotes` |
| `encounter_corrupted_police` | Corrupted Police | human + Doppleganger | `variants[]` for patrol Doppleganger and evil detective |
| `encounter_night_cultist` | Night Cultist | `race_human` | W.P. `category: "any"`; links `occ_priest_of_night_rcc` |
| `encounter_nsb_field_agent` | NSB Field Agent | `race_doppleganger` default | Alternates Ashmedai / Hollow Man |

File: `src/data/content/encounters/nightbane/nightbane_core.json`.

---

## Rules ambiguity — flag and ask

Flag when you see:

- **H2H tier vs printed bonuses** — book lists both Basic and flat +1 strike; confirm whether bonuses stack with tier table
- **Level distribution** — percentile outcomes that overlap or omit ranges
- **W.P. "any two"** — use `category: "any"` until GM module picks catalog ids
- **Race swap** — book mentions Namtar pilot vs Hollow Man shell; list both in `relatedRaceIds` and explain in `composition.notes`
- **Leader types** — "Priest of Night or Sorcerer" — use `relatedOccIds` / `relatedRaceIds`, do not invent inline O.C.C. skill programs
- **Reinforcement timing** — encode formula in `numberAppearing.notes`; Pass B adds automated spawn if needed

---

## Validation commands

```bash
npm run validate:schemas
```

Checks:

- Schema compile for `palladium-encounter-archetype.schema.json`
- Every `encounters/<genre>/*.json` row validates
- No duplicate `encounter_*` ids globally
- `gameSystems` matches genre folder
- `composition.*RaceId`, `variants[].baseRaceId`, `relatedRaceIds[]` → race catalog
- `relatedOccIds[]` → O.C.C. catalog
- `handToHand.skillId` → `hand_to_hand.json`
- `weaponProficiencies[].skillId` → `weapon_proficiencies.json`
- Example JSON under `schemas/examples/palladium-encounter-archetype.example.json`

Optional unit test after ingest:

```bash
npx vitest run src/lib/encounterArchetypeCatalog.test.ts
```

---

## Checklist (agent)

1. Read PDF section; confirm rows are **minor NPC templates**, not full R.C.C.s.
2. Choose composition mode (inline human / alternate race / full race reference).
3. Add or update rows in `encounters/<genre>/<book>.json`.
4. Set `relatedRaceIds` / `relatedOccIds` for every catalog cross-link mentioned in prose.
5. Update `palladium-encounter-archetype.example.json` if schema fields changed.
6. Run `npm run validate:schemas`.
7. Update this doc if a new convention emerges (e.g. reinforcement spawn schema in Pass B).
