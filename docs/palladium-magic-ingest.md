# Palladium magic catalog ingest

How agents should add or update **Palladium Megaverse magic** (invocations, rituals, wards, school-specific lists) so every row matches the schema, Tab 7 picker, P.P.E. economy, and optional play-time Feature consumers.

---

## What you need to provide

Send one batch per message (or per agent session). **Default to Pass A** unless you explicitly want structured play mechanics in the same batch.

### Batch sizes

| Pass | Scope | Items per batch | Use a smaller batch when… |
|------|-------|-----------------|---------------------------|
| **Pass A** | Catalog / chargen — identity, level, P.P.E., range/duration/save prose, sources, school | **4 spells** | Rituals, cross-school borrow lists, Fleshsculptor surgical gates, or multi-page spell text |
| **Pass B** | Mechanical depth — `grantedModifiers`, `inflictedModifiers`, `resolutionTable`, `spawnedPresence`, `damage`, rituals | **2–3 spells** | Heavy modifier trees, percentile tables, or summon/construct blocks |

Pass B is optional and can follow Pass A in a separate batch for the same spells.

### Required in every batch request

| Field | Required | Example |
|-------|----------|---------|
| **PDF + page range** | Yes | `Nightbane RPG pp. 127–128` or `@src/data/reference/nightbane/...` |
| **Genre** | Yes (Pass A) | `nightbane`, `rifts` — sets `gameSystems` on new/updated rows |
| **School** | Yes | `wizard`, `mirror`, `fleshsculptor`, `necromancy` — determines content file |
| **Scope** | Yes | `catalog-only` (Pass A) or `include mechanics` (Pass B) |
| **Spell names** | Yes | Exact printed names; count should match batch size (4 Pass A, 2–3 Pass B) |

Optional: `cross-list update` when Mirrormage/Fleshsculptor borrow lists change; `O.C.C. spellAccess` when a new school or borrow rule ships with the batch.

### Copy-paste template (Pass A)

```text
Batch: Nightbane RPG pp. 127–128
Genre: nightbane
School: wizard
Scope: catalog-only (Pass A)
Spells: Blinding Flash, Cloud of Smoke, Death Trance, Fear
```

### Copy-paste template (Pass B)

```text
Batch: Nightbane RPG pp. 128–129
Genre: nightbane
School: wizard
Scope: include mechanics (Pass B)
Spells: Blinding Flash, Exorcism
```

After each batch the agent runs `npm run validate:schemas`. **Flag ambiguous book text and ask for a ruling** before encoding — do not guess.

---

**Source of truth (code):**

| Artifact | Path |
|----------|------|
| Schema | `src/data/schemas/palladium-magic.schema.json` |
| Shared feature fragments | `src/data/schemas/palladium-feature-common.schema.json` |
| Example row | `src/data/schemas/examples/palladium-magic.example.json` |
| Catalog | `src/data/content/magic/*.json` (one array per **school**) |
| School registry | `src/data/content/magic_schools.json` |
| Cross-school borrow lists | `src/data/content/magic_cross_lists.json` |
| Loader | `src/data/library/magicCatalogLoader.ts` |
| School resolution | `src/lib/magicSchool.ts`, `src/lib/magicCrossLists.ts` |
| Reference PDFs (authoring) | `src/data/reference/<genre>/` (gitignored) |

When the schema changes, **update `palladium-magic.example.json`** (do not create duplicate example files).

### Living document (process rules)

**This file is the shared ingest playbook.** When ingest conventions change — school files, batch sizes, cross-list workflow, Pass A minimums — **update this document in the same PR/session** as the catalog change. See `.cursorrules`.

---

## Rules ambiguity — flag and ask

**Never guess on book mechanics.** Stop ingest, flag explicitly, and **ask the user for a ruling** before writing JSON.

Flag when you see:

- **P.P.E.** — variable costs, upkeep, enhancement tiers, or school-specific doubles (Mirrormage)
- **Spell level** — disagrees across books; `genrePlacements[]` overrides needed
- **Range / duration / save** — multiple modes, ritual vs invocation strength (12 vs 16)
- **Cross-school access** — borrow list membership, focus caveats, doubled P.P.E.
- **Fleshsculptor** — consent, alignment, graft, or cognitive-override gates
- **Target count** — area vs individuals; `targetCountFormula` vs prose
- **Schema encoding** — multiple valid JSON shapes; prefer asking over inventing

**After the user rules:** Encode in catalog JSON; add a note to the **User rulings** table below when it sets a precedent.

---

## Two ingest passes

### Pass A — Catalog / chargen (default)

**Goal:** Tab 7 magic picker, level gates, P.P.E. display, sources, school placement, prose range/duration/save.

**Batch size:** **4 spells** — see **What you need to provide** above.

**Schema-required fields:**

- `id` — `magic_<school>_<spell_slug>` (prefix must match file basename)
- `name`, `description`, `gameSystems`, `sources`, `school`, `spellLevel` (1–15)

**Practically required for chargen-ready rows (Pass A complete target):**

- `ppe` — at least `baseActivation` (or structured cost object when variable)
- `range`, `duration`, `save` — prose blocks or structured entries matching the book
- `sources[]` — `gameSystem`, `reference`, `pageNumber`

**Optional on Pass A:** `magicKind`, `isRitual`, `spellStrengthBase`, `tags`, `genrePlacements[]` (cross-line level/P.P.E. overrides), `descriptionMorphus`.

**Do not block Pass A on:** `grantedModifiers`, `inflictedModifiers`, `resolutionTable`, `spawnedPresence`, `damage`, `forgedOutputs`, `ritualProfile`, Fleshsculptor surgical blocks — unless batch scope includes Pass B.

### Pass B — Mechanical depth (optional)

**Goal:** FeatureCard / ledger / play-time consumers — structured modifiers, tables, summons, crafting outputs.

**Batch size:** **2–3 spells** — see **What you need to provide** above.

Typical Pass B keys: `grantedModifiers`, `inflictedModifiers`, `resolutionTable`, `spawnedPresence`, `formTransformation`, `damage`, `healing`, `materialComponents`, `permanentCosts`, `forgedOutputs`, `ritualProfile`, `effectProfiles`, Fleshsculptor (`targetPreconditions`, `graftProfile`, `cognitiveOverride`, …).

Prefer schema keys + `palladium-feature-common` fragments over stuffing mechanics into `description` alone.

---

## Catalog layout

```
src/data/content/magic/
  wizard.json           # Core wizard school (Nightbane bulk)
  mirror.json           # Mirrormage (TTGD)
  fleshsculptor.json    # Fleshsculptor (TTGD)
  necromancy.json       # Necromancer school (create when O.C.C. is ingested)
```

| Rule | Detail |
|------|--------|
| **File = school** | `school` field and id prefix `magic_<school>_` must match file basename (`wizard.json` → `"school": "wizard"`) |
| **Array per file** | One JSON array per school file; rows sorted by `id` within file |
| **Global unique `id`** | Duplicate ids across school files are fatal |
| **New school** | Add entry to `magic_schools.json` **and** create `<school>.json` before first row |

**Authoring references (not spell rows):**

- `magic_schools.json` — valid school slugs per `gameSystem`
- `magic_cross_lists.json` — enumerated borrow lists for O.C.C. `spellAccessRules`

When Mirrormage or similar O.C.C.s borrow wizard spells, update **both** the cross-list and any per-spell `spellAccess` / O.C.C. rules in the same ingest session.

---

## `gameSystems` (setting scope)

Tag each row with every genre where the spell appears:

```json
"gameSystems": ["nightbane"]
```

Use stable slugs (`nightbane`, `rifts`, `palladium_fantasy`, …). When the same invocation differs by line, add `genrePlacements[]` for per-genre `spellLevel` / P.P.E. overrides instead of duplicating rows.

---

## P.P.E., level, and save (Pass A patterns)

```json
"spellLevel": 1,
"magicKind": "invocation",
"spellStrengthBase": 12,
"ppe": { "baseActivation": 1 },
"range": { "summary": "10 ft (3.0 m) radius; up to 60 ft (18.3 m) away.", "kind": "radius" },
"duration": { "summary": "Instant", "kind": "instant" },
"save": { "summary": "Standard", "saveKind": "standard" }
```

Rituals: `isRitual: true`, `spellStrengthBase: 16`, `magicKind: "ritual"` when the book distinguishes ritual casting.

---

## Agent workflow (checklist)

1. Read cited PDF pages (or trusted extracted text).
2. **Flag ambiguity; get user ruling** before encoding.
3. Confirm school → filename; create school file + `magic_schools.json` entry if new.
4. Fill **Pass A** fields for each spell in the batch.
5. Add **Pass B** blocks only when in scope.
6. If cross-school borrow changed: update `magic_cross_lists.json` and linked O.C.C. `spellAccessRules`.
7. **Update this doc** if ingest rules or precedents changed.
8. Run `npm run validate:schemas`.
9. Do **not** commit unless the user asks.

---

## Validation & tooling

| Command | Purpose |
|---------|---------|
| `npm run validate:schemas` | Ajv validate all `magic/*.json` rows + examples; duplicate-id and `magic_<school>_` id-prefix checks |

There is **no** `audit:magic` script yet. Pass A completeness is enforced by review + schema validation until an engine contract is added.

---

## User rulings (precedents)

| Spell / topic | Issue | Ruling |
|---------------|-------|--------|
| *(none yet)* | — | Add rows as ingest precedents are confirmed |

---

## Reference examples

| Row / file | Pattern |
|------------|---------|
| `magic_wizard_blinding_flash` | Pass A + `inflictedModifiers` status/combat |
| `palladium-magic.example.json` | Broad schema surface area |
| `magic_cross_lists.json` | Mirrormage borrowed wizard list |

---

## Do not

- Put spells outside `content/magic/<school>.json` without updating `magic_schools.json`.
- Use an `id` prefix that does not match the file basename.
- **Guess** P.P.E., level, or save wording when the book is ambiguous.
- Hide level-blocked spells — grey out with reason (Pillar 8).
- Change ingest conventions without updating **this doc**.
- Skip `npm run validate:schemas` after catalog edits.

---

## Related docs

- `docs/psychic_gate.md` — Tab 3 (contrast with Tab 7 magic)
- `docs/character_creation.md` — Forge tab index
- `docs/palladium-skill-ingest.md` — parallel Pass A/B ingest pattern
- `docs/gemini-project-context.md` — project-wide content map
- `.cursorrules` — Core Design Pillars
