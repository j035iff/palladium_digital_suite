# Ingest orchestrator

Run a **multi-batch ingest job** from one standardized brief file instead of pasting each batch by hand.

**Brief format:** [`brief-format.md`](brief-format.md)  
**Brief files:** `src/data/source/ingest-briefs/*.brief.json`  
**Run state:** `src/data/source/ingest-briefs/runs/<brief-id>/run.json`  
**CLI:** `npm run ingest:brief -- <command>`

---

## User workflow (one message)

1. Copy [`examples/nightbane-skills-physical-pass-a.brief.json`](../src/data/source/ingest-briefs/examples/nightbane-skills-physical-pass-a.brief.json) (or another example).
2. Fill in `contentType`, `pass`, `book`, `genre`, and type-specific `options`.
3. Validate and init run state:

```bash
npm run ingest:brief -- validate src/data/source/ingest-briefs/my-job.brief.json
npm run ingest:brief -- init src/data/source/ingest-briefs/my-job.brief.json
```

4. Open an agent session with:

```text
Run the ingest orchestrator on @src/data/source/ingest-briefs/my-job.brief.json
Follow docs/ingest/orchestrator.md end-to-end. Do not stop until all batches are complete or blocked on open rulings.
```

---

## Agent workflow (mandatory steps)

When the user points at a `.brief.json` file (or asks to run the orchestrator), follow **all** phases below. Update `src/data/source/ingest-briefs/runs/<id>/run.json` after each phase.

### Phase 0 — Load brief

1. Read the brief JSON and run `npm run ingest:brief -- validate <brief>`.
2. If no run exists, run `npm run ingest:brief -- init <brief>`.
3. Load the matching playbook from the registry (`scripts/lib/ingest-brief-registry.mjs` → `playbook` path).
4. Set `run.phase = "review"` and `run.status = "in_progress"`.

**Morphus `table_pipeline` exception:** When `contentType` is `morphus` and `options.mode` is `table_pipeline`, follow [`morphus.md`](morphus.md) + `npm run morphus:ingest` instead of manual batching. Still maintain `run.json` checklist/rulings; batches are pipeline steps (`prepare`, `build`, `finalize`).

### Phase 1 — Content review → checklist

1. Read the PDF pages in `book.path` (or ask the user to attach pages if the file is unavailable locally).
2. List every **ingestable row** in scope (exact printed names).
3. **Exclude** non-playable routers, duplicates outside scope, and rows already complete in catalog (note as `skipped` if `updateExisting` is false and row is Pass-complete per audit).
4. Write `run.checklist[]`:

```json
{ "name": "Acrobatics", "status": "pending", "pages": "53", "notes": null }
```

Statuses: `pending` | `ingested` | `skipped` | `blocked`

5. If `brief.items` was pre-filled, reconcile names against the book (fix spelling, add missing rows, drop out-of-scope names).

**Deliverable to user (optional pause):** Short checklist summary before batching — only stop here if the user asked for review-first; otherwise continue.

### Phase 2 — Batch plan

1. Determine batch size: `brief.batchSizeOverride` ?? registry default for `contentType` + `pass` (see [`brief-format.md`](brief-format.md)).
2. Split `checklist` items with `status: "pending"` into batches respecting:
   - Default size from playbook
   - **Smaller batches** when notes flag heavy rows (split bases, rituals, long prerequisites, many variants)
   - **Page affinity** — keep items that share a page range together when possible
3. Write `run.batches[]`:

```json
{
  "id": "batch-01",
  "status": "pending",
  "pass": "A",
  "pages": { "start": 53, "end": 55 },
  "items": ["Acrobatics", "Climbing", "Gymnastics", "Swimming", "Running", "Prowl"],
  "playbookScope": "catalog-only",
  "notes": null
}
```

4. Set `run.phase = "ingest"` (or `plan_a` when `brief.pass` is `AB`).

### Phase 2b — Phased Pass A → Pass B (`pass: "AB"`)

Use when the brief has `"pass": "AB"`. **Do not** combine Pass A and Pass B fields in the same batch for multi-item catalogs (skills, magic, psionics, talents) — accuracy drops when encoding catalog + mechanics together at full batch size.

**Order (mandatory):**

1. **Plan Pass A batches** — playbook Pass A batch size (`batchSizeOverride`).
2. **Ingest all Pass A batches** — catalog/chargen fields only; same rules as Phase 3.
3. **Pass A audit gate** — run `validate:schemas` + type audit (`audit:skills`, `audit:talents`, …). Every ingested checklist item must be Pass A complete per engine contract before any Pass B work.
4. **Rulings gate (optional)** — when `passBAfterRulings: true`, stop after step 3 if any **open Pass A** rulings remain; report to user and set `run.phase = "blocked_a"`. Otherwise continue but **skip Pass B** on items with open Pass A rulings.
5. **Plan Pass B batches** — same checklist items, smaller batch size (`batchSizeOverrideB` ?? playbook Pass B default). Batch ids: `batch-b-01`, …
6. **Ingest all Pass B batches** — mechanical depth only; patch existing rows by `id`, do not recreate identity/sources from scratch.
7. **Pass B validation** — `validate:schemas` after each Pass B batch.

Update `run.currentPassPhase` (`A` → `B`) at step 5. Checklist tracking:

| Field | Meaning |
|-------|---------|
| `passA` | `pending` \| `complete` \| `blocked` \| `skipped` |
| `passB` | `pending` \| `complete` \| `blocked` \| `skipped` (null when not AB) |

**When to use `pass: "AB"` vs separate briefs**

| Prefer `AB` | Prefer separate `A` then `B` briefs |
|-------------|-------------------------------------|
| Same page range, you want one session | Very large ranges (context drift risk) |
| Skills, magic, psionics, talents, encounters | You want to review Pass A in git before Pass B |
| O.C.C./race where Pass B follows immediately on same row | Pass B spans different pages or supplements |

**Accuracy guardrails**

- Never start Pass B on a row whose Pass A is incomplete or blocked by an open ruling.
- Re-read the book for Pass B — do not rely on memory from Pass A encoding.
- Pass B batches are smaller; do not inflate to Pass A size.

### Phase 3 — Ingest batches (loop)

For each batch with `status: "pending"` or `status: "in_progress"`:

1. Set batch `status` → `in_progress`.
2. Follow the **per-type playbook** Pass A/B rules for that batch only.
3. Encode catalog JSON. **Never guess** on ambiguous mechanics — record a ruling (below) and use a conservative stub or skip the ambiguous field.
4. After each batch, run validation from registry (`validate:schemas` + type audit when listed).
5. On success: batch `status` → `complete`; append id to `run.completedBatchIds`; mark checklist items `ingested`.
6. On validation failure: fix in-session if clear; otherwise add ruling and set batch `blocked` until resolved.
7. Update `run.updatedAt` after every batch.

**Coordination:** When `linkedBriefs` is set, ingest linked jobs in the same session (e.g. race + Shadow O.C.C.) per the paired playbooks.

**Sandbox output:** When `brief.sandboxOutput` is set, write catalog rows **only** to that path (JSON array for skills/talents/etc.). **Never** modify `src/data/content/` during a sandbox run. Still validate rows against the type schema before marking a batch complete.

### Phase 4 — Rulings log

Throughout ingest, append to `run.rulings[]` (mirror open items in `rulings.json`):

```json
{
  "id": "ruling-01",
  "status": "open",
  "batchId": "batch-02",
  "item": "Demolitions",
  "question": "Book lists both Military and Mercenary variants on the same line — one skill row or splitBaseTracks?",
  "bookExcerpt": "…",
  "options": ["Single row with specialization", "splitBaseTracks per O.C.C."],
  "userRuling": null,
  "createdAt": "2026-06-19T…"
}
```

**Do not block the whole job** on one ruling unless the batch cannot proceed at all — continue other batches, mark affected batch `blocked`.

### Phase 5 — Completion report

When all batches are `complete` or `blocked`:

1. Set `run.status` to `complete` if zero open rulings and zero blocked batches; else `blocked`.
2. Set `run.phase = "done"`.
3. Reply to the user with:

| Section | Content |
|---------|---------|
| **Summary** | Brief title, items ingested / skipped / blocked |
| **Validation** | Last-run command results |
| **Files touched** | Catalog paths changed |
| **Open rulings** | Numbered list with `id`, `item`, `question`, `options` — **empty if none** |
| **Next steps** | Pass B brief (if single-pass A), linked briefs, or re-run blocked batches after rulings |

When `pass` was `AB`, the completion report must summarize **both** passes (Pass A complete count, Pass B complete count, items skipped for Pass B due to Pass A rulings).


```markdown
## Ingest complete: <title>

**Result:** <N> ingested · <M> skipped · <B> blocked batches

### Validation
- `npm run validate:schemas` — pass/fail
- …

### Catalog changes
- `src/data/content/…`

### Rulings needed
1. **[ruling-01]** <item> — <question>
   - Options: …
   - Book: "<excerpt>"

*(None — all mechanics were unambiguous.)*

### Suggested follow-up
- …
```

---

## Run state schema (`run.json`)

| Field | Purpose |
|-------|---------|
| `status` | `planned` \| `in_progress` \| `blocked` \| `complete` |
| `phase` | `review` \| `plan` \| `plan_a` \| `ingest` \| `audit_a` \| `plan_b` \| `ingest_b` \| `blocked_a` \| `done` |
| `currentPassPhase` | `A` \| `B` when `pass` is `AB` |
| `passPhases` | `["A"]`, `["B"]`, or `["A","B"]` |
| `checklist[]` | All rows discovered in Phase 1 |
| `batches[]` | Planned batches with per-batch status |
| `rulings[]` | Open + resolved ambiguity log |
| `completedBatchIds[]` | Finished batch ids |
| `validationCommands[]` | Copied from registry at init |

---

## Rules (non-negotiable)

1. **Mechanical integrity** — follow the type playbook and schema; flag ambiguity, do not guess.
2. **One batch at a time** — finish validation before starting the next batch.
3. **Persist state** — update `run.json` so a resumed session can continue from the last incomplete batch.
4. **Doc sync** — if ingest conventions change, update the type playbook in the same session.
5. **Example JSON** — if schema changes, update the matching example under `src/data/schemas/examples/`.

---

## Quick commands

```bash
npm run ingest:brief -- validate src/data/source/ingest-briefs/my-job.brief.json
npm run ingest:brief -- init src/data/source/ingest-briefs/my-job.brief.json
npm run ingest:brief -- show src/data/source/ingest-briefs/my-job.brief.json
npm run ingest:brief -- status my-job
npm run ingest:brief -- chunk --items "A,B,C,D,E,F,G" --size 6
```

---

## Related

| Doc | Role |
|-----|------|
| [`brief-format.md`](brief-format.md) | Brief JSON field reference |
| [`_README.md`](_README.md) | Per-catalog playbooks index |
| [`../gemini-project-context.md`](../gemini-project-context.md) | Project-wide ingest status |
