# Palladium O.C.C. catalog ingest

How agents should add or update **Palladium Occupational Character Classes** (and Shadow O.C.C. skill programs for R.C.C.s) so every row matches the schema, Tab 1 configurator, skill budgets, supernatural engines, and progression links.

---

## What you need to provide

Send one batch per message (or per agent session). **Default to Pass A** — a single O.C.C. is usually a full batch.

### Batch sizes

| Pass | Scope | Items per batch | Use a smaller batch when… |
|------|-------|-----------------|---------------------------|
| **Pass A** | Creation composition — skills, W.P., H2H, gates, P.P.E./I.S.P. engines, progression link | **1 O.C.C.** | Simple variant or specialization-only update |
| **Pass B** | Deep modules — `classAbilities` percentile profiles, `supernaturalRuleOverrides`, spell/psionic roadmaps, specialization branches | **1 O.C.C. or 1 specialization** | Large `specializations[]` trees or multi-engine O.C.C.s |

Pass B is optional and can follow Pass A once the baseline row is stable.

### Required in every batch request

| Field | Required | Example |
|-------|----------|---------|
| **PDF + page range** | Yes | `Nightbane RPG pp. 95–98` |
| **Genre** | Yes | `nightbane` — sets `gameSystems` |
| **Scope** | Yes | `composition-only` (Pass A) or `include deep modules` (Pass B) |
| **O.C.C. name** | Yes | Exact printed name (one per batch for Pass A) |

Optional: paired **R.C.C. race** name when ingesting a Shadow O.C.C. (`forcedOccId` on race); **XP table** pages if creating a new progression file; supplement book when not in core.

### Copy-paste template (Pass A)

```text
Batch: Nightbane RPG pp. 95–98
Genre: nightbane
Scope: composition-only (Pass A)
O.C.C.: Sorcerer
```

### Copy-paste template (Pass B — specialization)

```text
Batch: Between the Shadows pp. 12–14
Genre: nightbane
Scope: include deep modules (Pass B)
O.C.C.: Spook Squad Agent
Focus: Team Epsilon specialization branch
```

After each batch the agent runs `npm run validate:schemas` (includes **XP table ↔ O.C.C. bidirectional links**). **Flag ambiguous book text and ask for a ruling** before encoding.

---

**Source of truth (code):**

| Artifact | Path |
|----------|------|
| Schema | `src/data/schemas/palladium-occ.schema.json` |
| Example rows | `src/data/schemas/examples/palladium-occ.example.json`, `palladium-occ.example-spook-squad.json` |
| Catalog | `src/data/content/occs/<genre>/<book>.json` |
| XP tables | `src/data/content/progression/xp_tables/<genre>/<book>.json` |
| Loader | `src/data/library/occCatalogLoader.ts` |
| Composition | `src/lib/occComposition.ts`, `src/lib/occCatalogEngine.ts` |
| Runtime slim view | `src/data/occDefinitions.ts` |
| Reference PDFs | `src/data/reference/<genre>/` (gitignored) |

When the schema changes, **update the matching example JSON** under `src/data/schemas/examples/`.

### Living document (process rules)

**This file is the shared ingest playbook.** Update it when conventions change. See `.cursorrules`. **Layout:** [`../content-catalog-layout.md`](../content-catalog-layout.md). **Doc sync:** [`../gemini-project-context.md`](../gemini-project-context.md) § Development workflow.

---

## Catalog layout (genre folder → book file)

**Convention:** one JSON array per **source book**, grouped under a **genre folder** (`gameSystems` slug).

```
src/data/content/occs/
  nightbane/
    nightbane_core.json
    between_the_shadows.json
  rifts/                    # (future)
  palladium_fantasy/        # (future)
  heroes_unlimited/         # (future)
```

| Rule | Detail |
|------|--------|
| **Genre folder** | Stable slug matching `gameSystems` on rows in that book (`nightbane`, `rifts`, `palladium_fantasy`, …) |
| **Book file** | One array per supplement or core rulebook; descriptive snake_case basename |
| **No loose JSON at `occs/` root** | Book files live only inside genre subfolders |
| **Global unique `id`** | `occ_<snake_case>` across all genre folders and book files |
| **`occType`** | Open slug (`magic_user`, `psychic`, `law_enforcement`, `nightbane_rcc`, `rcc_skill_program`, …) — not a closed enum |
| **`tags`** | Background tags for race vitals conditionals and filters (`military`, `police`, …) |
| **XP link** | When `progression.xpTableId` is set, table’s `occIds[]` must list this O.C.C. and vice versa — table lives in `progression/xp_tables/<genre>/<book>.json` (genre folder mirrors O.C.C. layout) |

**XP table layout (genre folder → book file):**

```
src/data/content/progression/xp_tables/
  nightbane/
    nightbane_core.json      # tables[] bundle for core book
    between_the_shadows.json
```

Book file basenames should match the paired O.C.C. book file under `occs/<genre>/` when they share a source.

**Shadow O.C.C. / R.C.C. pairing:** R.C.C. races use `canPickOcc: false` + `forcedOccId` pointing at a hidden O.C.C. row (`occType: nightbane_rcc` or `rcc_skill_program`). **Default:** ingest race + Shadow O.C.C. in the **same session** when ingesting an R.C.C. — see `docs/ingest/races.md`. Skip Shadow O.C.C. only when the batch explicitly says race-only / stat-block-only.

---

## Rules ambiguity — flag and ask

Flag when you see:

- **Core vs related vs secondary** — slot counts, category minimums, voucher wording
- **Skill ids** — book name vs catalog `skill_*` id; legacy aliases
- **W.P. / H2H** — upgrade paths, forbidden lists, alignment gates
- **P.P.E. / I.S.P. engines** — formulas, granted powers, spell school access
- **`spellAccessRules`** — native schools vs `magic_cross_lists.json` borrow ids
- **Psychic Gate** — bypass vs standard pick rules on `ispEngine`
- **Specializations** — merge overrides vs separate O.C.C. rows
- **Attribute requirements** — minimums vs recommendations in prose

---

## Two ingest passes

### Pass A — Creation composition (default)

**Goal:** Tab 1 O.C.C. picker, skill Tab 4 budgets, Tab 7 supernatural picks, progression.

**Batch size:** **1 O.C.C.**

**Schema-required fields (all must be present):**

- Identity: `id`, `name`, `description`, `gameSystems`, `sources`, `occType`, `tags`
- `occSkillsCore[]` — fixed grants and/or vouchers
- `occRelatedSkills` — `initialSlotsCount`, `categoryRules` (and optional `categoryMinimums`, `startingSkillIds`)
- `secondarySkills` — `initialSlotsCount`, `forbiddenCategories`
- `wpRules` — `coreWps`, `forbiddenWps` (use catalog `wp_*` ids from [`weapon_proficiencies.md`](weapon_proficiencies.md); Skill Engine greys out `forbiddenWps` during creation)
- `handToHandRules` — `defaultSkillId`, `upgradePaths` (`electiveSlotCost` is **per O.C.C.** — transcribe from that O.C.C.'s book text; see [`hth.md`](hth.md) Pass B). Optional `minimumCreationHandToHandTier` on specialization branches when book prose requires a floor (e.g. A.D.A. Assassination Specialist → Expert).

**Practically required modules (by O.C.C. type):**

| O.C.C. kind | Typical modules |
|-------------|-----------------|
| Magic user | `ppeEngine` (`magicSchools`, spell picks), `spellAccessRules` |
| Psychic | `ispEngine`, psychic gate flags |
| Combat / civilian | `staticBonuses`, gear/finances when book lists them |
| All | `progression.xpTableId` when not using default |

Use `[]` / empty objects where the book grants nothing in a block — schema still requires the top-level keys.

**Do not block Pass A on:** deep `classAbilities` percentile automation, full Tier 2 spell/psionic play blocks on granted features.

### Pass B — Deep modules (optional)

**Batch size:** **1 O.C.C. or 1 specialization branch**.

Typical keys: `specializations[]`, `classAbilities[]` with `percentileProfile`, `supernaturalRuleOverrides`, `talentEngine`, `attributeRequirements`, `alignmentRestrictions`, `raceRestrictions`, detailed `spellAccessRules` roadmaps.

---

## Skill references

Every `skillId` in `occSkillsCore`, related picks, and prerequisites must resolve in `src/data/content/skills/*.json`. Run `npm run audit:skills` after large skill-catalog changes that O.C.C. batches depend on.

W.P. ids use `wp_*` / hand-to-hand ids use `hth_*` per existing catalog conventions. Ingest new styles via [`hth.md`](hth.md) and new W.P. rows via [`weapon_proficiencies.md`](weapon_proficiencies.md). XP floor transcription: [`xp_tables.md`](xp_tables.md).

---

## Agent workflow (checklist)

1. Read cited PDF pages.
2. **Flag ambiguity; get user ruling.**
3. Choose genre folder + book file (`occs/<genre>/<book>.json`); create folder/file if new supplement.
4. Fill **Pass A** composition blocks.
5. Link **XP table** bidirectionally if not default — see [`xp_tables.md`](xp_tables.md).
6. If magic O.C.C.: align `ppeEngine.magicSchools` with `magic_schools.json`; update cross-lists if borrow rules change.
7. If psychic O.C.C.: align with `../psychic_gate.md` and `ispEngine`.
8. If R.C.C. paired: coordinate with race ingest (`forcedOccId`) — **default same session** unless batch skips Shadow O.C.C.
9. **Update this doc** if precedents changed.
10. Run `npm run validate:schemas`.
11. Do **not** commit unless the user asks.

---

## Validation & tooling

| Command | Purpose |
|---------|---------|
| `npm run validate:schemas` | O.C.C. rows + `progression/xp_tables` cross-links |
| `npm run audit:skills` | Broken `skillId` refs in skill catalog (indirect O.C.C. dependency) |

No `audit:occs` script yet.

---

## User rulings (precedents)

| O.C.C. / topic | Issue | Ruling |
|----------------|-------|--------|
| File layout | Genre vs book | **`<genre>/<book>.json`** — books grouped by `gameSystems` slug folder |
| Shadow O.C.C. default | Race ingest pairing | **Same session by default** — add Shadow O.C.C. + `forcedOccId` + XP link unless batch says race-only |
| Nightbane core skill packages | Secondary skills (p. 89) | **Shared rule for all four packages** — 6 at creation, +2 at levels 4 and 8; no O.C.C. % bonus; same category limits as Related Skills (engine: `isSecondarySkillAllowed` mirrors related access) |
| Nightbane Sorcerer initial spells | p. 120 "twelve (two from each)" vs "three from each" | **3 per level × levels 1–4 = 12 total** — parenthetical "two from each" treated as book errata |
| Wampyr R.C.C. skills | No category list in book | **Open catalog access (`any` on all categories)** + `packageNotes`/GM approval — skills must fit pre-transformation occupation/education |
| Doppleganger R.C.C. skills | "Same as normal humans"; counterpart O.C.C. sets availability; no category list on p. 160 | **Open catalog access (`any` on all categories)** + `packageNotes`/GM approval — provisional 10 related + 8 secondary until mirrored-O.C.C. workflow; category limits follow Earth double's O.C.C. at the table |
| Doppleganger R.C.C. Pass B | pp. 159–161 skills + mirror rules | **`supernaturalRuleOverrides`** for minor-psionic globals; deep **`classAbilities`** for counterpart O.C.C./skill mirror, alignment table, awakening/Earth survival, psionic/magic fractions, supernatural damage cross-ref to `race_doppleganger`; open skill access + `ispEngine` already encoded from Pass A |
| Hound R.C.C. Pass B | pp. 161–163 lore + minimal skills | Deep **`classAbilities`** cross-refing `race_hound` for shock-troop role, fixed skill package, Assassin combat, supernatural tracking, immunities/vulnerabilities, Darkblade gear; **`startingEquipment`** for standard loadout; no elective skills |
| Hound Master R.C.C. Pass B | pp. 162–164 troop leader + minimal skills | **`supernaturalRuleOverrides`** for minor-psionic globals; deep **`classAbilities`** for Illusion Shells, granted Mind Block/Empathy, troop-leader/renegade roles, Assassin combat cross-ref to `race_hound_master`; **`ispEngine`**/`startingEquipment` already encoded from Pass A |
| Hunter R.C.C. Pass B | pp. 164–166 aerial scout + minimal skills | Deep **`classAbilities`** cross-refing `race_hunter` for flight, aerial combat, beak attack, supernatural tracking, immunities/vulnerabilities, Darkblade gear; **`startingEquipment`** for standard loadout; no elective skills |
| Ashmedai R.C.C. Pass B | pp. 165–166 shape-shifter + elective skills | **`supernaturalRuleOverrides`** for minor-psionic globals; deep **`classAbilities`** for shape-shift/P.P.E. predation, granted five innate psionics, humanoid-only Physical bonuses, NSB kit/Nightbane's Skin cross-ref to `race_ashmedai`; **`ispEngine`**/`startingEquipment`/`handToHandRules` already encoded from Pass A |
| Namtar R.C.C. Pass B | pp. 167–168 beetle pilot + elective skills | Deep **`classAbilities`** for Hollow Man build/pilot/repair, construct H2H Expert cross-ref to `race_hollow_man`, fixed racial skills, magic-like powers only, vulnerabilities, NSB kit; **`startingEquipment`**; paired `occ_hollow_man_rcc` note; no psionics |
| Hollow Man R.C.C. Pass B | pp. 167–168 MIB construct + shared skills | Deep **`classAbilities`** for construct vitals/destruction/repair, illusion immunity, H2H Expert, pilot pairing cross-ref to `race_namtar`, P.P.E./skills-on-pilot note, vulnerabilities, NSB kit; **`startingEquipment`**; paired `occ_namtar_rcc` note; no psionics |
| Snake Bird R.C.C. Pass B | p. 169 natural spell caster + GM approval | Deep **`classAbilities`** for intuitive spell roadmap, Mystic magic parity (`staticBonuses` save vs magic), fixed racial skills, natural combat/poison/flight cross-ref to `race_snake_bird`; **`ppeEngine`**/secondary GM guidance already encoded from Pass A |
| Nightlord R.C.C. Pass B | pp. 173–175 Ba'al arch-villain + skills | Deep **`classAbilities`** for Avatars/backlash, life-force vampirism, matter/energy control, Mirrorwall/dimensional senses, commanded forces cross-ref to `race_nightlord`; optional artifact **`startingEquipment`**; no spell/psionic engines |
| Night Prince R.C.C. Pass B | pp. 175–177 Ba'al-Zebul + skills | Deep **`classAbilities`** for illusion tiers/H.F./death-by-illusion, energy vampirism, infiltrator role, H2H Assassin cross-ref to `race_night_prince`; **`startingEquipment`** for masquerade kit; **`ppeEngine`** already encoded from Pass A; eight languages at 98% documented (table baseline — choice vouchers lack `basePercent`) |
| Priest of Night R.C.C. Pass B | pp. 177–178 cult fanatic + Gift of Power | Deep **`classAbilities`** for human baseline/Gift of Power, spell program/Nightlands access, recruitment/Dark Day lore cross-ref to `race_priest_of_night`; **`finances`**/`startingEquipment`/H2H upgrade paths/`levelUpSkillChoices` already encoded from Pass A |
| Master Vampire R.C.C. Pass B | pp. 179–181 first-generation undead + skills | **`supernaturalRuleOverrides`** for master psionic globals + custom psychic APM mix; deep **`classAbilities`** for frozen/century skills, true-vampire module cross-ref, slow kill/hierarchy/factions; **`ispEngine`**/`startingEquipment` already encoded from Pass A |
| Secondary Vampire R.C.C. Pass B | pp. 181–182 second-generation undead + skills | **`supernaturalRuleOverrides`** for major psionic globals + custom psychic APM mix; deep **`classAbilities`** for frozen/level-up skills, half pre-rebirth magic, master mind-control susceptibility, inconsistent slow-kill roll cross-ref to `race_secondary_vampire`; **`ispEngine`**/`startingEquipment`/`levelUpSkillChoices` already encoded from Pass A |
| Wild Vampire R.C.C. Pass B | pp. 182–183 third-generation undead + skills | **`supernaturalRuleOverrides`** for minor psionic globals + custom psychic APM mix; deep **`classAbilities`** for frozen/secondary growth skills, no pre-rebirth magic, subservience/starvation origins, Nightlord hunt cross-ref to `race_wild_vampire`; **`ispEngine`**/`startingEquipment`/`levelUpSkillChoices` already encoded from Pass A |
| Wampyr R.C.C. Pass B | pp. 188–189 slow-kill aberration + skills | **`supernaturalRuleOverrides`** for psionic globals + standard H2H-linked psychic APM; deep **`classAbilities`** for open GM-approved skills, excluded true-vampire module, hunter lore/alliances cross-ref to `race_wampyr`; **`ispEngine`** with granted vampire psionics + **`perLevelSelection`**; **`finances`**/`startingEquipment`/`handToHandRules`/`levelUpSkillChoices` already encoded from Pass A |
| Guardian R.C.C. Pass B | pp. 189–192 light-energy protector + skills | **`supernaturalRuleOverrides`** for master psionic globals + H2H-linked psychic APM; deep **`classAbilities`** for memory-loss skill list, P.P.E. light powers/nullify magic, solar deprivation cross-ref to `race_guardian`; **`ppeEngine`**/`ispEngine` with Sensitive/Healing **`perLevelSelection`**; **`finances`**/`startingEquipment`/`handToHandRules`/`levelUpSkillChoices` already encoded from Pass A |
| Psychic P.C.C. Pass B | pp. 67–69 psionic globals + P.C.C. powers block | **`supernaturalRuleOverrides`** with `useGlobalDefault: true` (inherits `psionic_global_rules.json`); deep **`classAbilities`** for autostart psionics, I.S.P./P.P.E., advancement program, ley line/meditation rules, Dark Day persecution |
| Nightbane Basic Skill Package Pass B | pp. 88–89 shared R.C.C. + Basic package | Deep **`classAbilities`** for Dark Day default, G.M. skill flexibility, faction cross-training, Morphus innate combat cross-ref, related/secondary advancement; **`startingEquipment`** for civilian baseline gear |
| Nightbane Resistance/Spook Squad Pass B | pp. 88–90 shared R.C.C. + militant package | Deep **`classAbilities`** for militant/military background, included Facade H2H Basic, military W.P. access, Morphus combat cross-ref, related/secondary advancement; **`startingEquipment`** for tactical/militant gear baseline |
| Nightbane Nocturne/Seeker/Lightbringer Pass B | pp. 88–91 shared R.C.C. + scholastic package | Deep **`classAbilities`** for scholastic/graduate background, Nightbane Lore core skill, civilian W.P., Morphus combat cross-ref, related/secondary advancement; **`startingEquipment`** for educated/scholastic gear baseline |
| Nightbane Warlord Pass B | pp. 88–91 shared R.C.C. + street/gang package | Deep **`classAbilities`** for Warlord/gang background, optional literacy, included Facade H2H Basic, any W.P., street-survival focus, Morphus combat cross-ref, related/secondary advancement; **`startingEquipment`** for gang/street gear baseline |
| Sorcerer O.C.C. Pass B | pp. 115–117 abilities, skills, gear | Deep **`classAbilities`** for magic principles, ley line sense, initial spell program, Pursuit of Magic, magic saves, P.P.E., scholar background, related/secondary advancement; **`ppeEngine`**/`staticBonuses`/`startingEquipment`/`finances` already encoded from Pass A |
| Mystic O.C.C. Pass B | pp. 117–119 abilities, skills, gear | **`supernaturalRuleOverrides`** (ley line/meditation/psychic APM globals); deep **`classAbilities`** for major psionic program, intuitive spell roadmap, mystic bonuses/spell strength, shaman background; **`ppeEngine`**/`ispEngine`/`specializations` already encoded from Pass A |
| Nightbane Sorcerer O.C.C. Pass B | pp. 118–120 abilities, skills, gear | Deep **`classAbilities`** for Sorcerer-parity magic senses, initial spell program, Pursuit of Magic, reduced magic saves, racial P.P.E./Talent trade-off, dual power source, Morphus combat cross-ref; **`ppeEngine`**/`customAbilityEngines`/`staticBonuses` already encoded from Pass A |
| BTS Spook Squad O.C.C.s — W.P. Pistol | Book lists "W.P. Pistol" (Ex-Gov Agent, Team Epsilon) vs fixed automatic pistol (P.A.B. Psychic) | **Player-choice voucher** `wp_automatic_pistol` **or** `wp_revolver` where book says "W.P. Pistol"; **fixed** `wp_automatic_pistol` where book text specifies automatic pistol only |
| BTS Spook Squad O.C.C.s Pass B | pp. 30–37 six O.C.C.s | Deep **`classAbilities`** per row: federal/NSB lore, Team Epsilon anti-supernatural + branch notes, A.D.A. per-specialization skills, P.A.B. field experience, Pandora Recognize the Supernatural percentile, P.A.B. Psychic program/I.S.P.; Pass A skill packages/specializations/`ispEngine` already encoded |

---

## Reference examples

| Artifact | Pattern |
|----------|---------|
| `palladium-occ.example.json` | Sorcerer — P.P.E., related categories, spell access |
| `palladium-occ.example-spook-squad.json` | Specializations, vouchers |
| `occs/nightbane/nightbane_core.json` | Core Nightbane O.C.C. pool |

---

## Do not

- Split one O.C.C. across duplicate `id`s.
- Point `forcedOccId` from a race at a missing Shadow O.C.C. row.
- **Guess** skill slot counts or category minimums.
- Omit required schema blocks — use empty arrays/objects instead.
- Skip XP table bidirectional validation.

---

## Related docs

- [`races.md`](races.md) — R.C.C. pairing, `forcedOccId`
- [`skills.md`](skills.md) — skill catalog ids
- [`hth.md`](hth.md) — Hand-to-Hand `hth_*` ids
- [`weapon_proficiencies.md`](weapon_proficiencies.md) — W.P. `wp_*` ids
- [`xp_tables.md`](xp_tables.md) — XP floor transcription
- [`magic.md`](magic.md) — `spellAccessRules`, cross-lists
- `../psychic_gate.md` — psychic O.C.C. gate behavior
- `../character_creation.md` — Tab 1 configurator
- `.cursorrules`
