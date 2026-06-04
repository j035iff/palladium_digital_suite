# Character Creation Forge: Tab Sequence & State Specification

## Overview

The Character Creation flow is an implementation of the [Universal Forge Navigation Engine](./universal_forge_navigation_engine.md). All seven primary tabs are permanently rendered in the header viewport. Progression is strictly linear, requiring manual validation via the **Continue** button to shift a tab from Blue (Active) to Green (Complete) and unlock the next sequential step.

---

## The 7-Step Sequence

### Tab 1: Race, O.C.C., & Alignment Selection

- **Engine Action:** Hosts the Tri-Directional Configuration Matrix.
- **Black (N/A) Condition:** Never. This tab is universally required.
- **Completion Criteria (Turns Green):** A valid, non-conflicting Race and O.C.C. pair is actively selected (Alignment remains optional). The user clicks the **Continue** button.
- **Upstream Reactivity:** As the foundational tab, navigating back and altering the Race/O.C.C. will likely flag downstream skill, attribute, and resource tabs as Yellow (Conflict) or shift them to/from Black (N/A).

### Tab 2: Attribute Allocation

- **Engine Action:** Hosts the Attribute Pool drag-and-drop interface, the **Live Ledger** sub-screen, and the Phase I.2 O.C.C. Variable Bonus Resolution soft-gate.
- **Black (N/A) Condition:** Never.
- **Completion Criteria (Turns Green):**
  - All 8 primary attributes are successfully populated with valid drag-and-dropped numbers.
  - All mandatory O.C.C. variable attribute modifiers (e.g., rolling a +1D4 for P.E.) have been physically rolled and manually inputted.
  - The user clicks the **Continue** button.

### Tab 3: Psionic Determination

- **Engine Action:** The player resolves the Psychic Gate (e.g., rolling for Minor, Major, or None). If Major Psionics is selected, the engine stages the 50% skill penalty for Tab 4.
- **Black (N/A) Condition:** This tab renders as Black and is automatically bypassed if `genreSupernaturalAbilitiesDisallowed` is true, or if the chosen Race/O.C.C. inherently dictates psionic status (automatically granting or denying it).
- **Completion Criteria (Turns Green):** The player selects their psionic tier or resolves the mandatory physical percentile roll, then clicks the **Continue** button.

### Tab 4: Skill Selection

- **Engine Action:** Renders the O.C.C. Core Skill blocks and related skill options based on the active genre whitelist.
- **Black (N/A) Condition:** Never.
- **Completion Criteria (Turns Green):** All mandatory O.C.C. Core skills are acknowledged, all available O.C.C. Related and Secondary skill budgets are fully allocated without prerequisite conflicts, and the user clicks the **Continue** button.

### Tab 5: Character Trait Forges (Sub-Forge Container)

- **Engine Action:** Acts as the host container for complex, nested Sub-Forges (e.g., the Morphus Forge for Nightbane, or Super Abilities for Heroes Unlimited).
- **Black (N/A) Condition:** Renders as Black and is automatically bypassed if the character's selected Race and O.C.C. do not utilize any specialized trait sub-systems.
- **Sub-Forge Integration:** When active, Tab 5 loads its own internal set of tabs.
- **Completion Criteria (Turns Green):** Tab 5's primary **Continue** button remains disabled until every applicable tab within the nested Sub-Forge has reached a Green (Complete) state. Once the Sub-Forge is internally validated, the user clicks the Tab 5 **Continue** button to progress.

### Tab 6: Resource-Based Abilities Selection

- **Engine Action:** Displays secondary affinity panels (Magic Spells, Psionics, Chi, Talents) based on unlocked metrics (P.P.E., I.S.P., etc.).
- **Black (N/A) Condition:** Renders as Black and is automatically bypassed if the character has no resource pools or ability pick budgets (e.g., a purely martial/mundane character).
- **Parallel Unlock Rule:** If multiple sub-categories exist (e.g., a character with both Spells and Psionics), all relevant sub-panels within Tab 6 are unlocked simultaneously.
- **Completion Criteria (Turns Green):** The player exhausts their starting point allocation or mandatory picks across all active sub-panels, and clicks the **Continue** button.

### Tab 7: Review and Spawn (The Terminal Gate)

- **Engine Action:** Renders the Finalize Screen (Summary View).
- **Black (N/A) Condition:** Never.
- **Availability Gate:** This tab remains permanently Grey (Locked) until Tabs 1 through 6 are all registering as either Green (Complete) or Black (N/A). If any tab is Red or Yellow, Tab 7 cannot be accessed.
- **Terminal Completion (No "Continue" Button):**
  - The user must physically roll and input all outstanding dice notations pending on the Live Ledger (e.g., base Hit Points, final S.D.C., P.P.E. variables).
  - Alignment must be selected.
  - Once all inputs are satisfied, the terminal **Spawn Character** button activates.
  - Clicking it triggers the final confirmation modal. Accepting this modal executes Step 4 (Schema Finalization), permanently locking the parent Forge and all nested Sub-Forges, and generating the live character sheet.
