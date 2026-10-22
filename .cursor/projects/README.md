# Cursor Projects — seed prompts

Versioned **first messages** for Cursor [Projects](https://cursor.com/blog/projects) coordinators. These are not a substitute for `docs/vision.md`, `.cursorrules`, or ingest playbooks — they point agents at those sources.

## Create a Project (once per body of work)

1. Left-hand nav → **Projects** → start a new Project.
2. Attach this repo / cloud environment (`palladium_digital_suite`).
3. Open the matching seed below and paste its **entire body** (everything under the `---` fence, or the whole `.seed.md` if you prefer) as the coordinator’s first message.
4. Let the coordinator finish the research pass into shared Project context, then drive feature/batch work as usual.

| Project name (suggested) | Seed file |
|--------------------------|-----------|
| Character Creation Forge | [`character-creation.seed.md`](character-creation.seed.md) |
| Live Character Sheet | [`character-sheet.seed.md`](character-sheet.seed.md) |
| Gear Forge | [`gear-forge.seed.md`](gear-forge.seed.md) |
| Content Ingest | [`content-ingest.seed.md`](content-ingest.seed.md) |
| GM Hub | [`gm-hub.seed.md`](gm-hub.seed.md) |
| Gardening (optional) | [`gardening.seed.md`](gardening.seed.md) |

## After seed

- Correct coordinator mistakes so preferences stick in **shared Project context**.
- Keep git-backed docs/rules as the canonical constraints; update them when conventions change.
- Subscriptions (PR/CI follow, schedules) — enable on **Gardening** only after the feature/ingest Projects feel trustworthy.

## Feature coordinators — rulings gate

Applies to **Character Creation**, **Live Character Sheet**, **Gear Forge**, and **GM Hub** (not Content Ingest or Gardening).

For every feature request, the coordinator must:

1. Research first (enough to ground the ask).
2. Before any implementation: scan for edge cases or ambiguities in **Palladium mechanics/rules** and **user-facing behavior**.
3. If any exist → ask the human for numbered rulings and wait.
4. If none → send an explicit human-facing message that there are no ambiguities and work will start, then proceed.

Content Ingest keeps its existing mechanics-ruling language in its seed; do not dilute or replace it here.

## Related

- Pillars / AI protocol: `docs/vision.md`, `.cursorrules`
- Unified Path registry: `docs/unified_paths.md`
- Doc-sync checklist: `docs/gemini-project-context.md` § Development workflow
