# Psychic Gate — Logic Specification

This document defines psionic tier determination during character creation and the resulting impacts on skills and energy pools.

**Forge placement:** [Character Creation Forge](./forge/character_creation.md) **Tab 3** (after Race/O.C.C. on Tab 1 and attributes on Tab 2). Power picks happen on **Tab 7 — Abilities**.

**Related:** `src/lib/psychicGate.ts`, `src/components/creation/PsychicGate.tsx`, `docs/stat_engine_spec.md` (I.S.P. vitals).

---

## 1. Tier determination

The Psychic Gate uses three entry paths:

| Trigger | Rule |
|---------|------|
| **Psychic-class O.C.C.** | Tier locked to **Master** (e.g. Force Master). Player still must explicitly confirm tier on Tab 3. |
| **Bypass (Tab 3 Black)** | Gate skipped when genre forbids supernatural play, race `psionics.capabilityType` is `none` or `innate`, or O.C.C. sets `psychicGateBypassed`. Nightbane R.C.C. (`capabilityType: none`) is bypassed. |
| **Standard entry** | Player manually selects **None**, **Minor**, or **Major**, or rolls 1d100: 01–09 Major, 10–25 Minor, 26–00 None. **Master** is never rolled — only psychic-class O.C.C.s lock Master. |

---

## 2. Skill tax (Major tier)

For high-potential psychics who are **not** in psychic-specific O.C.C.s:

| Tier | Save vs. Psi target | Mechanical impact |
|------|---------------------|-------------------|
| **None** | 15 | Standard skill progression. |
| **Minor** | 12 | 2 powers from one Sensitive / Physical / Healing category. No skill penalty. |
| **Major** | 12 | 8 powers from one category, or 6 mixed from those three. **O.C.C. related skills reduced by 50%** (floor). |
| **Master** | 10 | Typically O.C.C.-driven. Full skill access. |

---

## 3. I.S.P. initialization

After tier confirmation, I.S.P. dice blocks appear on **Tab 5 — Roll Pending** when tier ≠ none:

| Tier | Base pool |
|------|-----------|
| **Minor** | M.E. + 2D6 (+1D6/level) |
| **Major** | M.E. + 4D6 (+1D6+1/level) |

---

## 4. Selection interaction (Tab 7)

The supernatural abilities forge provides a countdown of remaining picks per tier.

**Constraint:** Super psionic powers stay locked for Minor tier unless an O.C.C. ability overrides.

**Major allocation:** Player selects 8-from-one-category or 6-mixed on Tab 7 (`PsychicGateMajorAllocationPicker` when applicable).
