# Ingest briefs

Standardized job input for multi-batch catalog ingest.

| Resource | Path |
|----------|------|
| Format reference | [`docs/ingest/brief-format.md`](../../../docs/ingest/brief-format.md) |
| Agent workflow | [`docs/ingest/orchestrator.md`](../../../docs/ingest/orchestrator.md) |
| JSON schema | [`src/data/schemas/ingest-brief.schema.json`](../../schemas/ingest-brief.schema.json) |
| Examples | `examples/*.brief.json` |
| Run state (generated) | `runs/<brief-id>/run.json` |
| Sandbox output (test runs) | `output/*.json` — set via `sandboxOutput` on brief |

## Quick start

```bash
cp examples/nightbane-skills-physical-pass-a.brief.json my-job.brief.json
# edit my-job.brief.json

npm run ingest:brief -- validate my-job.brief.json
npm run ingest:brief -- init my-job.brief.json
npm run ingest:brief -- compare my-job   # when sandboxOutput is set
```

Then in chat:

```text
Run the ingest orchestrator on @src/data/source/ingest-briefs/my-job.brief.json
Follow docs/ingest/orchestrator.md end-to-end.
```

PDFs referenced in `book.path` live under `src/data/reference/` (gitignored).
