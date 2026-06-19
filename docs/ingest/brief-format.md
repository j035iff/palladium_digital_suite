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
| `morphus` | `morphus.md` | 3 traits | 1–2 traits | `table`; see morphus modes |
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

**Trait batch** (default):
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
