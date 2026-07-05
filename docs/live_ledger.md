# Live Ledger — Quick Reference

> **Authoritative spec:** [`stat_engine_spec.md`](./stat_engine_spec.md)  
> **Unified pipeline (Pillar 9):** [`unified_paths.md`](./unified_paths.md) — Live Ledger stage map  
> This file is a short formula cheat sheet. If anything here disagrees with `stat_engine_spec.md`, the stat engine spec wins.

---

## Notation

**All races (elf, human, dwarf, etc.):** use plain stat names — `IQ`, `PE`, `SDC`, `H.P.` — with no form prefix.

**Nightbane dual-form only:**

- `p` prefix — primary form (code: `primary`) — e.g. `pIQ`, `pSDC`
- `m` prefix — Morphus (e.g. `mPE`, `mSDC`)
- Primary form is assumed **complete** when building Morphus previews.

## Modifier buckets

| Term | Meaning |
|------|---------|
| Race | Racial bonuses |
| OCC | O.C.C. / R.C.C. |
| Skills | Skill modifiers (often Physical) |
| HtH | Hand-to-Hand progression |
| mBase | `src/data/content/morphus/forge/nightbane_base_morphus.json` |
| traits | Morphus characteristic picks |
| mSkills | Skills only the Morphus has |
| misc | Talents, gear, stance, GM overrides |
| `Attr>16` / `Attr>30` | `src/lib/attributeBonuses.ts` |

---

## Character (all races)

**Attributes:** Race + OCC + Skills + misc (+ pool)

**Vitals:** HP · SDC · PPE · ISP (if psychic) · HF · Natural A.R.

**Saves:** Attr>16 + Race + OCC + Skills + misc — **sheet shows vs target + roll bonus** (see `stat_engine_spec.md` §4.4)

**Combat:** APM `2 + HtH + …` · Initiative · Strike/Parry/Dodge `PP>16 + HtH + …` · etc.

See **§4** in `stat_engine_spec.md` for defaults.

---

## Morphus (Nightbane only)

**Attributes:** `pAttr + mBase + traits + mSkills + misc`

**Vitals:** mHP `mPE×2 + 2D6/lv` · mSDC `pSDC + 2D6×10 + traits` · PPE shared · mHF `mBase + traits`

**Saves:** mBase + mAttr>16 + traits · Mind Control **Immune**

**Combat:** APM `2 + mBase + HtH + mSkills + traits + misc` · etc.

Full tables: **`stat_engine_spec.md` §5**.
