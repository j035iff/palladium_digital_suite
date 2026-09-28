# Palladium Digital Suite

Schema-driven character manager and rules automation engine for the **Palladium Megaverse** — starting with **Nightbane**.

## Quick start

```bash
npm install
npm run dev          # Vite on all interfaces (Network URL for LAN) + interim WS :8765
npm test
npm run validate:schemas
```

**Same-WiFi Join Table:** GM opens a campaign → **Open Table**. Players on other devices open the app (`npm run dev` on their machine), **Join Table** — Join Session lists the campaign via LAN `/discover` (UDP beacon). Advanced code/IP only if browse fails.

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
