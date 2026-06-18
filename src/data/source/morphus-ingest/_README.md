# Morphus ingest (per-table pipeline)

**Agent playbook:** [`docs/ingest/morphus.md`](../../../docs/ingest/morphus.md)  
**Field encoding:** [`docs/morphus_authoring.md`](../../../docs/morphus_authoring.md)

Orchestrates one or more books → schema-ready → JSON → validation → aggregation coverage for one Morphus trait table.

## High-level pipeline

| Phase | Command | What happens |
|-------|---------|----------------|
| **1. Prepare** | `prepare <table>` | Extract PDF → **schema loop** (analyze book vs schema → apply schema patches → re-analyze until no edge cases) |
| **2. Build** | `build <table>` | Scaffold staging JSON → transcribe mechanics → merge → validate |
| **3. Finalize** | `finalize <table>` | Aggregation hook coverage report |

```bash
npm run morphus:ingest -- prepare biomechanical
# … transcribe entries.staging.json or target JSON …
npm run morphus:ingest -- merge biomechanical   # when staging is complete
npm run morphus:ingest -- build biomechanical
npm run morphus:ingest -- finalize biomechanical
```

`all` runs **prepare only** and prints the build/finalize commands.

## Schema loop (steps 1–2 repeat)

Inside `prepare` / `schema-loop`:

1. **analyze-schema** — `schema-analysis.json` lists `edgeCases` (missing schema paths, unknown target keys, unmatched mechanical prose).
2. **apply-schema** — safe automatic patches to `palladium-morphus.schema.json` + `src/types.ts`; writes `schema-gap-tasks.json` when manual edits are needed.
3. Re-run analyze until `readyToTranscribe: true` or no automatic patches remain (then fix schema by hand and re-run `schema-loop`).

```bash
npm run morphus:ingest -- schema-loop hobbyist --max 12
```

Do **not** transcribe table JSON until `schema-analysis.json` has `"readyToTranscribe": true`.

## Multi-book rules

- List every PDF that contains the table in the manifest `books[]` array.
- **Dark Designs** is the **authoritative** source for `description` and mechanics when wording differs (`authoritativeBookKey`: `dark_designs`).
- Each characteristic row gets a **`sources`** array with one entry per book (printed **start page** only).
- **Other** percentile rows are skipped (`excludeOther`: true).
- **Mind control** save bonuses are stripped from descriptions and notes during structure/merge (`scripts/lib/morphus-nightbane-prose.mjs`) — Nightbane are immune to mind control in play.

## Prerequisites

- Node 18+
- Python 3 + PyMuPDF: `pip install pymupdf`
- PDFs under `src/data/reference/` (gitignored)

## Quick start (two books)

```bash
npm run morphus:ingest -- init --id athlete --display "Athlete" \
  --heading "Athlete Table" \
  --book src/data/reference/nightbane/WB6-Dark_Designs.pdf \
  --also-book src/data/reference/nightbane/Nightbane_RPG.pdf

npm run morphus:ingest -- prepare athlete
```

## Chat prompt template

```text
Ingest Morphus table:
- Table heading: "Athlete Table"
- Target: src/data/content/morphus/tables/athlete.json
- Books (authoritative first):
  - src/data/reference/nightbane/WB6-Dark_Designs.pdf — Nightbane® Dark Designs Sourcebook (WB6)
  - src/data/reference/nightbane/Nightbane_RPG.pdf — Nightbane RPG
- Skip Other rows. Use Dark Designs for description/rules if texts differ.
- Run prepare (schema-loop) until readyToTranscribe; extend schema for edgeCases; then build JSON; then finalize.
```

## Commands

| Command | Purpose |
|---------|---------|
| `prepare` | `extract` + `schema-loop` |
| `build` | Scaffold (if needed), report, validate target JSON |
| `finalize` | Aggregation coverage |
| `init` | Create `<id>.manifest.json` with `books[]` |
| `extract` | Per-book `extracted/<key>.txt`, merged `traits-index.json` |
| `analyze-schema` | `schema-analysis.json` |
| `apply-schema` | Apply patches from last analysis |
| `schema-loop` | Analyze ↔ apply until ready (or manual tasks) |
| `scaffold` | Multi-book `sources` on staging rows |
| `sync-sources` | Refresh `sources[]` on target (and staging) from `traits-index.json` after re-extract |
| `report` | Validation + book index diff |
| `merge` | Staging → target table JSON |
| `validate` | `npm run validate:schemas` |
| `aggregate` | Aggregation hook coverage |
| `all` | Same as `prepare` |

## Work directory (`<table>/`)

| File | Role |
|------|------|
| `extracted/dark_designs.txt` | Full table text from that PDF |
| `extracted-authoritative.txt` | Copy used for transcription |
| `schema-analysis.json` | Edge cases vs schema |
| `schema-apply-log.json` | Patches applied in last apply-schema |
| `schema-gap-tasks.json` | Manual schema work when auto-apply cannot continue |
| `schema-loop-report.json` | Iteration history for schema-loop |
| `traits-index.json` | Merged traits + per-book `sources` |
| `description-compare.json` | Traits whose prose differs across books |
| `entries.staging.json` | Schema rows before merge |

## Manifest (`books[]`)

```json
{
  "authoritativeBookKey": "dark_designs",
  "excludeOther": true,
  "books": [
    {
      "key": "dark_designs",
      "pdf": "src/data/reference/nightbane/WB6-Dark_Designs.pdf",
      "reference": "Nightbane® Dark Designs Sourcebook (WB6)",
      "tableHeading": "Athlete Table",
      "authoritative": true
    },
    {
      "key": "core",
      "pdf": "src/data/reference/nightbane/Nightbane_RPG.pdf",
      "reference": "Nightbane RPG",
      "tableHeading": "Athlete Table"
    }
  ]
}
```

Legacy single-book manifests (`bookPdf` + `sourceReference`) still work; they normalize to one `books[]` entry.

## Init flags

| Flag | Meaning |
|------|---------|
| `--book` | Primary PDF (Dark Designs → authoritative automatically) |
| `--also-book` | Repeatable secondary PDFs |
| `--also-reference` | Optional reference title per `--also-book` (same order) |
| `--also-heading` | Optional table heading if it differs per book |
| `--authoritative` | Force primary book authoritative |
| `--books-file` | JSON file with `books` array |
| `--include-other` | Do not skip Other rows |
| `--re-extract` | Force PDF extract during `prepare` |
| `--max` | Max schema-loop iterations (default 12) |
| `required: false` | In manifest book entry — skip PDF if table heading missing (e.g. DD-only tables) |
