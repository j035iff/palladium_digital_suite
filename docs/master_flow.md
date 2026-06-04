# Master Flow — Runtime Pipeline

**Gate Check (launcher):** [app_viewport_launcher.md](./app_viewport_launcher.md) · **Spawn commit:** [character_spawn_handoff.md](./character_spawn_handoff.md) · **Doc map:** [character_creation.md](./character_creation.md)

---

## High-Level Architecture Flow Diagram

```
[ App Launch Viewport ]
       │
       ├───► [ Open Character ] ──► Read Saved JSON ──┐
       │                                              ▼
       └───► [ Create Character ] ──► Select Genre ───┴─► [ Dynamic Host Runtime Environment ]
                                                                      │
                                                        Pipes payload through centralized
                                                          Runtime Conversion Middleware
                                                                      │
                                                                      ▼
                                                       [ Live Character Context State ]
                                                                      │
                                                                      ▼
                                                        [ Reactive UI Presentation Sheets ]
```

---

## 1. The Core Data Pipeline (Runtime Engine)

The engine prevents data contamination by implementing a strict unidirectional runtime pipeline. The schema translation layers execute sequentially whenever a character file is loaded into the viewport.Step A: Raw File IngestionThe system reads the static, un-mutated JSON save payload directly from disk or local storage.Rule: The save file reflects only the data and rules layout present at the time of its initialization (creationGenreId). It contains zero host-specific properties or transformed metrics.Step B: Viewport State ResolutionThe engine captures the target ecosystem parameter via the viewport context (hostGenreId). This is explicitly set by either:The launcher splash card drop-down choices.An active, connected Game Master network session payload.Step C: Centralized Middleware Transformation (genreTransformer.ts)The payload is parsed through a pure execution loop:$$\text{genreTransformer}(\text{rawCharacterJSON}, \text{hostGenreId}) \longrightarrow \text{derivedActiveState}$$The transformer loops through the nested character asset nodes, cross-referencing global lookups:The Structural Conversion Pass: If creationGenreId !== hostGenreId, the engine automatically intercepts core pools—mapping properties like S.D.C. to M.D.C. thresholds or calculating environmental combat shifts based on conversion guide rules.The Asset Availability Pass: The engine checks every individual piece of equipment, trait, or skill against the host genre's whitelist map. Items flagged as illegal are injected with an absolute state flag: isHostGenreLocked: true.Step D: State Emitter to UIThe resulting derivedActiveState is emitted into the global application context sheet. UI presentation cards treat this layout as read-only for display purposes.

💾 2. The Data Mutation Loop (Handling Edits & Saves)When a player updates their character sheet during live play (e.g., spending Experience Points, changing a stat baseline, tracking inventory weight), the mutation cycles back safely:User Action: The player clicks an editor element on the sheet.Reverse Serialization: The mutation handler intercepts the change and strips out all transient, runtime-derived host modifications.Immutable Base Override: The clean, raw update is written explicitly to the underlying original format parameters in the base payload.Instant Re-evaluation: The file automatically saves to disk in its native configuration, and immediately pushes back through Step C to refresh the active UI calculations seamlessly.