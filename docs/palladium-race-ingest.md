# Palladium race catalog ingest

How agents should add or update **Palladium races and R.C.C.s** so every row matches the schema, Tab 1 configurator, attribute dice, vitals, Psychic Gate bypass rules, and optional Morphus / sub-forge hooks.

---

## What you need to provide

Send one batch per message (or per agent session). **Default to Pass A** — one race is usually a full batch.

### Batch sizes

| Pass | Scope | Items per batch | Use a smaller batch when… |
|------|-------|-----------------|---------------------------|
| **Pass A** | Creation composition — attributes, vitals, psionics capability, O.C.C. relationship, innate skills/bonuses | **1 race** | Minor demographic or source-only update |
| **Pass B** | Deep innate modules — structured `innateBonuses.modifiers`, save roadmaps, morphus trait hooks | **1 race** | Large modifier trees or dual-form policy edge cases |

Pass B is optional and can follow Pass A.

### Required in every batch request

| Field | Required | Example |
|-------|----------|---------|
| **PDF + page range** | Yes | `Nightbane RPG pp. 28–32` |
| **Genre** | Yes | `nightbane` — sets `gameSystems` |
| **Audience pool** | Yes | `player`, `npc`, or `gm_approval` — determines **file** (see below) |
| **Scope** | Yes | `composition-only` (Pass A) or `include deep modules` (Pass B) |
| **Race name** | Yes | Exact printed name |

Optional: paired **Shadow O.C.C.** when `canPickOcc: false`; **genre whitelist** note when adding to `player.json` (creation requires genre manifest + row `gameSystems`).

### Copy-paste template (Pass A — playable race)

```text
Batch: Nightbane RPG pp. 28–32
Genre: nightbane
Audience: player
Scope: composition-only (Pass A)
Race: Human
```

### Copy-paste template (Pass A — R.C.C.)

```text
Batch: Nightbane RPG pp. 33–36
Genre: nightbane
Audience: player
Scope: composition-only (Pass A)
Race: Guardian
Paired Shadow O.C.C.: Guardian (skill program) — ingest both in same session
```

After each batch the agent runs `npm run validate:schemas`. **Flag ambiguous book text and ask for a ruling** before encoding.

---

**Source of truth (code):**

| Artifact | Path |
|----------|------|
| Schema | `src/data/schemas/palladium-race.schema.json` |
| Example rows | `src/data/schemas/examples/palladium-race.example.json`, `palladium-race.example-rcc.json` |
| Catalog (target) | `src/data/content/races/<genre>/{player,npc,gm_approval}.json` |
| Catalog (legacy) | `src/data/content/races/{player,npc,gm_approval}.json` — migrate to genre folders |
| Loader | `src/data/library/raceCatalogLoader.ts` |
| Creation filter | `src/lib/raceCatalog.ts`, `src/lib/creationRaceOccSync.ts` |
| Genre manifest | `src/data/genres.ts` — `GENRE_MANIFEST` whitelists playable races |
| Reference PDFs | `src/data/reference/<genre>/` (gitignored) |

When the schema changes, **update the matching example JSON** under `src/data/schemas/examples/`.

### Living document (process rules)

**This file is the shared ingest playbook.** Update it when conventions change. See `.cursorrules`.

---

## Catalog layout (genre folder → audience pool)

**Target structure** (mirrors O.C.C. / XP table organization):

```
src/data/content/races/
  nightbane/
    player.json
    npc.json
    gm_approval.json
  rifts/
    player.json
    npc.json
    gm_approval.json
  palladium_fantasy/
    player.json
    npc.json
    gm_approval.json
```

| Rule | Detail |
|------|--------|
| **Genre folder** | Stable slug matching `GENRE_MANIFEST` (`nightbane`, `rifts`, `palladium_fantasy`, …) |
| **Audience file** | `player` / `npc` / `gm_approval` — same semantics as today, scoped per genre |
| **`raceAudience` must match file** | `player.json` → `"raceAudience": "player"` (loader throws on mismatch) |
| **Unique `id` per genre** | Same `race_human` **may** appear in multiple genre folders — rows are **not** merged across genres |
| **Resolution** | Runtime looks up `(hostGenreId, raceId)` — character save stores `raceId`; genre comes from `creationGenreId` / `hostGenreId` |
| **`gameSystems` on row** | Single-genre slug matching the folder (e.g. `["nightbane"]` in `races/nightbane/`) — do not multi-tag one row when genre-split |
| **`npc`** | Monsters / NPC stat blocks for that setting only |
| **`gm_approval`** | Playable with GM sign-off for that setting only |

**Legacy:** flat `races/player.json` remains until loader migration; do not add new rows there once genre folders exist.

---

## Megaversal races (e.g. Human)

Human appears in Nightbane, Rifts, Palladium Fantasy, and more. **Do not** maintain one monolithic Human row with `gameSystems: [nightbane, rifts, …]` once genre folders land.

### Recommended pattern: **one Human row per genre file, same canonical `id`**

```
races/nightbane/player.json     → race_human (Nightbane SDC rules + sources)
races/rifts/player.json         → race_human (Rifts SDC rules + sources)
races/palladium_fantasy/player.json → race_human (Fantasy SDC rules + sources)
```

| Field | Usually shared across genres | Usually **genre-specific** |
|-------|------------------------------|----------------------------|
| `id` | `race_human` (stable save key) | — |
| `name`, attribute dice | Often identical (`3D6` all) | Rare exceptions (book variants) |
| `vitals.sdc` | Strategy type (`conditional_by_occ_tags`) | **`conditionalOverrides` tags + formulas** |
| `sources` | — | One book citation per genre file |
| `psionics.capabilityType` | Often `standard` | Genre may forbid or alter gate |
| `lineage` | `megaversal` on Human | Nightbane-only races use `nightbane` |

### S.D.C. — use `conditional_by_occ_tags` per genre (already in schema)

Human S.D.C. is not one flat number — it depends on O.C.C. type. The engine already resolves this at chargen when an O.C.C. is selected (`vitalsCalculator.ts` + O.C.C. `tags`).

**Nightbane example** (current catalog):

```json
"sdc": {
  "strategy": "conditional_by_occ_tags",
  "defaultFormula": "3D6",
  "conditionalOverrides": [
    {
      "tags": ["military", "police", "detective", "athletic", "tactical"],
      "formula": "1D4*10"
    }
  ]
}
```

**Palladium Fantasy example** (ingest when Fantasy O.C.C.s exist — tags must match Fantasy O.C.C. `tags`, not Nightbane’s):

```json
"sdc": {
  "strategy": "conditional_by_occ_tags",
  "defaultFormula": "2D6",
  "conditionalOverrides": [
    {
      "tags": ["men_at_arms", "soldier", "knight", "mercenary"],
      "formula": "3D6+10"
    },
    {
      "tags": ["magic_user", "scholar", "cleric"],
      "formula": "2D6"
    }
  ]
}
```

Flag ambiguous book S.D.C. tables and ask the user before encoding tag→formula mappings.

### What **not** to do

- **Do not** invent `race_human_nightbane` / `race_human_fantasy` ids — breaks Megaversal Bridge and save portability of the Human concept.
- **Do not** stuff all genres’ S.D.C. overrides into one row — tag vocabularies differ per line and O.C.C. ingest.
- **Do not** hide genre differences in prose-only `description` — encode in `vitals` + `tags` alignment with O.C.C. catalog.

### Loader implication (future code change)

`getRaceById(id)` → `getRaceById(id, genreId)` (genre required for creation/runtime; tests pass `nightbane` explicitly). Creation picker lists only `races/{hostGenreId}/player.json`.

---

## Rules ambiguity — flag and ask

Flag when you see:

- **`canPickOcc` vs R.C.C.** — separate O.C.C. step vs self-contained skill program
- **`forcedOccId`** — which Shadow O.C.C. row holds the R.C.C. package
- **`psionics.capabilityType`** — Psychic Gate bypass (`none`, `innate`, `standard`, …) — see `docs/psychic_gate.md`
- **Vitals** — `conditional_by_occ_tags` vs flat formulas; align `tags` with O.C.C. `tags`
- **Strength category** — normal vs supernatural vs augmented
- **`lineage`** — `nightbane` vs `megaversal`; `creationSubForgeId` for Morphus Tab 6
- **Multi-genre races** — one row with multiple `gameSystems` vs duplicate rows per line
- **Innate skills** — catalog `skill_*` ids vs percent grants

---

## Two ingest passes

### Pass A — Creation composition (default)

**Goal:** Tab 1 race picker, attribute dice header, vitals ledger seeds, Psychic Gate policy, innate packages.

**Batch size:** **1 race**.

**Schema-required fields:**

- Identity: `id`, `name`, `description`, `raceAudience`, `gameSystems`, `sources`
- `canPickOcc` — `true` (e.g. Human) or `false` (R.C.C.)
- `attributes` — all eight dice keys: `iq`, `me`, `ma`, `ps`, `pp`, `pe`, `pb`, `spd`
- `strengthCategory`, `vitals`, `psionics`, `occLimitations`, `innateSkills`, `innateBonuses`, `demographics`

**R.C.C. additions when `canPickOcc: false`:**

- `forcedOccId` — must point at existing Shadow O.C.C. in `occs/<genre>/*.json`
- Often: `lineage: "nightbane"`, `creationSubForgeId: "morphus_forge_manifest"` for Nightbane lines

**Do not block Pass A on:** deep structured modifier automation in `innateBonuses` when prose + flat bonuses suffice for chargen.

### Pass B — Deep innate modules (optional)

**Batch size:** **1 race**.

Typical keys: structured `innateBonuses.modifiers`, `defaultTraitIds`, `combatContextModifiers`, detailed `occLimitations.forbiddenOccIds`.

---

## Psychic Gate (`psionics` block)

```json
"psionics": {
  "capabilityType": "standard"
}
```

| `capabilityType` | Effect (summary) |
|------------------|------------------|
| `none` | No psionics; Tab 3 may bypass |
| `innate` | Fixed I.S.P. / powers; gate bypass patterns |
| `standard` | Full Psychic Gate when O.C.C. allows |

See `docs/psychic_gate.md` for bypass vs pick workflows.

---

## Agent workflow (checklist)

1. Read cited PDF pages.
2. **Flag ambiguity; get user ruling.**
3. Choose **audience pool file** (`player` / `npc` / `gm_approval`).
4. Confirm genre manifest will expose `player` races for target `gameSystems`.
5. Fill **Pass A** required blocks.
6. If R.C.C.: ingest paired Shadow O.C.C. first or same session (`docs/palladium-occ-ingest.md`).
7. Align `occLimitations` / vitals conditionals with O.C.C. `tags` when used.
8. **Update this doc** if precedents changed.
9. Run `npm run validate:schemas`.
10. Do **not** commit unless the user asks.

---

## Validation & tooling

| Command | Purpose |
|---------|---------|
| `npm run validate:schemas` | Race rows + `raceAudience` ↔ pool file consistency |
| `npm run validate:morphus` | When `creationSubForgeId` or morphus traits are touched |

No `audit:races` script yet.

---

## User rulings (precedents)

| Race / topic | Issue | Ruling |
|--------------|-------|--------|
| File layout | Flat pools vs genre | **`<genre>/{player,npc,gm_approval}.json`** (target; loader migration pending) |
| Creation eligibility | Pool vs genre | List `races/{hostGenreId}/player.json`; `npc` / `gm_approval` per genre |
| Megaversal Human | One row vs many | **Same `race_human` id, one row per genre file** — genre-specific `vitals.sdc` overrides + `sources` |
| S.D.C. variance | Per O.C.C. type | **`conditional_by_occ_tags`** per genre; tags must match that genre’s O.C.C. `tags` |

---

## Reference examples

| Artifact | Pattern |
|----------|---------|
| `palladium-race.example.json` | Human — `canPickOcc: true` |
| `palladium-race.example-rcc.json` | Guardian R.C.C. — `forcedOccId`, innate I.S.P. |
| `races/player.json` | Current playable pool |

---

## Do not

- Put a row in the wrong audience file (`raceAudience` mismatch).
- Set `forcedOccId` without a real Shadow O.C.C. row.
- **Guess** attribute dice or vitals formulas.
- Hide creation-blocked races without grey-out reason (Pillar 8) when UI lists them.
- Skip `npm run validate:schemas` after edits.

---

## Related docs

- `docs/palladium-occ-ingest.md` — Shadow O.C.C. pairing
- `docs/psychic_gate.md` — `psionics.capabilityType`
- `docs/stat_engine_spec.md` — racial bonuses at spawn
- `docs/forge-morphus_creation.md` — Tab 6 when `creationSubForgeId` set
- `docs/character_creation.md` — Tab 1 configurator
- `.cursorrules`
