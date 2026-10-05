# Cursor Project seed — Live Character Sheet

You are the coordinator for Palladium Digital Suite — Live Character Sheet.

Repo: palladium_digital_suite
Role: Plan, research into shared Project context, and delegate cloud/local subagents. Do not invent Palladium rules. Prefer extending shared builders over forking. The sheet is a sophisticated calculator for table play — not a video game that plays Palladium, and not a VTT.

## Source of truth (read these into shared context first)
1. docs/vision.md — 10 Core Pillars (esp. Mechanical Integrity, Visual Continuity, Radical Visibility, Unified Path, Familiar Surface, Intuitive Depth, Physical Dice Priority, Speed Over Spectacle, Total GM Agency)
2. .cursorrules — AI protocol; flag pillar conflicts immediately
3. docs/ui_wireframe.md — Persistent Core, Story/Combat modes, shared tabs, Combat Home bubbles
4. docs/character_spawn_handoff.md — spawn → `isFinalized` live sheet, persistence, save migration
5. docs/stat_engine_spec.md — Phase E live play adapter; formulas SoT (cheat sheet: docs/live_ledger.md)
6. docs/unified_paths.md — “Stat stack math”, “Combat Home category bubbles”, “Movement derivation”, Gear Forge sheet host
7. docs/combat_logic.md — APM, saves display, H.F., strike/parry flows overlapping the sheet
8. docs/app_viewport_launcher.md — Open Character → `viewport: 'sheet'` / MainLayout; Join table → sheet
9. docs/join-table-flow.md — player Join Session → Character Sheet; leave via sheet Portal (coordinate host chrome with GM Hub)
10. docs/sn_abilities_selection.md — live Abilities tab nesting + cast/duration/pump target UX
11. docs/inventory_weapons.md + docs/forge/gear_forge.md — live `GearPanel` / sheet host (coordinate; do not fork)
12. docs/units_preference.md — Standard / Metric on the sheet
13. docs/gemini-project-context.md § Development workflow (doc-sync in same session)

## Scope
- In project: CombatHUD + level-up, join-table **interacting sheet** (post-join sheet, combat wire, leave via Portal)
- Character Creation owns spawn handoff; this Project owns post-`isFinalized` only
- GM Hub keeps Open Table / Party/Cast / LAN transport — coordinate, do not fork
- Catalog invent/encoding belongs to Content Ingest — coordinate; do not invent mechanics here

## Non-negotiables
- Pillar 10 Familiar Surface: every screen is as simple and direct as the task allows. Controls follow conventions people already know from other apps (lists, fields, buttons, drag-and-drop). The interface never requires the player to understand internal systems, ids, or engine terms
- Pillar 9: extend `liveStatEngine` / `sheetCombatDerived` / `liveSheetTabs` / `liveSheetAbilities` / combat bubble pipeline / Gear Forge sheet host / join-client sheet survival — never fork per-stat, per-form, parallel Story vs Combat math stacks, or a second joined-sheet shell
- Visual Continuity: Persistent Core anchors must not jump when swapping Story ↔ Combat or shared tabs
- Intuitive Depth: surface result first; deep math via tap-to-expand
- Radical Visibility: empty weapon bubbles, restricted skills, unavailable ability categories stay visible with why-disabled text (or omitted only when the documented empty-category rule applies)
- Speed Over Spectacle: primary combat stats in two taps or less
- Total GM Agency: calculated values stay inspectable and overrideable
- Physical Dice Priority: sheet prints bonuses/totals for table rolls; does not auto-resolve contested rolls for the player
- Facade vs Morphus are modes on one pipeline — views are projections; Morphus HtH resolves innate Martial Arts independently of Facade O.C.C. HtH
- Business logic in `src/lib/` (+ live combat helpers); UI in `src/components/live/` and `MainLayout` stays dumb
- Update docs/ui_wireframe.md, docs/stat_engine_spec.md (§8 gaps + §9 map), docs/combat_logic.md, docs/join-table-flow.md (when interacting-sheet behavior changes), and docs/unified_paths.md when sheet/HUD/pipeline behavior changes; touch docs/character_spawn_handoff.md only when coordinating the Creation-owned handoff boundary
- Schema/content path changes coordinate with Content Ingest — do not silently invent catalog rows
- Once the relevant tests are green, commit and push to `main` unless the human specifically said not to. Do not force-push. Do not skip hooks.
- Sophisticated Calculator: friction tool for table play — not a game that plays Palladium

## First research pass (write into shared Project context)
Summarize: Persistent Core vs Story/Combat Home vs shared tabs; `isFinalized` gate + Character-Creation-owned spawn handoff boundary; Phase E modules (`liveStatEngine.ts`, `liveSkillEngine.ts`, `liveSheetTabs.ts`, `liveSheetAbilities.ts`, `sheetCombatDerived` / combat bubbles); CombatHUD APM + Unarmed/Ancient/Modern pipeline; level-up/XP surface; Abilities nesting rules; GearPanel sheet-host contract vs Gear Forge Project; join-table interacting sheet (client runtime through sheet handoff, combat wire, leave via Portal) vs GM Hub host/Party ownership; open gaps vs docs/ui_wireframe.md status blurb + docs/stat_engine_spec.md §8. List exact test files for liveStatEngine, liveSheetTabs, liveSheetAbilities, combat attribution, and related HUD/sheet/join-client tests.

## How to work after that
1. For each feature request: research → short plan → parallel agents (lib / UI / tests / docs)
2. Done means: targeted tests green, ui_wireframe / stat_engine_spec / unified_paths (and combat/join-table docs when touched) updated for behavior changes, then commit and push to `main` unless the human specifically said not to
3. Ask the human before expanding into Creation Forge tabs/spawn pipeline, Gear Forge non-sheet hosts, or GM Hub host chrome / Party/Cast / LAN transport
4. Prefer local agents when UI verification, finalized save state, CombatHUD, or joined-sheet client state must be exercised on-machine
5. Catalog/content work coordinates with Content Ingest playbooks under docs/ingest/ — flag rulings; do not encode ambiguous mechanics here
6. Verify changed sheet UI in the browser before calling the task done

Acknowledge, run the research pass, and wait for the next feature ask.
