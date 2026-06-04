# Character Creation Forge: Tab Sequence & State Specification

## Overview

The Character Creation flow is an implementation of the [Universal Forge Navigation Engine](./universal_forge_navigation_engine.md). It begins **after** [Create Character](./app_viewport_launcher.md) — not at app launch. All seven primary tabs are permanently rendered in the header viewport. Progression is strictly linear, requiring manual validation via the **Continue** button to shift a tab from Blue (Active) to Green (Complete) and unlock the next sequential step.

**Continue never changes the viewport** — after Continue, the user selects the next tab manually. **Continue never locks data** — only the Tab 7 spawn confirmation modal runs [spawn handoff](./character_spawn_handoff.md).

---

## Cross-Cutting Rules

### Yellow (Conflict) vs Red (Incomplete)

- **Yellow:** A tab was Green, upstream data changed, and this tab’s stored snapshot no longer matches the live payload (even if current fields still pass validation). Player data is **not** auto-cleared; the tab shows what must be re-confirmed.
- **Red:** A tab was Green (or was being edited) and required fields are now missing or invalid.
- **Race / O.C.C. change:** Typically cascades conflict flags across Tabs 2–6 (and Tab 5 stub acknowledgment when applicable). Tab 1 completion may remain Green until the user re-validates it.
- **No destructive invalidation:** Changing Race or O.C.C. does **not** wipe skills, attributes, psychic tier, abilities, dice resolutions, or voucher picks. Only downstream **completion markers and snapshots** are cleared so tabs turn Yellow until the user clicks **Continue** again on each affected step.

### Multiple Yellow / Red Tabs — Top-Down Repair

When more than one tab is Yellow or Red, the engine designates the **first** such tab in sequence (1 → 7). The user must resolve that tab first; downstream flagged tabs stay locked or blocked until the chain is repaired in order. Continue and Tab 7 access honor this ordering.

### Alignment (Tab 1 vs Tab 7)

| Location | Rule |
|----------|------|
| **Tab 1** | Alignment is **optional** for **Continue**. A valid Race + O.C.C. pair is sufficient to turn Tab 1 Green. |
| **Tab 7** | Alignment is **required** before **Spawn Character**. The Review tab hosts the alignment picker; spawn blockers list a missing alignment explicitly. Tab 1 may still show “Alignment (optional).” |

---

## The 7-Step Sequence

### Tab 1: Race, O.C.C., & Alignment Selection

- **Engine Action:** Hosts the Tri-Directional Configuration Matrix.
- **Black (N/A) Condition:** Never. This tab is universally required.
- **Completion Criteria (Turns Green):** A valid, non-conflicting Race and O.C.C. pair is actively selected. **Alignment is not required** for Continue. The user clicks **Continue**.
- **Upstream Reactivity:** As the foundational tab, changing Race or O.C.C. after downstream tabs were completed will flag those tabs **Yellow** (snapshot mismatch) or **Red** (invalid local state) without erasing stored picks. The user repairs top-down.

### Tab 2: Attribute Allocation

- **Engine Action:** Hosts the Attribute Pool interface, the **Live Ledger** (side panel), and O.C.C. Variable Bonus Resolution on the same tab.
- **Black (N/A) Condition:** Never.
- **Completion Criteria (Turns Green):**
  - All 8 primary attributes are assigned with valid pool values.
  - All mandatory O.C.C. variable dice groups are rolled and entered.
  - The user clicks **Continue**.

### Tab 3: Psionic Determination

- **Engine Action:** Psychic Gate — explicit tier choice and/or physical percentile test. Major tier stages the 50% related-skill penalty applied in Tab 4.
- **Black (N/A) Condition:** Tab is **Black** when the Psychic Gate is bypassed (genre disallows supernatural abilities, or Race/O.C.C. rules bypass the gate). Black tabs are treated as complete for linear unlock.
- **Completion Criteria (Turns Green):** The player **explicitly** confirms a tier: **None**, **Minor**, or **Major** (or **Master** when the O.C.C. locks psychic class — still requires an explicit tier click, not only a default seed). Rolling **Test Potential** counts as explicit confirmation. Changing Race or O.C.C. resets the “tier chosen” flag; Tab 3 must be re-confirmed via **Continue**.

### Tab 4: Skill Selection

- **Engine Action:** O.C.C. core skills, related skill slots, and core-skill voucher picks per genre whitelist.
- **Black (N/A) Condition:** Never.
- **Completion Criteria (Turns Green):** Mandatory core skills and vouchers satisfied, related slots filled per budget (including psychic slot multipliers), no prerequisite blockers. User clicks **Continue**.

### Tab 5: Character Trait Forges (Sub-Forge Container)

- **Engine Action:** Host for nested Sub-Forges (e.g., Morphus Forge for Nightbane).
- **Black (N/A) Condition:** **Black** when the selected Race line does not use a trait sub-system (e.g., non–Nightbane builds).
- **Implementation (current):** Single-step **stub** — acknowledge placeholder, then **Continue**. Full Sub-Forge tab sets will replace this when spec’d.
- **Completion Criteria (Turns Green):** When applicable, stub step acknowledged and **Continue** clicked. When Black, auto-bypassed for progression.

### Tab 6: Resource-Based Abilities Selection

- **Engine Action:** Spells, psionics, talents, etc., from O.C.C. / genre ability budgets.
- **Black (N/A) Condition:** **Black** when no ability pick budget applies.
- **Completion Criteria (Turns Green):** **Minimum** mandatory picks met (e.g., at least one ability when the budget requires picks). The user may leave **optional** budget slots unfilled and still click **Continue**.
- **Optional picks UX:** Tab turns Green at minimum; the **Continue** tooltip appends guidance when additional slots remain (e.g., optional talent spend). The selection UI should still show remaining budget clearly.

### Tab 7: Review and Spawn (The Terminal Gate)

- **Engine Action:** Summary, **alignment selection (required)**, manual dice resolution for Live Ledger entries, vitality commit, then spawn.
- **Black (N/A) Condition:** Never.
- **Availability Gate:** **Grey (Locked)** until Tabs 1–6 are each **Green** or **Black**. Any upstream **Red** or **Yellow** blocks access.
- **No Continue button** on this tab.
- **Terminal completion:**
  - Resolve all pending dice on the Live Ledger and commit vitality when required.
  - **Select alignment** (required here even if skipped on Tab 1).
  - **Spawn Character** enables only when `assessTab7SpawnBlockers` is empty (alignment, dice, vitality, and other spawn checks).
  - Confirmation modal → [spawn handoff](./character_spawn_handoff.md) → live sheet; creation UI hidden.

---

## Implementation References

| Concern | Code |
|---------|------|
| Tab order, validators, snapshots | `src/lib/forgeNavigation/characterCreationForge.ts` |
| Color states, Continue, top-down repair | `src/lib/forgeNavigation/engine.ts` |
| Race/O.C.C. invalidation (retain data) | `src/lib/creationInvalidate.ts` |
| Shell UI | `src/components/creation/CreationFlowShell.tsx` |
| Tab 7 spawn + alignment | `src/components/creation/CreationReviewFinalize.tsx` |
