# Sub-forge backlog

Reminder list of **creation sub-forges** (`creationSubForgeId` on O.C.C./race rows) to design and implement later. Catalog rows may reference these in `packageNotes` / `classAbilities` until the UI exists.

**Navigation engine:** [`../universal_forge_navigation_engine.md`](../universal_forge_navigation_engine.md)  
**Shipped example:** [`morphus_creation.md`](morphus_creation.md) (`morphus_forge_manifest`)

---

## Status key

| Status | Meaning |
|--------|---------|
| **catalog-only** | O.C.C./race encoded; player resolves manually at the table |
| **planned** | Spec identified; no manifest yet |
| **in design** | Manifest or engine contract being written |

---

## Backlog

| ID (proposed) | Trigger rows | Book / topic | Scope (when built) | Status |
|---------------|--------------|--------------|-------------------|--------|
| `astral_domain_forge` | `occ_astral_lord_pcc`, `occ_astral_mage`, `race_millek` (domain parity) | BTS pp. 54+ *Building an Astral Domain* | Chargen: size tier → creation points → accessibility/portals/features; permanent P.P.E. spend; multi-contributor pools | **planned** |
| `dream_domain_forge` | `occ_dream_maker_pcc` | BTS p. 95 #9 *Create Dream Domain* | Permanent I.S.P. spends: membrane +15 save, Earth/Nightlands/Astral portal (15 ISP), fast activation (+10 ISP), movable portal (+5 ISP) | **planned** |
| `dream_combat_reference` | Dream Maker, Dream Dancer, Necrophim RCC | BTS Dreamstream chapter | Not a full forge — likely **rules panel** + strike/resist helpers during play; link from `classAbilities` | **planned** |
| `morphus_forge_manifest` | `race_nightbane`, Nightbane R.C.C.s | Core NB | Tab 6 Morphus trait selection | **shipped** — see `morphus_creation.md` |

---

## Notes for implementers

- **Astral domain** and **dream domain** are separate systems: P.P.E. permanent base vs dream-pool I.S.P. upgrades; do not merge manifests without a book ruling.
- Prefer **inspectable math** (Pillar 4) and **GM override** on every computed spend.
- When a sub-forge ships, update the triggering O.C.C. rows with `creationSubForgeId` and sync this table to **shipped**.

---

## Related docs

- [`character_creation.md`](character_creation.md) — Tab 6 sub-forge slot
- [`../ingest/occs.md`](../ingest/occs.md) — O.C.C. ingest precedents
- [`_README.md`](_README.md) — forge doc index
