# Palladium Digital Suite: Character Creation Technical Specification

This document defines the character creation flow for the Palladium Digital Suite: launch vectors, the tri-directional Race / O.C.C. / Alignment matrix, phased assembly (attributes, psionics, skills, Morphus), final review, and sheet hand-off.

---

## Step 1: The Gate Check (Launch Platform)

Upon booting the application, the system renders the top-level Viewport Dashboard. The user must resolve one of two initialization vectors:

### Vector A: [Open Character]

- Reads the localized repository index.
- Renders a drop-down list displaying files mapped by **Character Name — [creationGenreId]**.
- Selecting a file pipes the record through the runtime conversion middleware using the application's active environment context.

### Vector B: [Create Character]

- Renders the master setting registry.
- Selecting a genre (e.g., Nightbane, Rifts) registers the absolute **`hostGenreId`** parameter, sets the immutable **`creationGenreId`**, and spins up the step-by-step creation state machine.
- Each genre row in the manifest may set **`genreSupernaturalAbilitiesDisallowed: true`** for mundane-only campaigns. When true, creation omits the Psychic Gate, filters out supernatural O.C.C.s, and disables secondary ability picks entirely.

---

## Step 2: Race, Class, & Alignment Pooling (The Tri-Directional Matrix)

### The Configurator Layout (Persistent Attribute Header)

- The interface permanently displays the **8 baseline primary attributes** at the top of the viewport.
- **Dynamic Base-Roll Scaling:** The attribute boxes dynamically update to display the exact dice notation matching the currently selected Race (e.g., showing 3D6 for Human, but updating to an Elf or Orc's specific base dice notations on the fly).
- **High-Contrast O.C.C. Requisites:** If an evaluated O.C.C. carries a minimum attribute threshold, the UI overlay projects a high-contrast indicator (e.g., **12+**) directly above the corresponding attribute box.
- **O.C.C. Bonus Indicators:** If an O.C.C. grants an automatic modifier to an attribute, the engine renders a green indicator directly below the attribute frame. This indicator accommodates both flat integer bonuses (e.g., **+2**) and variable dice roll requirements (e.g., **+1D4**).

### The Tri-Directional Configuration Matrix

The core initialization state machine features three primary control drops: **Race**, **O.C.C.**, and **Alignment**. Selecting an option in any single drop establishes a constraint chain that filters the other two in real time:

- **Race Adjustments:** Filters both valid O.C.C.s and any restrictive species alignments.
- **O.C.C. Adjustments:** Filters available Races and restricts moral alignments matching the profession's code.
- **Alignment Adjustments:** Filters out any Races or O.C.C.s whose strict genetic or operational codes bar that specific moral alignment.

### Three-Tier Prioritized Rendering Engine

Cross-requirements do **not** hide unavailable options. They remain visible in their respective dropdown viewports but are re-sorted and color-coded into three distinct architectural tiers:

| Tier | Name | Behavior |
|------|------|----------|
| **1** | Active Match | Selections that match all active tag filters and satisfy the active tri-directional cross-requisites. Bubble to the top, sorted alphabetically, with standard interactive states. |
| **2** | Tri-Directional Conflict Lockout | Items explicitly invalid due to cross-requisite conflicts. Rendered below Tier 1 in high-contrast disabled red, with a hover tooltip identifying the conflict (e.g., "Requires Nightbane Race" or "O.C.C. Prohibits Diabolic Alignment"). |
| **3** | Tag Mismatch Contextual Lockout | Items that lack a manually targeted category tag filter (e.g., clicking a "magic" pill). Drop to the bottom, rendered in standard disabled dark grey, with a generic tag tooltip (e.g., "Not a magic OCC"). |

### Progression Gate (The "Determine Attributes" Transition)

- To progress past the configurator matrix, the engine requires a **valid, non-conflicting Race and O.C.C. combination**.
- **Alignment selection is strictly optional** at this stage; the engine will not block progression if it is left unselected.
- Once a valid pair is chosen, the user clicks **Determine Attributes**. This action is purely navigational; it does not lock in the selection schema, allowing the player to return and alter these core choices at any time.

---

## Step 3: Core Character Assembly Steps

### Phase I: Attribute Input & Allocation (The Pool System)

- **Physical Dice Priority (Zero Auto-Rolls):** The engine does not generate any random numerical values. The application acts strictly as a ledger, expecting the player to physically roll their dice.
- **The Attribute Pool:** The interface generates a "pool" containing **8 empty input fields**. The player types their final rolled values into these fields. The engine assumes the player understands exceptional roll rules (16+) and inputs the final calculated sum.
- **Dice Notation Grouping:** For races requiring different dice notations for specific attributes, the engine automatically segments and groups the input pool by base dice rolls (e.g., an Elf's pool is divided into 2D6, 3D6, 4D6, and 5D6 groups).
- **Drag-and-Drop Allocation:** Once the pool is populated, the UI unlocks drag-and-drop functionality to slot the numbers into the 8 primary attributes.
- **Allocation Validation & O.C.C. Enforcement:** The interface actively prevents the user from dropping a rolled value into a slot if it violates a dice grouping constraint or is lower than the required minimum for their chosen O.C.C. Invalid drops are bounced back to the pool.

#### The Persistent "Live Ledger" Sub-Screen

Alongside attribute allocation, the engine launches a persistent, read-only sub-screen that continuously updates based on the player's real-time actions.

- **Exceptional Attribute Bonuses:** Instantly calculates and displays core rulebook bonuses when high numbers (16+) are slotted (e.g., Save vs. Psionic Attack for high M.E., damage bonuses for high P.S.).
- **Combat & Derived Stats:** Aggregates and displays derived metrics like Strike, Parry, Dodge, Attacks per Melee, Base Hit Points, S.D.C., P.P.E., I.S.P., etc.
- **Pending Dice Modifier Display:** If an O.C.C., race, or skill selection grants a bonus requiring a dice roll rather than a flat integer, the ledger renders that dice notation adjacent to the affected stat (e.g., **14 +4D4** for Spd).
- **The Final Rolling Checklist:** These pending dice notations remain visibly staged on the ledger throughout creation, acting as a final checklist for physical dice rolls required before clicking the **Spawn Character** lock-in button.

### Phase I.2: O.C.C. Variable Bonus Resolution (The Soft-Gate)

- **Downstream Dependency Check:** Because final attribute scores can heavily dictate downstream modifiers, the engine enforces a mandatory soft-gate immediately after base attribute allocation and strictly **before Phase I.5 (Psionic Determination)**.
- **Manual Resolution:** If the selected O.C.C. applies a variable dice roll modifier to any primary attribute (e.g., +1D4 to P.E.), the player must physically roll that die and manually enter the result into a corresponding resolution field.
- **Strict Input Validation:** The UI enforces strict mathematical boundaries on these inputs to ensure legitimacy. For example, if the required roll is 1D4, the engine will reject the input and block progression if the entered value is anything other than 1, 2, 3, or 4.
- **Non-Destructive State:** While mandatory for progressing to the skill and psionic phases, this entry remains a soft-gate. It does not permanently lock the character sheet, and the player retains full freedom to navigate backward to alter core choices.

### Phase I.5: The Psychic Gate (Psionic Determination)

- Because psionic potential structurally alters skill progression, this gate must be resolved **before** O.C.C. skill matrices are built.
- Unless **`genreSupernaturalAbilitiesDisallowed`** is true, or the selected race/O.C.C. automatically grants or denies psionics, the player determines their psionic potential (e.g., Minor, Major, or None).
- **Skill Penalty Staging:** If the character is determined to be a **Major Psionic**, the engine immediately stages a modifier that reduces all O.C.C. skill bonuses by half (rounding down fractions) and halves the available budget for O.C.C. Related skills.

### Phase II: The Scoped Skill Choice Matrices

- Renders the O.C.C. Core Skill blocks and related skill options, automatically applying any staged penalties (such as the Major Psionic halving penalty) and calculating native bonuses.
- Pulls category limits from the master universal skills array.
- **Exclusion Rule:** Drop-downs completely omit skill families or individual keys that do not carry the active **`hostGenreId`** within their whitelist metadata array.

### Phase II.5: Morphus Generation (Nightbane Exclusive)

- **Conditional Rendering:** This phase remains completely hidden unless the player has explicitly selected the **Nightbane** race during Step 2.
- **The Morphus Forge:** If the Nightbane race is active, the engine intercepts the flow here to allow the player to construct their supernatural Morphus form.
- **External Documentation:** The specific UI flow, table resolution, and data structures for Morphus Generation are handled by an independent subsystem and detailed in a separate technical specification document.

### Phase III: Mystic & Psionic Allocation

- Skipped when **`genreSupernaturalAbilitiesDisallowed`** is true.
- If the chosen O.C.C. grants supernatural pick budgets or the character unlocked abilities in Phase I.5, the wizard unlocks secondary affinity configuration panels. Powers are loaded, evaluated, and displayed strictly by their genre-specific classifications.

### Phase IV: Final Review & "Spawn Character"

- **The "Review and Finalize" Gate:** Throughout the assembly phases, a **Review and Finalize** button is present but remains disabled (greyed out). The engine actively monitors the character's state and only enables this button once every mandatory selection, allocation, and gate has been completed.
- **The Finalize Screen (Summary View):** Clicking the button transitions the user to a comprehensive character summary viewport. Like previous transitions, this is non-destructive; it does not lock the character in, and the player retains full freedom to navigate back to earlier phases to adjust their build.
- **Manual Dice Resolution:** This screen forces the resolution of the pending dice notations tracked on the Live Ledger. The UI renders input fields for all outstanding variables. The player must physically roll and manually input the results for:
  - Universally required elements, such as the additional **1D6** for base Hit Points.
  - Any specific attribute or stat modifier that required a dice roll (e.g., bonus S.D.C., P.P.E., I.S.P., variable skill bonuses, etc.).
- **The "Spawn Character" Lock-In:** At the absolute bottom of the Finalize screen sits the **Spawn Character** button. This button is strictly greyed out until every required manual dice roll has been entered into the resolution fields.
- **Confirmation Modal:** When the active Spawn Character button is clicked, the engine intercepts the command and generates a warning modal overlay.
  - The modal explicitly warns the user that confirming will **lock-in** the character's framework and no further creation-level changes can be made.
  - It presents two options: **Go back** (dismisses the modal and returns the user to the Finalize screen) or **Spawn Character** (triggers Step 4: Schema Finalization and transitions to the live character sheet).

---

## Step 4: Schema Finalization & Sheet State Hand-off

- The workspace compiles the gathered properties into a clean state object, ensuring it complies with the core runtime template.
- On lock-in, the engine projects creation skill picks onto each form's **`skills`** array (resolved Master Equation percentages, prerequisite restrictions, O.C.C. core/related bonuses), applies staged physical-skill attribute and S.D.C. modifiers, and sets **`isFinalized`**.
- It strips out all active UI view filters or sorting indices.
- Finally, it stamps the data configuration, serializes the file into raw JSON storage, and initializes the interactive live character sheet viewport.

---

## Appendix: Catalog & Data References

These paths support the specification above; they are not additional creation steps.

| Concern | Location |
|---------|----------|
| Genre manifest (`creationGenreId`, `genreSupernaturalAbilitiesDisallowed`) | `src/data/genres.ts` — `GENRE_MANIFEST` |
| Player-selectable races | `src/data/content/races/player.json` (`raceAudience: "player"`) |
| NPC / monster races (excluded from creation UI) | `src/data/content/races/npc.json` |
| GM-approval races (future UX) | `src/data/content/races/gm_approval.json` |
| O.C.C. pool (per-book JSON, genre-scanned) | `src/data/content/occs/*.json` |
| Universal skill catalog | `src/data/content/palladiumSkills.json` |
| Morphus subsystem | Separate spec; tables under `src/data/content/morphus/` |

**Psychic Gate bypass (explicit only):** The gate is omitted when the genre forbids supernatural play, when the race sets `psionics.capabilityType` to `none` or `innate`, or when the O.C.C. sets `progression.psychicGateBypassed`. Standard humans in supernatural-allowed genres still receive the gate for optional minor psionics.
