# Character Creation Forge: Tab Sequence & State Specification

## Overview

The Character Creation flow is an implementation of the [Universal Forge Navigation Engine](../universal_forge_navigation_engine.md). It begins **after** [Create Character](../app_viewport_launcher.md) — not at app launch. All primary tabs are permanently rendered at the top of the creation viewport. Progression is strictly linear: when a tab’s requirements are met, its pill label becomes **Continue**; clicking it turns the tab Green and opens the next available step.

**No global header during creation.** The sticky app header is **hidden while creating a character**. The creation viewport uses a **three-column layout** on wide screens (default **15% / 65% / 20%**): **left** = per-tab “selected” summary panels (package details, selected skills, selected powers, selected traits), **center** = interactive forge for the active tab, **right** = **Live Ledger** tray (**20%** when open). The left/center border is **draggable** (left column **0%–40%**). The Live Ledger is **not** drag-resized — it opens by default and collapses to a thin edge tray via a toggle button; collapsing gives its width to the center work column. Left summary panels use slightly smaller type and scroll **vertically only** (no horizontal scrollbar).

**Compact forge chrome (vertical space):** The creation frame defaults to a short stack so the center column owns the viewport:

1. **Identity summary** — one-line header (name · race · O.C.C.) with **Expand** / **Minimize** and **Session** on the same row. The character name uses prominent summary typography (~25% larger than race/O.C.C.). Expanded mode is a single layer: Alignment above Sex/Eyes/Height/Hair/Weight. Race and O.C.C. stay on the summary row. New characters **default to Human** (`race_human`) until the player changes race on Tab 1.
2. **Tab row** — primary tab pills on the left (**single row**, horizontal overflow scroll when needed); tab-local dev actions on the right. When the viewing tab is ready to advance, that pill’s label becomes **Continue** (click validates, turns green, and opens the next step). The active pill auto-scrolls into view.
3. **Contextual banner** — `ForgeTabPageHeader` only when needed: Continue/spawn requirement checkboxes (no “To continue” heading), Tab 7 ability lanes, or N/A state. As each requirement is met its checkbox fills; when all are satisfied the banner collapses **into the Continue tab bubble** (measured target). That bubble uses the **yellow (conflict) tab treatment** and pulses. The duplicate tab title is hidden (the active pill already shows it).

**Short viewport (`max-height: 820px`):** Auto-collapses identity to the summary line, tightens identity/tab-row padding, and uses slightly smaller summary typography so the choice column keeps usable height. Expand remains available for identity edits.

Session actions (**Reset**, **Save for Later**, **Leave without Saving**) open from the **Session** button on the identity summary row. The global header (with **Become Morphus**) returns only on the finalized live sheet. Form switching during creation remains available via the Live Ledger's Facade/Morphus toggle once unlocked.

**Continue on the tab pill** — when requirements are met, the viewing pill reads **Continue**; clicking it marks the tab Green, restores the normal label, and opens the next available tab. **Continue never locks data** — only the Tab 8 spawn confirmation modal runs [spawn handoff](../character_spawn_handoff.md).

**Nightbane Morphus:** Tab 6 hosts the nested [Morphus Sub-Forge](morphus_creation.md). Facade dice are finalized on Tab 5; all Morphus trait generation and Morphus vitality dice live on Tab 6 only.

---

## Cross-Cutting Rules

### Yellow (Conflict) vs Red (Incomplete)

- **Yellow:** A tab was Green, upstream data changed, and this tab’s stored snapshot no longer matches the live payload (even if current fields still pass validation). Player data is **not** auto-cleared; the tab shows what must be re-confirmed.
- **Red:** A tab was Green (or was being edited) and required fields are now missing or invalid.
- **Race / O.C.C. change:** Typically cascades conflict flags across Tabs 2–7 (and Tab 6 Morphus state when applicable). Tab 1 completion may remain Green until the user re-validates it.
- **No destructive invalidation:** Changing Race or O.C.C. does **not** wipe skills, attributes, psychic tier, abilities, dice resolutions, or voucher picks. Only downstream **completion markers and snapshots** are cleared so tabs turn Yellow until the user clicks **Continue** again on each affected step.

### Multiple Yellow / Red Tabs — Top-Down Repair

When more than one tab is Yellow or Red, the engine designates the **first** such tab in sequence (1 → 8). The user must resolve that tab first; downstream flagged tabs stay locked or blocked until the chain is repaired in order. Continue and Tab 8 access honor this ordering.

### Alignment (Tab 1 vs Tab 8)

| Location | Rule |
|----------|------|
| **Tab 1** | Alignment is **optional** for **Continue**. A valid Race + O.C.C. pair is sufficient to turn Tab 1 Green. |
| **Tab 8** | Alignment is **required** before **Spawn Character**. The Review tab hosts the alignment picker; spawn blockers list a missing alignment explicitly. Tab 1 may still show “Alignment (optional).” |

### Pending Dice (Tabs 5, 6, and 8)

| Location | Rule |
|----------|------|
| **Tab 5 — Roll Pending** | All Facade / single-form physical dice (attributes, H.P., S.D.C., P.P.E., I.S.P.). Nightbane: **Facade only** — no Morphus blocks. |
| **Tab 6 — Traits** | Nightbane only: Morphus vitality dice and the full [Morphus Sub-Forge](morphus_creation.md). Requires Tab 5 complete. |
| **Tab 8 — Review & Spawn** | **Summary only** — no dice entry. Spawn blocked until Tabs 5 and 6 (when applicable) have finalized all pending rolls. |

---

## The Tab Sequence

> **Tab IDs vs. labels.** The first tab is labeled **Race and OCC** in the UI but keeps the historical ID `tab1_configurator`. Continue on that tab requires only a valid **Race + O.C.C.** pair; identity profile fields (name, sex, age, etc.) live in the global identity chrome (collapsed by default) and are optional for Continue / enforced at spawn.

### Tab 1: Race and OCC (`tab1_configurator`)

- **Default race:** **Human** (`race_human`) for the active creation genre. O.C.C. remains unset until the player picks one.
- **Engine Action:** Tri-Directional Configuration Matrix (Race / O.C.C.). Global identity chrome (`IdentityHeader` `variant="creation"`, collapsed by default) sits above the tab row. **Package details** (racial/O.C.C. grants summary) render in the **left** summary column; matrix pickers in the **center**.
- **Black (N/A) Condition:** Never.
- **Completion Criteria (Turns Green):** A valid, non-conflicting Race and O.C.C. pair is actively selected. **Identity profile fields and alignment are not required** for Continue. The user clicks the **Continue** pill.
- **Upstream Reactivity:** Changing Race or O.C.C. after downstream tabs were completed flags those tabs **Yellow** or **Red** without erasing stored picks. The user repairs top-down.

### Tab 2: Attribute Allocation

- **Engine Action:** Hosts the Attribute Pool interface and O.C.C. Variable Bonus Resolution. **Live Ledger** is in the **right** column (creation shell), not duplicated per tab.
- **Black (N/A) Condition:** Never.
- **Completion Criteria (Turns Green):**
  - All 8 primary attributes are assigned with valid pool values.
  - All mandatory O.C.C. variable dice groups are rolled and entered.
  - The user clicks **Continue**.

### Tab 3: Psionic Determination

- **Engine Action:** Psychic Gate — explicit tier choice. Major tier stages the 50% related-skill penalty applied in Tab 4.
- **Black (N/A) Condition:** Tab is **Black** when the Psychic Gate is bypassed (genre disallows supernatural abilities, or Race/O.C.C. rules bypass the gate). Black tabs are treated as complete for linear unlock.
- **Completion Criteria (Turns Green):** The player **explicitly** confirms a tier: **None**, **Minor**, or **Major** (or **Master** when the O.C.C. locks psychic class — still requires an explicit tier click, not only a default seed). Changing Race or O.C.C. resets the “tier chosen” flag; Tab 3 must be re-confirmed via **Continue**.

### Tab 4: Skill Selection

- **Engine Action:** O.C.C. core skills, related skill slots, and core-skill voucher picks per genre whitelist.
- **Black (N/A) Condition:** Never.
- **Completion Criteria (Turns Green):** Mandatory core skills and vouchers satisfied, related slots filled per budget (including psychic slot multipliers), no prerequisite blockers. User clicks **Continue**.

### Tab 5: Roll Pending

- **Engine Action:** Manual entry of all pending physical dice for the build. Live Ledger updates as values are typed (Pillar 5 — physical dice first). **Continue** writes resolved Facade / single-form vitals and attribute bonuses to the sheet.
- **Black (N/A) Condition:** Never (may show “no pending dice” when a build has none).
- **Nightbane gate:** Only **Facade** dice blocks appear here. Morphus H.P./S.D.C. and trait tables are **not** on this tab.
- **Completion Criteria (Turns Green):** Every pending dice field in scope is filled with a valid result; user clicks **Continue**.

### Tab 6: Character Trait Forges (Sub-Forge Container)

- **Engine Action:** Host for nested Sub-Forges. **Nightbane** hosts the [Morphus Creation Engine](morphus_creation.md) — a 3-step Sub-Forge with progressive slot resolution and Morphus Live Ledger compilation. **Guided / basic flow** is the active implementation focus; **Expert Mode** (dual-panel index + trait cart) is spec-only — no pass yet.
- **Black (N/A) Condition:** **Black** when the selected Race line does not use a trait sub-system (e.g., non–Nightbane builds).
- **Nightbane completion:**
  - Tab 5 (Roll Pending) must be Green first.
  - Morphus vitality dice entered on this tab.
  - Sub-Forge **Finalize Morphus** passes Complete state up to turn Tab 6 Green on the master forge.
- **Implementation (current):** [Morphus Sub-Forge](morphus_creation.md) in `MorphusForge.tsx` — crossroads, trait forge, slot resolution, review dice. Guided/basic UX still in active development; Sub-Forge Expert Mode not started. (`MorphusForgeStub.tsx` is a deprecated re-export alias.)

### Tab 7: Resource-Based Abilities Selection

- **Engine Action:** Spells, psionics, talents, etc., from O.C.C. / genre ability budgets.
- **Black (N/A) Condition:** **Black** when no ability pick budget applies.
- **Completion Criteria (Turns Green):** **Full** mandatory budget satisfied (all required spell, psionic, and talent slots filled per effective budget, including Psychic Gate pool rules). User clicks **Continue**.
- **Optional picks UX:** When minimum mandatory picks are met but optional budget remains, the **Continue** tooltip may note optional spend; the selection UI shows remaining budget clearly.

### Tab 8: Review and Spawn (The Terminal Gate)

- **Engine Action:** Build **summary only**, **alignment selection (required)**, then spawn. No dice entry on this tab.
- **Black (N/A) Condition:** Never.
- **Availability Gate:** **Grey (Locked)** until Tabs 1–7 are each **Green** or **Black**. Any upstream **Red** or **Yellow** blocks access. Pending dice must already be finalized on Tabs 5 and 6.
- **No Continue pill** on this tab.
- **Terminal completion:**
  - **Select alignment** (required here even if skipped on Tab 1).
  - **Spawn Character** enables only when `assessTab8SpawnBlockers` is empty (alignment, dice-finalized flags, and other spawn checks).
  - Confirmation modal → [spawn handoff](../character_spawn_handoff.md) → live sheet; creation UI hidden.

---

## Implementation References

| Concern | Code |
|---------|------|
| Tab order, validators, snapshots | `src/lib/forgeNavigation/characterCreationForge.ts` |
| Color states, Continue, top-down repair | `src/lib/forgeNavigation/engine.ts` |
| Tab 0 Identity form + Session popover + shell layout | `src/components/layout/IdentityHeader.tsx`, `src/components/creation/CreationFlowShell.tsx`, `src/components/creation/ConfiguratorPanel.tsx`, `src/components/forge/ForgeTabPageHeader.tsx` |
| Race/O.C.C. invalidation (retain data) | `src/lib/creationInvalidate.ts` |
| Pending dice scope (`primary` / `morphus`) | `src/lib/spawnDiceBlocks.ts`, `src/lib/pendingDiceLedger.ts` |
| Shell UI | `src/components/creation/CreationFlowShell.tsx` |
| Tab 5 Roll Pending | `src/components/creation/CreationFinalizeDice.tsx` |
| Tab 6 Traits / Morphus Sub-Forge | `src/components/creation/MorphusForge.tsx` |
| Tab 8 spawn + alignment | `src/components/creation/CreationReviewFinalize.tsx` |
| Morphus Sub-Forge spec | [morphus_creation.md](morphus_creation.md) |
