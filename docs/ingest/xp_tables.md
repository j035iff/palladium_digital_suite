# Palladium XP progression table ingest

How agents should add or update **O.C.C. experience progression tables** so every table matches the schema, level-up queue, and **bidirectional links** to O.C.C. rows.

**O.C.C. composition** (when to attach a table to an O.C.C.) stays in [`occs.md`](occs.md). **This doc** covers transcribing printed XP floors and maintaining the `progression/xp_tables/` catalog.

---

## What you need to provide

Send one batch per message (or per agent session). XP work is usually tied to an O.C.C. ingest session.

### Batch sizes

| Pass | Scope | Items per batch | Use a smaller batch when… |
|------|-------|-----------------|---------------------------|
| **Pass A** | New or updated table — `floors[]`, `maxLevel`, `occIds`, sources | **1 table** | Shared book page lists many O.C.C.s on one ladder — still one table object per printed ladder |
| **Pass B** | Book bundle hygiene — `notes`, planned O.C.C. placeholders in `occIds` / `notes` | **1 book file** | Adding a supplement file with multiple tables |

Default to **Pass A** when ingesting from a rulebook page.

### Required in every batch request

| Field | Required | Example |
|-------|----------|---------|
| **PDF + page range** | Yes | `Nightbane RPG p. 233` |
| **Genre** | Yes | `nightbane` — determines folder under `progression/xp_tables/` |
| **Book file** | Yes | `nightbane_core.json` — basename should mirror paired `occs/<genre>/<book>.json` when they share a source |
| **Table label** | Yes | `Nightbane & Guardian` (as printed) |
| **O.C.C. ids** | When known | `occ_nightbane_basic`, `occ_guardian_rcc` — must match catalog `occ_*` ids |

Optional: note O.C.C.s **planned but not yet in catalog** — keep `occIds: []` on the table and document planned ids in `notes` until O.C.C. rows exist.

### Copy-paste template (Pass A — new table)

```text
Batch: Nightbane RPG p. 233
Genre: nightbane
Book file: nightbane_core.json
Scope: catalog-only (Pass A)
Table: Nightbane & Guardian
O.C.C.s: occ_nightbane_basic, occ_nightbane_resistance_spook_squad, occ_guardian_rcc
```

After each batch the agent runs `npm run validate:schemas` (includes **XP ↔ O.C.C. bidirectional cross-check**). **Flag ambiguous book text and ask for a ruling** before encoding.

---

**Source of truth (code):**

| Artifact | Path |
|----------|------|
| Table row schema | `src/data/schemas/palladium-xp-table.schema.json` |
| Book bundle schema | `src/data/schemas/palladium-xp-table-book.schema.json` |
| Example | `progression/xp_tables/nightbane/nightbane_core.json` (live reference; add `palladium-xp-table.example.json` when schema shape changes) |
| Catalog | `src/data/content/progression/xp_tables/<genre>/<book>.json` |
| Validator | `scripts/validate-palladium-schemas.mjs` — book bundle + per-table rows + O.C.C. xref |
| Reference PDFs | `src/data/reference/<genre>/` (gitignored) |

When the schema changes, **update the matching example JSON** under `src/data/schemas/examples/`.

### Living document (process rules)

**This file is the shared ingest playbook.** Update it when conventions change. See `.cursorrules`. **Layout:** [`../content-catalog-layout.md`](../content-catalog-layout.md). **Doc sync:** [`../gemini-project-context.md`](../gemini-project-context.md) § Development workflow.

---

## Catalog layout

```
src/data/content/progression/xp_tables/
  nightbane/
    nightbane_core.json           # book bundle: { id, gameSystems, sources, tables[] }
    between_the_shadows.json
  rifts/                          # (future)
  palladium_fantasy/              # (future)
```

| Rule | Detail |
|------|--------|
| **Genre folder** | Stable slug matching `gameSystems` on the book bundle and each table |
| **Book file** | One **bundle** per supplement or core rulebook; `tables[]` holds one or more progression ladders from that book |
| **Table `id`** | Global unique slug, e.g. `nightbane_core_nightbane_guardian` — prefix with book id when helpful |
| **`floors[]`** | Cumulative XP **minimum** per level; index `0` = level 1 floor (usually `0`); length must align with `maxLevel` |
| **`occIds[]`** | Every O.C.C. on this ladder; each must set `progression.xpTableId` to **this table's `id`** |
| **Bidirectional link** | Validator fails if O.C.C. points at table but table omits O.C.C., or vice versa |
| **Planned O.C.C.s** | Empty `occIds` is valid when no catalog row exists yet — document in `notes` |

Book file basenames should match the paired O.C.C. book file under `occs/<genre>/` when they share a source.

---

## Rules ambiguity — flag and ask

Flag when you see:

- **Multiple O.C.C.s on one ladder** — confirm all share identical floors before merging `occIds`
- **Level cap** — book stops below 15; set `maxLevel` and truncate `floors[]` to match printing
- **Floor values** — cumulative vs per-level delta columns; Palladium tables are **cumulative minimums**
- **R.C.C. vs O.C.C. naming** — Shadow O.C.C. rows still use `occ_*` ids and appear on the same ladder as playable O.C.C.s when the book lists them together
- **Default table** — whether a new O.C.C. should reuse an existing table id vs get a dedicated ladder

---

## Two ingest passes

### Pass A — Table transcription (default)

**Goal:** Correct `floors[]`, `maxLevel`, sources, and O.C.C. bindings for level-up after spawn.

**Batch size:** **1 table** (one printed XP ladder).

**Required fields per table object:**

- `id`, `name`, `gameSystems`, `sources`, `maxLevel`, `floors`, `occIds`, `notes`
- `floors.length` consistent with `maxLevel` (validator enforces)
- Each `occIds` entry resolves in `occs/<genre>/*.json` **or** is explicitly deferred in `notes`

**Coordinate with O.C.C. ingest:** When adding a new O.C.C. in the same session, set `progression.xpTableId` on the O.C.C. and add the O.C.C. id to the table's `occIds[]` in the **same PR/session**.

### Pass B — Book bundle maintenance (optional)

**Goal:** New supplement file, realign `sources` on the bundle wrapper, or split/merge tables within one book JSON.

Typical work: create `progression/xp_tables/<genre>/<new_book>.json`, move table objects between bundles only when the book source changes (avoid silent id churn).

---

## Agent workflow (checklist)

1. Read cited PDF page(s) for the XP ladder.
2. **Flag ambiguity; get user ruling.**
3. Open or create `progression/xp_tables/<genre>/<book>.json`.
4. Add or update the table object in `tables[]`.
5. Transcribe **cumulative** floor values level by level.
6. Set `occIds[]` to every O.C.C. on that ladder (or document planned ids in `notes`).
7. On each linked O.C.C., set `progression.xpTableId` to this table's `id` ([`occs.md`](occs.md)).
8. **Update this doc** if precedents changed.
9. Run `npm run validate:schemas`.
10. Do **not** commit unless the user asks.

---

## Validation & tooling

| Command | Purpose |
|---------|---------|
| `npm run validate:schemas` | Book bundles, table rows, O.C.C. ↔ table bidirectional links |

No dedicated `audit:xp` script — rely on validator xref errors.

---

## User rulings (precedents)

| Topic | Issue | Ruling |
|-------|-------|--------|
| Layout | Genre folders | Mirror `occs/<genre>/` — `progression/xp_tables/<genre>/<book>.json` |
| Missing O.C.C. | Ladder lists R.C.C. not in catalog | Keep table row; `occIds: []` + `notes` listing planned `occ_*` ids |
| Floors | Starting value | Level 1 floor is index `0` in `floors[]` (typically `0`) |

---

## Reference examples

| Artifact | Pattern |
|----------|---------|
| `progression/xp_tables/nightbane/nightbane_core.json` | Multi-table core book bundle |
| `palladium-xp-table.example.json` | Single table row shape (create/update when schema changes) |

---

## Do not

- Point `progression.xpTableId` at a table id that does not exist.
- List an O.C.C. in `occIds` without setting its `progression.xpTableId` (or the reverse).
- Store per-level **deltas** in `floors[]` — use **cumulative minimums**.
- **Guess** when two printed ladders differ — flag and ask.
- Skip `npm run validate:schemas` after edits.

---

## Related docs

- [`occs.md`](occs.md) — O.C.C. `progression.xpTableId`, composition ingest
- [`races.md`](races.md) — R.C.C. Shadow O.C.C. pairing (may share XP ladders)
- [`../character_spawn_handoff.md`](../character_spawn_handoff.md) — level-up queue after spawn
- [`../content-catalog-layout.md`](../content-catalog-layout.md) — folder layout
- `.cursorrules`
