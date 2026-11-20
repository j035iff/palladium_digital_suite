# Advanced Skill & Dependency Engine

This document defines skill synergies, attribute scaling, prerequisites, and the commitment workflow. All modifiers are **signed integers** (positive or negative).

**Forge placement:** Skill picks on [Tab 4](./forge/character_creation.md). Physical dice and vitality commit on **Tab 5**. Spawn projection on **Tab 9** ([spawn handoff](./character_spawn_handoff.md)).

**Master equation authority:** `docs/stat_engine_spec.md` §6 cross-links here for percent formulas.

**Tab 4 selection UX (Joe 2026-11):** Vocational focus, vouchers, related, and secondary fill **in parallel** (no progressive browse locks). Left **Selected skills** shows **names only** (no %). Compact default rows are **name + action squares** on one line (Professional Quality **S**/**P**, Edit pencil, Remove **X**); click the skill name to expand requirements and synergies. Prerequisite skill names stay **green** when owned and **red** when missing (AND/OR groups color each referenced name individually; conjunction words stay neutral). Category dropdown sorter at the top of Selected skills defaults to **All**; options are only categories the character actually has selected. Combined sorter buckets: **Language & Literacy**, **Lore** (peeled from Technical), and **Weapon Proficiencies** (Ancient + Modern). Multi-category skills filter under the lane recorded at pick time (`CreationSkillPick.selectionCategory`). Shared path: library browse + Selected skills (`buildSkillPrerequisiteDisplay` → `SkillPrerequisiteMeta`; sorter `creationSelectedSkillsSorter.ts`). The skill library leaves already-selected rows in normal list order, labeled **Already selected**.

**Tab 4 library list row + description (Joe 2026-11):** Closed library rows show **name**, ⚠ when blocked, **unmet requirements only** (red; no met/green names), and right-side synergy link icons — **orange** = Synergies Available, **green** = Synergies Active. Click the name to open a **DESCRIPTION** panel: preview **% if selected** (`resolveSkillCreationDisplay`; hover shows the standard breakdown tooltip), full catalog description, then under a dividing line only when present — **REQUIRES** (unmet first in red with OR groups in parentheses; met last in green), synergies (**active** green above **available** orange), and **PHYSICAL BONUSES** (`formatPhysicalSkillBonusSummary`, same pattern as live Skills description). Omit empty REQUIRES / synergy / physical-bonus blocks (no divider when all absent). Helpers: `buildSkillUnmetPrerequisiteDisplay`, `buildSkillPrerequisiteDescriptionDisplay`, `partitionSkillSynergyHints` in `skillBlockDisplay.ts`; UI `CreationLibrarySkillRow`.

**Tab 4 library header (Joe 2026-11):** Instruction copy is removed. The library (right) header shows progress chips matching Selected skills (`Vocational Focus used/cap`, each `Voucher N used/cap`, `O.C.C. Related used/cap`, `Secondary used/cap`). Under those, **Any / None / Restrictions / Bonus** checkboxes (all on by default) filter which book categories appear in the Category dropdown — same buckets as `formatOccCategoryRuleDropdown` (`creationSkillCategoryAvailabilityFilter.ts`). **Vocational Focus** keeps its own lane availability checkbox set (OCC category tones). **Voucher 1…N do not** get those checkboxes. The Category dropdown lists **Voucher 1**, **Voucher 2**, … as separate options (not one lumped **Vouchers** category); browsing a voucher lane scopes skills / `+ Voucher N` to that lane (`creationVoucherSlots.ts`).

**Modern genre default base (Joe 2026-11):** Nightbane (and future modern genres with `defaultSkillBase: 'modern'`) always own Language Native (98% flat), Literacy Native (+30%), and Math: Basic (+10%). OCC Literacy/Math `bonusPercent` **stacks** on this base. Literacy ownership from this baseline satisfies Computer Operation’s Literacy prereq without duplicating Literacy on the OCC row. Shared path: `modernGenreSkillBase.ts` + `skills/utils/modern_genre_default_skill_base.json`.

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
| **Commit to sheet** | Tab 9 — Spawn | `applySpawnSheetHandoff()` projects skill %, applies physical skill attribute/SDC deltas to `primary` / `morphus` branches, sets `isFinalized: true`. |

**Rule:** Phase A ledger preview must match post-spawn sheet values for the same inputs (`stat_engine_spec.md` §2).

---

## 5. Similar skills (Acrobatics, Gymnastics, Aerobic Athletics)

Authority: `src/data/content/skills/utils/skill_global_rules.json`.

Acrobatics and Gymnastics give similar abilities and bonuses. When both are selected:

- **Bonuses and pluses add.** Every `physicalSkillBonuses` entry from both skills is added to the character (attributes, S.D.C. dice, roll with punch/fall/impact, and the other combat pluses on those rows).
- **Duplicated abilities do not add.** Shared percentile abilities (back flip, climb rope, sense of balance, and any other ability with the same name on both skills) keep the **best** proficiency at the character's current level: that copy's base plus its own percent per level. On the live Skills list the winner shows the %; the other copy stays visible as a **black dash** with hover tooltip **See {OtherParent}** (no second %).
- **Educational bonus once.** The I.Q. skill bonus is applied once, on that best proficiency.
- **Bundled Prowl and Climb do not rise with level** unless Prowl and/or Climbing are also selected as their own skills. A grant uses the fixed starting percent (Climbing: Acrobatics 40% or Gymnastics 25%, whichever source is present and higher; Prowl: 30% from either). If the separate skill is selected, use that skill's own ladder, add each physical skill's bonus-if-already-have (+15% / +7% Climbing, +5% Prowl from each), and apply the educational bonus once.

Abilities that exist on only one of the two skills (tightrope, parallel bars and rings) stay on that skill.

**Sense of Balance (Joe 2026-10-15):** Aerobic Athletics Sense of Balance joins the same best-of pool as Acrobatics / Gymnastics Sense of Balance. If more than one of these skills is known, use the highest proficiency; losers use the black-dash **See {winner}** UI.

---

## 6. Live Skills list categories

- **Selection category** — Skills listed under more than one book category (e.g. Prowl: Espionage / Physical / Rogue) appear on the live Skills list under the **category from which they were selected** during creation (`CreationSkillPick.selectionCategory` → `SheetSkill.selectionCategory`). Not a single canonical dump.
- **Language & Literacy** — Language and Literacy rows pin to a top Familiar Surface section labeled **Language & Literacy** (creation library still browses them under Technical).
- **Weapon proficiencies** — name only on the closed skill box (no % and no bonus/summary text).
- **Hand-to-Hand** — not on the Skills overlay at all (no top control, no category rows). Styles are managed in Combat Unarmed.
- **% tooltip OCC/RCC** — base package skills show `[OCC: N]` / `[RCC: N]`; Related picks show `[OCC Related: N]` / `[RCC Related: N]` (creation related / related-voucher tier; R.C.C. via race composition).
