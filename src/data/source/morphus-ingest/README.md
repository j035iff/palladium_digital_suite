# Morphus ingest (per-table pipeline)

Orchestrates one or more books → JSON → schema validation → merge → aggregation coverage for one Morphus trait table.

## Multi-book rules

- List every PDF that contains the table in the manifest `books[]` array.
- **Dark Designs** is the **authoritative** source for `description` and mechanics when wording differs (`authoritativeBookKey`: `dark_designs`).
- Each characteristic row gets a **`sources`** array with one entry per book (printed **start page** only).
- **Other** percentile rows are skipped (`excludeOther`: true).

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

npm run morphus:ingest -- all athlete
```

Or edit `athlete.manifest.json` directly, then `npm run morphus:ingest -- extract athlete`.

## Chat prompt template

```text
Ingest Morphus table:
- Table heading: "Athlete Table"
- Target: src/data/content/morphus/tables/athlete.json
- Books (authoritative first):
  - src/data/reference/nightbane/WB6-Dark_Designs.pdf — Nightbane® Dark Designs Sourcebook (WB6)
  - src/data/reference/nightbane/Nightbane_RPG.pdf — Nightbane RPG
- Skip Other rows. Use Dark Designs for description/rules if texts differ.
```

## Commands

| Command | Purpose |
|---------|---------|
| `init` | Create `<id>.manifest.json` with `books[]` |
| `extract` | Per-book `extracted/<key>.txt`, merged `traits-index.json`, `extracted-authoritative.txt` |
| `scaffold` | Multi-book `sources` on each staging row |
| `report` | Validation + `description-compare.json` warnings |
| `merge` | Staging → target table JSON |
| `validate` | `npm run validate:schemas` |
| `aggregate` | Aggregation hook coverage |
| `all` | extract → scaffold → report → validate → aggregate |

## Work directory (`<table>/`)

| File | Role |
|------|------|
| `extracted/dark_designs.txt` | Full table text from that PDF |
| `extracted-authoritative.txt` | Copy used for transcription |
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
| `required: false` | In manifest book entry — skip PDF if table heading missing (e.g. DD-only tables) |
