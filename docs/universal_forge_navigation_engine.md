# The Universal Forge Navigation Engine: Technical Specification

## Overview

The Universal Forge Navigation Engine is a scalable, state-driven UI/UX framework designed to handle any linear, multi-step data generation process within the Palladium Digital Suite. It strictly enforces sequential completion while granting the user total manual control over navigation and non-destructive editing. The engine supports recursive nesting, allowing complex sub-systems (Sub-Forges) to be seamlessly embedded within parent workflows.

---

## 1. Universal Tab Visibility

The Forge Engine emphasizes complete transparency of the generation pipeline.

- **Permanent Rendering:** Every potential tab within a specific Forge (e.g., all 7 steps of Character Creation) is permanently rendered in the navigation header from the moment the sequence initializes.
- **No Hidden Steps:** The engine is strictly prohibited from conditionally hiding or removing tabs from the layout. If a specific tab is irrelevant to the current build (e.g., a "Magic Spells" tab for a strictly martial character), the tab remains visible in the sequence but its state is altered to explicitly communicate its irrelevance.

---

## 2. The Progression Gate (The "Continue" Button)

The core driver of the Forge Engine is the mandatory manual validation gate at the end of every applicable step. The system will never assume a user is finished with a step, nor will it hijack their viewport.

- **Location & State:** A primary "Continue" button is rendered at the absolute bottom of the active tab's layout. It remains fundamentally disabled (greyed out) until the engine's validation listener confirms all required fields, inputs, and selections for that specific step are complete.
- **Explicit State Change:** Meeting a tab's data requirements does not automatically finalize the tab. The tab's internal state only registers as "Completed" when the user explicitly clicks the activated "Continue" button.
- **Manual Navigation (No Auto-Advance):** Clicking "Continue" updates the engine's state machine (unlocking the subsequent step) but does not alter the viewport. The user must physically click the newly unlocked tab in the header to advance, ensuring they are never unexpectedly pulled away from their current screen.
- **The Reassurance Tooltip:** To eliminate user anxiety regarding permanent lock-ins, the "Continue" button permanently carries a hover-over tooltip stating: *"Clicking continue validates this section but does not lock in your choices. You can return to this tab at any time to make changes."*

---

## 3. Tab State Machine (Visual Color Codes)

The Forge Engine actively monitors the entire data payload in real-time. It communicates the status of every step in the sequence via the navigation header using six strict color-coded states.

| State | Color | System Meaning | Condition / Trigger |
|-------|-------|----------------|---------------------|
| Complete | **Green** | Validated | The user met all data requirements for this step and explicitly clicked the "Continue" button. |
| Active | **Blue** | Current View / Next Step | The tab is unlocked. It is either the next available step the user needs to click into, or it is the step the user is currently viewing and actively editing. |
| Incomplete | **Red** | Destructive Edit | The tab was previously Green. The user navigated backward and removed required data (e.g., cleared a required field) but did not replace it. The step is now invalid. |
| Conflict | **Yellow** | Upstream Dependency | The tab was previously Green. The user navigated backward and changed a foundational piece of data that actively invalidates a choice made in this future tab (e.g., lowered a stat, breaking a prerequisite). |
| Locked | **Grey** | Inaccessible / Pending | The tab is visible in the sequence but cannot be clicked. All preceding applicable tabs must be in a Green (Complete) state. If there is a Red or Yellow tab anywhere upstream, this tab cannot unlock to the Blue state. |
| N/A | **Black** | Bypassed / Irrelevant | The step is part of the Forge but does not apply to the current configuration (e.g., a magic abilities tab for a non-magical build). It cannot be interacted with and is automatically bypassed in the linear progression. |

---

## 4. Upstream Reactivity & Conflict Resolution

Because the Forge Engine is entirely non-destructive, users can navigate backward to any Blue, Green, Red, or Yellow tab at any time. The engine handles these timeline edits through strict dependency tracking.

- **Linear Lockout:** If a previously Green tab falls into a Red or Yellow state, the engine immediately halts forward progression. Any downstream Grey tabs cannot transition to Blue, and the final "Spawn / Finalize" step of the Forge is invalidated. The user cannot complete the generation process until the timeline is repaired.
- **Red State Resolution:** The user must click into the Red tab, satisfy the missing local requirements, and click the "Continue" button again to restore the Green state.
- **Yellow State Resolution:** The user must click into the Yellow tab. The UI will explicitly highlight the invalidated selection. The user must alter their selection to fit the new upstream reality and click the "Continue" button to restore the Green state.
- **Dynamic Black State Shifts:** If a user navigates backward and changes a core foundational choice (e.g., swapping from a mundane O.C.C. to a magic O.C.C.), a previously Black (N/A) tab will dynamically wake up and shift into the standard Grey/Blue progression path.
- **The Terminal Gate:** The final tab in any Forge (the Review/Spawn step) behaves uniquely. It does not feature a "Continue" button. It remains permanently Grey until every preceding applicable tab in the sequence registers as Green.

---

## 5. Sub-Forges (Nested Forge Instances)

The engine supports embedding a complete Forge sequence inside a single tab of a parent Forge (e.g., embedding the "Morphus Creation Forge" entirely within Tab 5 of the "Character Creation Forge").

- **Nested Progression Gate:** When a parent tab contains a Sub-Forge, the parent tab's "Continue" button is strictly bound to the completion state of the Sub-Forge. The parent tab cannot be turned Green until the Sub-Forge has reached its own terminal completion state (i.e., all applicable tabs within the Sub-Forge are Green).
- **Sub-Forge Terminal Resolution:** Unlike a top-level Forge, the terminal step of a Sub-Forge does not possess a "Spawn" or "Lock-in" button. Instead, completing the final step of a Sub-Forge simply satisfies the local data requirement, passing a validated state up to the parent tab and activating the parent tab's "Continue" button.
- **Delayed Lock-In & Backward Navigation:** Completing a Sub-Forge does not permanently lock its data. If a player completes the Morphus Sub-Forge (Tab 5), proceeds to Resource Abilities (Tab 6), they can still click backward into Tab 5. Doing so re-opens the Morphus Sub-Forge. If they alter a choice, the Sub-Forge falls out of its completed state, the parent tab (Tab 5) turns Red or Yellow, and downstream progression is halted until the Sub-Forge is re-validated.
- **Ultimate Authority:** No Sub-Forge is ever truly "locked-in" until the topmost master Forge (the ultimate parent) resolves its final confirmation modal (e.g., the final "Spawn Character" button).
