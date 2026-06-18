# Content catalog layout

Where authored JSON lives under `src/data/content/`, how loaders discover it, and where **ancillary** (supporting) files go.

**Canonical path constants:** `src/lib/palladiumSchemaPaths.ts`  
**Validation:** `npm run validate:schemas`

---

## Folder roles

| Role | Location | Loader behavior |
|------|----------|-----------------|
| **Primary catalog rows** | Top-level `*.json` in the content folder (or genre subfolders — see below) | Globs / `readdir` only the catalog pool — not `utils/` |
| **Ancillary / registry JSON** | `<catalog-dir>/utils/*.json` | Imported by path constant or direct import — **not** merged into the primary catalog loader |
| **Genre-scoped pools** | `<catalog-dir>/<genre>/…` | Loader indexes by `(genreId, rowId)` where applicable (races, O.C.C.s, XP tables) |

**Rule:** If a JSON file is **not** a row pool the creation/runtime catalog loader iterates (skills, spells, psionics, races, O.C.C.s, talents, morphus tables), it belongs in **`utils/`** inside that catalog folder — unless there is an explicit, documented exception at the folder root.

---

## `utils/` by catalog (current)

### `skills/`

| File | Location | Purpose |
|------|----------|---------|
| Category skill arrays (`communications.json`, `rogue.json`, …) | `skills/*.json` | Primary skill catalog |
| `hand_to_hand.json` | `skills/` (root) | Hand-to-Hand combat catalog — **exception:** first-class pool at root |
| `weapon_proficiencies.json` | `skills/` (root) | W.P. catalog — **exception:** first-class pool at root |
| `skill_trait_registry.json` | `skills/utils/` | Trait id definitions for Morphus / penalties |
| `standard_modern_weapon_progression.json` | `skills/utils/` | Shared modern W.P. level ladder document |

Loaders: `skillsCatalogLoader.ts` skips root ancillary files via `isSkillCategoryCatalogFile()` (`hand_to_hand.json`, `weapon_proficiencies.json` only).

### `magic/`

| File | Location | Purpose |
|------|----------|---------|
| School spell arrays (`wizard.json`, `mirror.json`, …) | `magic/*.json` | Primary spell catalog |
| `magic_schools.json` | `magic/utils/` | Valid school slugs per `gameSystem` |
| `magic_cross_lists.json` | `magic/utils/` | Enumerated borrow lists for O.C.C. `spellAccessRules` |

Loader: `magicCatalogLoader.ts` globs `magic/*.json` only (not `utils/`).

### `psionics/`

| File | Location | Purpose |
|------|----------|---------|
| Category power arrays (`sensitive.json`, `physical.json`, …) | `psionics/*.json` | Primary psionic catalog |
| `psionic_genre_categories.json` | `psionics/utils/` | Valid category slugs per genre |
| `psionic_global_rules.json` | `psionics/utils/` | I.S.P. / meditation / ley-line rules |

Loader: `psionicCatalogLoader.ts` globs `psionics/*.json` only.

### Other catalogs (no `utils/` yet)

| Catalog | Layout | Notes |
|---------|--------|-------|
| **Races** | `races/<genre>/{player,npc,gm_approval}.json` | Genre folder = whitelist; same `id` may repeat across genres (e.g. `race_human`) |
| **O.C.C.s** | `occs/<genre>/<book>.json` | One file per source book |
| **XP tables** | `progression/xp_tables/<genre>/<book>.json` | Mirrors O.C.C. genre folders |
| **Talents** | `talents/common.json`, `talents/elite.json` | Tier-band split |
| **Morphus** | `morphus/tables/*.json`, `morphus/forge/*.json` | Per-table trait files; Sub-Forge routing in `forge/` |

When a new ancillary file is needed for these catalogs (e.g. a shared progression doc), add `utils/` under that catalog folder and follow the same pattern.

---

## Adding or moving files — checklist

1. **Classify** the JSON: primary catalog row pool vs ancillary/registry vs genre-scoped pool.
2. **Place** ancillary files in `<catalog-dir>/utils/` unless they are documented root exceptions (like `hand_to_hand.json`).
3. **Update** `src/lib/palladiumSchemaPaths.ts` path constants.
4. **Update** the catalog loader (or add an exclusion list if the file must live at catalog root).
5. **Update** `scripts/validate-palladium-schemas.mjs` if validation walks that path.
6. **Update** ingest playbook + `docs/gemini-project-context.md` content tables if counts or paths change.
7. Run `npm run validate:schemas` and relevant tests.

---

## Ingest playbooks

Row authoring rules stay in the per-type ingest docs:

- `docs/ingest/skills.md`
- `docs/ingest/hth.md`
- `docs/ingest/weapon_proficiencies.md`
- `docs/ingest/magic.md`
- `docs/ingest/psionics.md`
- `docs/ingest/occs.md`
- `docs/ingest/races.md`
- `docs/ingest/xp_tables.md`
- `docs/ingest/talents.md`
- `docs/ingest/morphus.md`

**This file** is the shared **layout** contract; ingest docs link here for paths and `utils/` rules.
