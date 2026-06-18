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

The engine prevents data contamination via a strict unidirectional pipeline. Translation layers run whenever a character file loads into the viewport.

### Step A — Raw file ingestion

The system reads the static, un-mutated JSON save payload from disk or local storage.

**Rule:** The save reflects only data and rules layout at initialization (`creationGenreId`). It contains **no** host-specific properties or transformed metrics.

### Step B — Viewport state resolution

The engine captures the target ecosystem via viewport context (`hostGenreId`), set by:

- Launcher genre / host choices, or
- A future connected GM session payload.

### Step C — Centralized middleware (`genreTransformer.ts`)

$$\text{genreTransformer}(\text{rawCharacterJSON}, \text{hostGenreId}) \longrightarrow \text{derivedActiveState}$$

The transformer walks nested character nodes and cross-references global lookups:

- **Structural conversion** — When `creationGenreId !== hostGenreId`, intercept core pools (e.g. S.D.C. ↔ M.D.C. thresholds, environmental combat shifts per conversion rules).
- **Asset availability** — Equipment, traits, and skills are checked against the host genre whitelist. Illegal items get `isHostGenreLocked: true`.

### Step D — State emitter to UI

`derivedActiveState` is emitted into `CharacterContext`. Presentation components treat derived host transforms as **read-only** for display; mutations write back to native save layout (§2).

---

## 2. The Data Mutation Loop (Edits & Saves)

When the player edits the sheet during live play (XP, stats, inventory, etc.):

1. **User action** — Editor interaction on the sheet.
2. **Reverse serialization** — Strip transient, runtime-derived host modifications.
3. **Immutable base override** — Write the clean update to native `creationGenreId` fields in the root payload.
4. **Re-evaluation** — Optionally persist via **Save**, then re-run Step C to refresh UI.

See [character_spawn_handoff.md](./character_spawn_handoff.md) for spawn-time persistence rules.
