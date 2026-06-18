# Advanced Skill & Dependency Engine

This document defines skill synergies, attribute scaling, prerequisites, and the commitment workflow. All modifiers are **signed integers** (positive or negative).

**Forge placement:** Skill picks on [Tab 4](./forge-character_creation.md). Physical dice and vitality commit on **Tab 5**. Spawn projection on **Tab 8** ([spawn handoff](./character_spawn_handoff.md)).

**Master equation authority:** `docs/stat_engine_spec.md` §6 cross-links here for percent formulas.

---

## 1. Skill acquisition & leveling

- **Acquisition level** — Each skill stores the character level at which it was gained.
- **Proficiency level** = (current level) − (acquisition level) + 1.
- **Selection constraints** — Skills may be tagged O.C.C. Only or No Secondary to block invalid builds.

---

## 2. Synergy & gating

| Type | Logic | Example |
|------|-------|---------|
| **AND** | Requires all listed skills | Mechanical Engineering requires Literacy AND Electronics |
| **OR** | Requires at least one listed skill | Mech. Engineering requires Math: Basic OR Math: Advanced |
| **Synergy** | Skill A grants % bonus to Skill B | Math: Advanced grants +10% to Astronomy |

**Catalog:** `src/data/content/skills/*.json` (loader: `skillsCatalogLoader.ts`).

---

## 3. Scaled attribute & status modifiers

**Master skill equation:**

```
Final % = [Base + (PerLevel × (EffLevel − 1))] + OCC + IQ% + synergies + attr scaling + status
```

- **M.A. scaling:** +1% per point above M.A. 20.
- **P.B. scaling:** +1% per 2 points above P.B. 17.
- **Status modifiers:** Global signed variable (e.g. −20% Confused, +10% Blessed).

---

## 4. Commitment workflow (forge tabs)

Physical skill bonuses (S.D.C., attributes) are staged, then committed in phases:

| Phase | Forge tab | What happens |
|-------|-----------|----------------|
| **Stage** | Tab 4 — Skills | Skills selected; physical bonuses shown as pending in Live Ledger preview. |
| **Dice entry** | Tab 5 — Roll Pending | User enters manual dice for H.P., S.D.C., P.P.E., I.S.P., OCC/skill attribute dice, and skill S.D.C. groups. **Continue** commits primary vitality. |
| **Morphus dice** | Tab 6 — Traits (Nightbane) | Morphus H.P./S.D.C. and trait-driven dice when applicable. |
| **Commit to sheet** | Tab 8 — Spawn | `applySpawnSheetHandoff()` projects skill %, applies physical skill attribute/SDC deltas to `primary` / `morphus` branches, sets `isFinalized: true`. |

**Rule:** Phase A ledger preview must match post-spawn sheet values for the same inputs (`stat_engine_spec.md` §2).
