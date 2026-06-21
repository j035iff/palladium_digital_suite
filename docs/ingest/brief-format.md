# Ingest brief format

Standardized input for the [orchestrator](orchestrator.md). One brief file drives review → batch plan → multi-batch ingest → rulings report.

**Schema:** `src/data/schemas/ingest-brief.schema.json`  
**Examples:** `src/data/source/ingest-briefs/examples/`  
**Validate:** `npm run ingest:brief -- validate <file>`

---

## File location and naming

```
src/data/source/ingest-briefs/<slug>.brief.json
```

- `slug` must match `id` in the JSON (lowercase, hyphens, dots).
- Commit briefs to the repo; PDFs stay gitignored under `src/data/reference/`.

---

## Minimal example

```json
{
  "$schema": "../../../schemas/ingest-brief.schema.json",
  "version": 1,
  "id": "nightbane-skills-physical-pass-a",
  "title": "Nightbane Physical Skills — Pass A",
  "contentType": "skills",
  "pass": "A",
  "genre": "nightbane",
  "book": {
    "path": "src/data/reference/nightbane/Nightbane_RPG.pdf",
    "reference": "Nightbane RPG",
    "pages": { "start": 53, "end": 62 }
  },
  "options": {
    "category": "Physical"
  }
}
```

---

## Required fields (all briefs)

| Field | Description |
|-------|-------------|
| `version` | Always `1` |
| `id` | Stable slug; run state lives at `ingest-briefs/runs/<id>/` |
| `title` | Human label for reports |
| `contentType` | Catalog type — maps to playbook (see table below) |
| `pass` | `A` or `B` |
| `book.reference` | Printed title for `sources[]` |
| `book.pages` | `"53-62"` or `{ "start": 53, "end": 62 }` |

---

## Multi-book `sources[]` order (all content types)

When a catalog row cites **more than one book** in a genre (`sources[]` length > 1, or the same logical item appears in multiple source books), list references in the order defined by the **genre master list**:

**File:** `src/data/source/ingest-briefs/utils/genre-source-reference-order.json`  
**Helper:** `scripts/lib/genre-source-reference-order.mjs` → `sortSourcesByGenreReferenceOrder(genre, sources)`

| Rule | Detail |
|------|--------|
| **Order** | Lower index in the master list = earlier in `sources[]` |
| **Scope** | Skills, magic, psionics, talents, morphus traits, O.C.C.s, races, encounters — any row with `sources[]` |
| **Missing list** | If the genre has no entry in the master file, **stop at ingest start** and ask the user for the canonical book order before encoding multi-book rows. `npm run ingest:brief -- validate` prints a **WARN** when `genre` is set but the list is absent. |
| **Not the same as authority** | Master list controls **citation order only**. Which book wins for **description/mechanics** when text differs is still per playbook (e.g. morphus manifest `authoritativeBookKey`, psionics dual-placement notes). |

**Nightbane** (defined in master list):

1. Nightbane Core  
2. Between the Shadows  
3. Nightlands  
4. Through the Glass Darkly  
5. Shadows of Light  
6. Nightbane Survival Guide  
7. Dark Designs  

When adding a new genre, append a `genres.<genreId>.books[]` block with `bookKey`, `title`, `defaultReference`, and `referenceAliases` (every `sources[].reference` string agents may emit for that book).

---

## Common optional fields

| Field | When to use |
|-------|-------------|
| `genre` | Required for most types (sets `gameSystems`) |
| `book.path` | Repo-relative PDF for agent review |
| `book.supplement` | Second source when mechanics span books |
| `scope` | Override playbook default scope for this pass |
| `options` | Type-specific fields (see below) |
| `items` | Pre-list exact names; agent reconciles with book during review |
| `batchSizeOverride` | Smaller batches for heavy rows |
| `linkedBriefs` | Other brief ids to run in same session (race + Shadow O.C.C.) |
| `notes` | Freeform constraints for the agent |
| `updateExisting` | `true` when correcting catalog rows |
| `sandboxOutput` | Repo-relative path for **test runs only** — write catalog JSON here instead of `src/data/content/` |

---

## Sandbox / comparison runs

Set `sandboxOutput` when you want to re-ingest a section and diff against production catalog **without touching** `src/data/content/`:

```json
{
  "pass": "AB",
  "contentType": "skills",
  "sandboxOutput": "src/data/source/ingest-briefs/output/nightbane-skills-physical-sandbox.json",
  "notes": "Comparison run — do not write to src/data/content/skills/physical.json"
}
```

Agent rules when `sandboxOutput` is set:

1. Write **only** to the sandbox path (top-level JSON **array** for skills).
2. Still run `npm run validate:schemas` — temporarily point validation at sandbox or validate rows in isolation with the skill schema.
3. Compare against production: `npm run ingest:brief -- compare <brief-id>` (or manual diff vs `src/data/content/skills/<category>.json`).

---

## `contentType` → playbook → batch size

| `contentType` | Playbook | Pass A size | Pass B size | `options` (required) |
|---------------|----------|-------------|-------------|------------------------|
| `skills` | `skills.md` | 6 | 3–4 | `category` (recommended) |
| `hth` | `hth.md` | 1 | 1 | — |
| `weapon_proficiencies` | `weapon_proficiencies.md` | 2–3 | 1 | `category`: `ancient` \| `modern` |
| `magic` | `magic.md` | 4 | 2–3 | `school` |
| `psionics` | `psionics.md` | 4 | 2–3 | `category` |
| `occs` | `occs.md` | 1 | 1 | — |
| `races` | `races.md` | 1 | 1 | `audience`: `player` \| `npc` \| `gm_approval` |
| `xp_tables` | `xp_tables.md` | 1 | 1 | `bookFile` |
| `talents` | `talents.md` | 4 | 2–3 | — |
| `morphus` | `morphus.md` | 3 traits | 1–2 traits | `table`; `section` + `tableCategory` when catalog has multiple printed sub-tables; see morphus modes |
| `encounters` | `encounters.md` | 3–8 | 1 | `section` |

Registry source: `scripts/lib/ingest-brief-registry.mjs`.

---

## Type-specific `options`

### Skills
```json
"options": { "category": "Physical" }
```

### Magic
```json
"options": { "school": "wizard" }
```

### Psionics
```json
"options": { "category": "sensitive" }
```

### Races
```json
"options": {
  "audience": "player",
  "pairedShadowOcc": "Guardian (skill program)"
}
```

### O.C.C.s
```json
"options": {
  "pairedRcc": "Guardian",
  "xpTablePages": "233"
}
```

### XP tables
```json
"options": {
  "bookFile": "nightbane_core.json",
  "occIds": ["occ_nightbane_basic", "occ_guardian_rcc"]
}
```

### Encounters
```json
"options": { "section": "Enemies & Minor NPCs" }
```

### Morphus

#### Single printed table (default)

One brief covers the whole catalog file when the book lists **one** trait table (e.g. `athlete`, `victim`).

```json
"options": { "table": "athlete" }
```

#### Multi-section tables (Stigmata I/II/III, Biomechanical I/II/III, Alien Shape I/II, …)

Many catalog files hold **multiple printed sub-tables** in one JSON wrapper (`stigmata.json`, `biomechanical.json`, `plant_life.json`, …). Sub-tables often use **different book pairs** (DD + core, DD + BTS, Survival Guide only).

**Global rule — one brief per printed section, one sandbox per catalog table:**

| Layer | Field | Rule |
|-------|-------|------|
| **Catalog file** | `options.table` | File stem under `morphus/tables/` — same for all sections (`stigmata`, `biomechanical`, …) |
| **Printed section** | `options.section` | Roman numeral or index for this job only: `"I"`, `"II"`, `"III"`, `"1"`, `"2"`, … |
| **Entry tag** | `options.tableCategory` | When production already splits entries (e.g. `Stigmata I`, `Plant Life II`), set the exact `tableCategory` string to filter checklist/compare. Omit when the catalog still uses one label for all sections — scope by PDF pages instead. |
| **Sandbox** | `sandboxOutput` | **One path per catalog table**, shared by every section brief: `…/nightbane-morphus-stigmata-sandbox.json` |
| **Brief id** | `id` | `nightbane-morphus-<table>-<section>-ab-sandbox` (e.g. `…-stigmata-ii-ab-sandbox`) |
| **Session chain** | `linkedBriefs` | Link section briefs in run order so later sections patch the same sandbox |

**Section brief example** (Stigmata II — DD + Between the Shadows):

```json
{
  "id": "nightbane-morphus-stigmata-ii-ab-sandbox",
  "contentType": "morphus",
  "pass": "AB",
  "genre": "nightbane",
  "book": {
    "path": "src/data/reference/nightbane/WB6-Dark_Designs.pdf",
    "reference": "Nightbane® Dark Designs Sourcebook (WB6)",
    "pages": { "start": 140, "end": 141 },
    "supplement": {
      "path": "src/data/reference/nightbane/WB1-Between_the_Shadows.pdf",
      "reference": "Nightbane® Between the Shadows (WB1)",
      "pages": { "start": 132, "end": 133 }
    }
  },
  "options": {
    "table": "stigmata",
    "section": "II",
    "tableCategory": "Stigmata II"
  },
  "sandboxOutput": "src/data/source/ingest-briefs/output/nightbane-morphus-stigmata-sandbox.json",
  "linkedBriefs": ["nightbane-morphus-stigmata-iii-ab-sandbox"],
  "updateExisting": true,
  "passBAfterRulings": true
}
```

**Sandbox seeding across sections:**

1. **First section** in the chain — if sandbox file is missing, copy production `morphus/tables/<table>.json` into `sandboxOutput` **verbatim** (full trait list + percentile bands).
2. **Later sections** — patch `entries[]` in the **existing** sandbox; do not re-seed from production (would undo prior section work).
3. **Trait list** — production roster is authoritative; cross-check book names in Phase 1 and **open a ruling** for any book-only or production-only trait before add/remove.
4. **Ingest focus** — book-accurate `description` and Pass A/B structured mechanics on **existing** rows; do not replace custom percentiles or swap traits without user ruling.
5. **Compare** — run after each section (scoped) or once after all sections (full table):
   - Per section: `npm run ingest:brief -- compare <brief-id>` (uses `options.tableCategory` when set)
   - Full table: compare using any section brief id, or diff sandbox vs production manually

**When one brief is enough:** single printed table, or all sections share the **same two books and contiguous pages** (rare).

**Manifest lookup:** `src/data/source/morphus-ingest/<table>.manifest.json` lists which books/headings belong to each printed section (`descriptionAuthorityNote`, `books[].tableHeading`).

**Trait batch — sandbox AB + dual book** (single-section table):

```json
{
  "pass": "AB",
  "contentType": "morphus",
  "genre": "nightbane",
  "book": {
    "path": "src/data/reference/nightbane/WB6-Dark_Designs.pdf",
    "reference": "Nightbane® Dark Designs Sourcebook (WB6)",
    "pages": { "start": 40, "end": 42 },
    "supplement": {
      "path": "src/data/reference/nightbane/Nightbane_RPG.pdf",
      "reference": "Nightbane RPG",
      "pages": { "start": 188, "end": 190 }
    }
  },
  "options": { "table": "animal_canine" },
  "sandboxOutput": "src/data/source/ingest-briefs/output/nightbane-morphus-animal-canine-sandbox.json",
  "updateExisting": true,
  "passBAfterRulings": true,
  "notes": "Read both page ranges during review. Dark Designs wins description/mechanics conflicts. Order sources[] by genre master list (core before supplements). Do not write to src/data/content/morphus/."
}
```

- **`sandboxOutput`:** full **table wrapper** JSON (`id`, `kind`, `entries[]`) — not a flat trait array. Seed **verbatim from production** on first batch; patch `entries[]` in place for later batches. **Do not** replace production trait list or `percentile` bands from the book unless the user rules on a discrepancy.
- **`book.supplement`:** second printed source when the table appears in two books. Encode **both** in each trait's `sources[]` when the trait appears in both; **sort** multi-book `sources[]` per [`brief-format.md`](brief-format.md) § Multi-book source order; use the authoritative book for **description/mechanics** when they differ (see `docs/ingest/morphus.md`).
- **Compare:** `npm run ingest:brief -- compare <brief-id>` diffs sandbox `entries[]` vs production by trait `id` (filters to `options.tableCategory` when set).

**Trait batch** (default — single printed table):
```json
"options": { "table": "athlete" }
```

**Table PDF pipeline**:
```json
"options": {
  "mode": "table_pipeline",
  "table": "athlete",
  "tableHeading": "Athlete Table",
  "targetJson": "src/data/content/morphus/tables/athlete.json",
  "books": [
    "src/data/reference/nightbane/WB6-Dark_Designs.pdf",
    "src/data/reference/nightbane/Nightbane_RPG.pdf"
  ]
}
```

---

## Pass modes

| `pass` | Behavior |
|--------|----------|
| `"A"` | Catalog/chargen only (default) |
| `"B"` | Mechanical depth only — rows must already exist with Pass A complete |
| `"AB"` | **Phased:** all Pass A batches for the page range, audit gate, then all Pass B batches on the same items in one run |

### Phased A → B example

```json
{
  "pass": "AB",
  "contentType": "skills",
  "genre": "nightbane",
  "book": {
    "path": "src/data/reference/nightbane/Nightbane_RPG.pdf",
    "reference": "Nightbane RPG",
    "pages": { "start": 53, "end": 62 }
  },
  "options": { "category": "Physical" },
  "passBAfterRulings": true
}
```

Optional: `batchSizeOverride` (Pass A), `batchSizeOverrideB` (Pass B).

See [orchestrator.md](orchestrator.md) § Phase 2b for accuracy guardrails.

---

## Pass B follow-up brief (alternative to `pass: "AB"`)

Create a **second brief** with a distinct `id` and `pass: "B"`:

```
nightbane-skills-physical-pass-a.brief.json   → Pass A
nightbane-skills-physical-pass-b.brief.json   → Pass B (same pages, smaller batches)
```

---

## Agent kickoff (copy-paste)

```text
Run the ingest orchestrator on @src/data/source/ingest-briefs/<your-brief>.brief.json
Follow docs/ingest/orchestrator.md end-to-end.
```
