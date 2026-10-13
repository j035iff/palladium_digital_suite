# Advanced Skill & Dependency Engine

This document defines skill synergies, attribute scaling, prerequisites, and the commitment workflow. All modifiers are **signed integers** (positive or negative).

**Forge placement:** Skill picks on [Tab 4](./forge/character_creation.md). Physical dice and vitality commit on **Tab 5**. Spawn projection on **Tab 8** ([spawn handoff](./character_spawn_handoff.md)).

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
Final % = [Base + (PerLevel × (EffLevel − 1))] + OCC + IQ% + synergies + per-skill attr mods + status
```

- **I.Q. scaling:** exceptional table from 17+ applies to **all** skills (see `attributeBonuses.ts` / stat engine).
- **M.A. / P.B.:** affect Trust/Intimidate and Charm/Impress attribute rolls — **not** a global skill bump. When a skill lists M.A./P.B. scaling (e.g. Seduction), encode it on that catalog row via `skillPercentAttributeModifiers`.
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

---

## 5. Similar skills (Acrobatics and Gymnastics)

Authority: `src/data/content/skills/utils/skill_global_rules.json`.

Acrobatics and Gymnastics give similar abilities and bonuses. When both are selected:

- **Bonuses and pluses add.** Every `physicalSkillBonuses` entry from both skills is added to the character (attributes, S.D.C. dice, roll with punch/fall/impact, and the other combat pluses on those rows).
- **Duplicated abilities do not add.** Shared percentile abilities (back flip, climb rope, sense of balance, and any other ability with the same name on both skills) keep the **best** proficiency at the character's current level: that copy's base plus its own percent per level. On the live Skills list the winner shows the %; the other copy stays visible as a **black dash** with hover tooltip **See {OtherParent}** (no second %).
- **Educational bonus once.** The I.Q. skill bonus is applied once, on that best proficiency.
- **Bundled Prowl and Climb do not rise with level** unless Prowl and/or Climbing are also selected as their own skills. A grant uses the fixed starting percent (Climbing: Acrobatics 40% or Gymnastics 25%, whichever source is present and higher; Prowl: 30% from either). If the separate skill is selected, use that skill's own ladder, add each physical skill's bonus-if-already-have (+15% / +7% Climbing, +5% Prowl from each), and apply the educational bonus once.

Abilities that exist on only one of the two skills (tightrope, parallel bars and rings) stay on that skill.

---

## 6. Live Skills list categories

- **Selection category** — Skills listed under more than one book category (e.g. Prowl: Espionage / Physical / Rogue) appear on the live Skills list under the **category from which they were selected** during creation (`CreationSkillPick.selectionCategory` → `SheetSkill.selectionCategory`). Not a single canonical dump.
- **Language & Literacy** — Language and Literacy rows pin to a top Familiar Surface section labeled **Language & Literacy** (creation library still browses them under Technical).
- **Weapon proficiencies** — name only on the closed skill box (no % and no bonus/summary text).
- **Hand-to-Hand** — not on the Skills overlay at all (no top control, no category rows). Styles are managed in Combat Unarmed.
