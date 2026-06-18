# Palladium psionic catalog ingest

How agents should add or update **Palladium Megaverse psionic powers** (Sensitive, Physical, Healer/Healing, Super) so every row matches the schema, Psychic Gate (Tab 3 / Tab 7), I.S.P. economy, and optional play-time Feature consumers.

---

## What you need to provide

Send one batch per message (or per agent session). **Default to Pass A** unless you explicitly want structured play mechanics in the same batch.

### Batch sizes

| Pass | Scope | Items per batch | Use a smaller batch when… |
|------|-------|-----------------|---------------------------|
| **Pass A** | Catalog / chargen — identity, I.S.P., range/duration/save, `genrePlacements`, sources | **4 powers** | Dual-category placement, variable `dynamicCosts`, or compound `subAbilities` |
| **Pass B** | Mechanical depth — `resolutionTable`, `damage`, `attackProfiles`, modifiers, spawns | **2–3 powers** | Percentile tables, offensive profiles, or summoned-presence blocks |

Pass B is optional and can follow Pass A in a separate batch for the same powers.

### Required in every batch request

| Field | Required | Example |
|-------|----------|---------|
| **PDF + page range** | Yes | `Nightbane RPG pp. 71–73` |
| **Genre** | Yes | `nightbane`, `rifts` — drives `genrePlacements[].genreId` |
| **Category** | Yes | `sensitive`, `physical`, `healer`, `super` (Nightbane) — determines **content file** |
| **Scope** | Yes | `catalog-only` (Pass A) or `include mechanics` (Pass B) |
| **Power names** | Yes | Exact printed names; count should match batch size |

Optional: note when a power is an **innate starter** (See Aura, Sense Evil, …); note **cross-category** duplicates (Death Trance Sensitive vs Physical).

### Copy-paste template (Pass A)

```text
Batch: Nightbane RPG pp. 71–73
Genre: nightbane
Category: sensitive
Scope: catalog-only (Pass A)
Powers: See Aura, Sense Evil, Sixth Sense, Telepathy
```

### Copy-paste template (Pass B)

```text
Batch: Nightbane RPG pp. 79–80
Genre: nightbane
Category: physical
Scope: include mechanics (Pass B)
Powers: Telekinesis, Telekinetic Force Field
```

After each batch the agent runs `npm run validate:schemas`. **Flag ambiguous book text and ask for a ruling** before encoding.

---

**Source of truth (code):**

| Artifact | Path |
|----------|------|
| Schema | `src/data/schemas/palladium-psionic.schema.json` |
| Shared feature fragments | `src/data/schemas/palladium-feature-common.schema.json` |
| Example rows | `src/data/schemas/examples/palladium-psionic.example-*.json` (pattern files — update the matching pattern when that shape changes) |
| Catalog | `src/data/content/psionics/<category>.json` |
| Category file I/O | `scripts/lib/psionics-catalog-fs.mjs` |
| Category registry | `src/data/content/psionic_genre_categories.json` |
| Global rules | `src/data/content/psionic_global_rules.json` |
| Loader | `src/data/library/psionicCatalogLoader.ts` |
| Reference PDFs | `src/data/reference/<genre>/` (gitignored) |

### Living document (process rules)

**This file is the shared ingest playbook.** Update it in the same PR/session when ingest conventions change. See `.cursorrules`.

---

## Catalog layout (category-split — canonical target)

**User ruling:** psionic rows are filed by **selection category**, not monolithic genre files.

```
src/data/content/psionics/
  sensitive.json
  physical.json
  healer.json          # Nightbane label (book: Healer Abilities)
  healing.json         # Rifts/HU label when ingesting those lines
  super.json
```

| Rule | Detail |
|------|--------|
| **File = primary category** | Row’s Nightbane (or ingest genre) `genrePlacements[].category` for the batch category must match the filename |
| **Valid categories** | See `psionic_genre_categories.json` per `genreId` (`healer` vs `healing` is line-specific) |
| **Global unique `id`** | `psionic_<snake_case>` across all category files |
| **Cross-category powers** | When the book lists the same power in two categories with **different I.S.P. or picker rules**, use **separate rows** (e.g. `psionic_death_trance` + `psionic_death_trance_physical`) — see `palladium-psionic.example-dual-placement.json` |
| **Single row, multi-placement** | When one catalog row serves multiple categories/genres with `genrePlacements[]` only, file under the **primary** category for the batch being ingested |

**Migration:** complete — monolithic `palladiumPsionics.json` removed. After bulk edits or category changes:

```bash
npm run split:psionics
```

---

## Rules ambiguity — flag and ask

Flag when you see:

- **Category placement** — Sensitive vs Physical vs Healer disagrees across Megaversal books
- **`healer` vs `healing`** — Nightbane uses `healer`; Rifts/HU use `healing` in `psionic_genre_categories.json`
- **I.S.P.** — `dynamicCosts`, meditation modifiers, ley-line rules (`psionic_global_rules.json`)
- **Innate starters** — whether a power is automatic at 1st level vs picked (`innateStarter`)
- **Dual-category duplicates** — one row with multiple `genrePlacements` vs two row ids
- **Save / duration** — trance prep, self-only limits, backlash
- **Schema encoding** — prefer asking over inventing

---

## Two ingest passes

### Pass A — Catalog / chargen (default)

**Goal:** Psychic Gate picker, category pools, I.S.P. display, sources.

**Batch size:** **4 powers** — see **What you need to provide** above.

**Schema-required fields:**

- `id`, `name`, `description`, `gameSystems`, `sources`, `genrePlacements` (≥1; each needs `genreId` + `category`)

**Practically required for chargen-ready rows:**

- `isp` — `baseActivation` (or per-placement I.S.P. in `genrePlacements[]` when category-specific)
- `range`, `duration` — match book (prose or structured)
- `save` when the book specifies one

**Optional on Pass A:** `innateStarter`, `limitations`, `tags`, `descriptionMorphus`.

**Do not block Pass A on:** `resolutionTable`, `damage`, `attackProfiles`, `grantedModifiers`, `inflictedModifiers`, `spawnedPresence`, `backlash` — unless batch includes Pass B.

### Pass B — Mechanical depth (optional)

**Batch size:** **2–3 powers**.

Typical keys: `resolutionTable`, `damage`, `attackProfiles`, `healing`, `backlash`, `grantedModifiers`, `inflictedModifiers`, `spawnedPresence`, `formTransformation`, `subAbilities`, `permanentCosts`, `combatBonuses`.

---

## `genrePlacements` (per-genre category)

```json
"genrePlacements": [
  {
    "genreId": "nightbane",
    "category": "sensitive",
    "isp": { "baseActivation": 4 }
  }
]
```

Nightbane Psychic P.C.C.: 2 picks from each of Sensitive, Physical, and Healer at 1st level (p. 70). Innate starters: See Aura, Sense Evil, Meditation, Presence Sense — set `innateStarter: true` when encoding.

When ingesting Rifts/HU powers, use `healing` category slug where the registry does, not `healer`.

---

## Agent workflow (checklist)

1. Read cited PDF pages.
2. **Flag ambiguity; get user ruling.**
3. Place row in correct **category file** (`psionics/<category>.json`).
4. Fill **Pass A**; use separate row ids for cross-category duplicates when I.S.P./picker differ.
5. Add **Pass B** only when in scope.
6. If `genrePlacements[0].category` changed: `npm run split:psionics`.
7. Update `psionic_genre_categories.json` only when adding a **new genre** or category slug.
8. **Update this doc** if precedents changed.
9. Run `npm run validate:schemas`.
10. Do **not** commit unless the user asks.

---

## Validation & tooling

| Command | Purpose |
|---------|---------|
| `npm run validate:schemas` | Validates `psionics/*.json`; duplicate-id and category file placement checks |
| `npm run split:psionics` | Re-home rows by `genrePlacements[0].category` after bulk edits |

No `audit:psionics` script yet.

---

## User rulings (precedents)

| Power / topic | Issue | Ruling |
|---------------|-------|--------|
| Catalog layout | Monolithic vs split | **Category-split** under `content/psionics/` (implemented) |
| Death Trance | Sensitive vs Physical | Separate rows when category-specific I.S.P. applies |

---

## Reference examples

| Artifact | Pattern |
|----------|---------|
| `palladium-psionic.example-sensitive.json` | Basic Sensitive power |
| `palladium-psionic.example-dual-placement.json` | Multi-category `genrePlacements` |
| `psionic_death_trance` / `psionic_death_trance_physical` | Cross-category duplicate rows in catalog |

---

## Do not

- File a row under the wrong category JSON when category drives Psychic Gate pools.
- Collapse cross-category I.S.P. differences into one row without user ruling.
- **Guess** category placement across game lines.
- Skip `npm run validate:schemas` after edits.

---

## Related docs

- `docs/psychic_gate.md` — Tab 3 gate, category budgets, innate starters
- `docs/palladium-magic-ingest.md` — parallel Pass A/B pattern
- `docs/palladium-occ-ingest.md` — `ispEngine` on psychic O.C.C.s
- `.cursorrules`
