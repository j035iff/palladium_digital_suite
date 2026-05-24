Character Creation & Attribute Forge: Technical Specification

This document defines the non-linear character creation flow for the Palladium Digital Suite. It establishes the "Persistent Mirror" UI and the flexible "Attribute Forge" designed to accommodate both standard rules and custom GM house rules.


🗺️ Step 1: The Gate Check (Launch Platform)
Upon booting the application, the system renders the top-level Viewport Dashboard (image_82889b.jpg). The user must resolve one of two initialization vectors:

Vector A: [Open Character]

Reads localized repository index.

Renders a drop-down list displaying files mapped by Character Name — [creationGenreId].

Selecting a file pipes the record through the runtime conversion middleware using the application's active environment context.

Vector B: [Create Character]

Renders the master setting registry.

Selecting a genre (e.g., Nightbane, Rifts) registers the absolute hostGenreId parameter, sets the immutable creationGenreId, and spins up the step-by-step creation state machine.

📚 Step 2: Class Pooling & Metadata Filtering
The wizard initializes the occupational select screen. The engine executes an immediate back-end aggregation pass:

[ Individual Book JSONs ] ──► [ Scanned via Genre Manifest ] ──► [ Flat Aggregated Memory Pool ]
🔄 The Pooling Engine
The system reads all independent book JSON data files associated with the active genre, completely stripping away file boundaries on the front-end. O.C.C.s and R.C.C.s are combined into a singular, flat, alphabetical array available for selection.

🏷️ Dynamic Metadata Tag Bubbling & Multi-Tag Support
To navigate the combined pool of classes, the interface introduces an automated sorting system driven by arbitrary, dynamic string arrays:

Multi-Tag Array Support: O.C.C. payloads can carry multiple sorting vectors simultaneously via a root-level property: "tags": ["magic", "psionic"].

The Hybrid Bubbling Engine: When a tag filter card is selected (e.g., clicking the "magic" pill), the application splits the active menu layout into two prioritized view tiers:

Tier 1 (Active Match): Every O.C.C. that contains the selected token in its "tags" array is bubbled to the absolute top of the viewport list, sorted alphabetically, and rendered with standard interactive visibility states.

Tier 2 (Contextual Lockout): Any O.C.C. lacking the targeted tag remains visible but drops below Tier 1. It is alphabetized and rendered with a high-contrast dark grey-out class, disabling click selection and injecting a mandatory tooltip: "Not a <active_tag_name> OCC".

🎲 Step 3: Core Character Assembly Steps
Once a class archetype is selected, the wizard guides the user through the structural sequential assignment phases, applying absolute genre exclusions to drop-downs on the fly:

Phase I: Attribute Initialization & Modifiers
Generates the 8 baseline primary attributes using random dice roll state machines.

Applies localized racial/specialization modifications immediately based on the selected archetype profile.

Phase II: The Scoped Skill Choice Matrices
Renders the O.C.C. Core Skill blocks, automatically calculated with native bonuses.

Pulls category limits from the master universal skills array.

Exclusion Rule: Drop-downs completely omit skill families or individual keys that do not carry the active hostGenreId within their whitelist metadata array.

Phase III: Mystic & Psionic Allocation
If the chosen O.C.C. features tags matching magical or psionic properties, the wizard unlocks the secondary affinity configuration panels.

Powers are loaded directly from the universal libraries, evaluated and displayed strictly by their genre-specific classifications (e.g., displaying Bio-Manipulation inside the Physical panel for Nightbane, but sorting it to the Super-Psionic panel if building for Rifts).

💾 Step 4: Schema Finalization & Sheet State Hand-off
The workspace compiles the gathered properties into a clean state object. The engine executes a final structural check:

It validates that the object complies with the core runtime template.

It strips out all active UI view filters or sorting indices.

It stamps the data configuration, serializes the file into raw JSON storage, and initializes the interactive live character sheet viewport.