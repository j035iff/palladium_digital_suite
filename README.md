# Palladium Digital Suite

Schema-driven character manager and rules automation engine for the **Palladium Megaverse** — starting with **Nightbane**.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm test
npm run validate:schemas
```

**Production build:** `npm run build` runs `tsc -b` then Vite. If TypeScript errors block the build, `npx vite build` still produces a preview bundle.

## Documentation

| Start here | Purpose |
|------------|---------|
| [docs/vision.md](docs/vision.md) | Product pillars (source of truth for design) |
| [docs/gemini-project-context.md](docs/gemini-project-context.md) | Codebase map for AI assistants |
| [docs/character_creation.md](docs/character_creation.md) | Creation forge doc index (8-tab flow) |
| [docs/stat_engine_spec.md](docs/stat_engine_spec.md) | Stat formulas (Live Ledger source of truth) |

## Stack

React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · Ajv JSON Schema · Vitest

Content lives under `src/data/content/`; rules engines under `src/lib/`.
