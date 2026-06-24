# Palladium race catalog ingest

How agents should add or update **Palladium races and R.C.C.s** so every row matches the schema, Tab 1 configurator, attribute dice, vitals, Psychic Gate bypass rules, and optional Morphus / sub-forge hooks.

---

## What you need to provide

Send one batch per message (or per agent session). **Default to Pass A** — one race is usually a full batch.

### Batch sizes

| Pass | Scope | Items per batch | Use a smaller batch when… |
|------|-------|-----------------|---------------------------|
| **Pass A** | Creation composition — attributes, vitals, psionics capability, O.C.C. relationship, innate skills/bonuses | **1 race** | Minor demographic or source-only update |
| **Pass B** | Deep innate modules — structured `innateBonuses.modifiers`, save roadmaps, morphus trait hooks | **1 race** | Large modifier trees or dual-form policy edge cases |

Pass B is optional and can follow Pass A.

### Required in every batch request

| Field | Required | Example |
|-------|----------|---------|
| **PDF + page range** | Yes | `Nightbane RPG pp. 28–32` |
| **Genre** | Yes | `nightbane` — sets `gameSystems` |
| **Audience pool** | Yes | `player`, `npc`, or `gm_approval` — determines **file** (see below) |
| **Scope** | Yes | `composition-only` (Pass A) or `include deep modules` (Pass B) |
| **Race name** | Yes | Exact printed name |

Optional: paired **Shadow O.C.C.** when `canPickOcc: false`; **genre whitelist** note when adding to `player.json` (creation requires genre manifest + row `gameSystems`).

### Copy-paste template (Pass A — playable race)

```text
Batch: Nightbane RPG pp. 28–32
Genre: nightbane
Audience: player
Scope: composition-only (Pass A)
Race: Human
```

### Copy-paste template (Pass A — R.C.C.)

```text
Batch: Nightbane RPG pp. 33–36
Genre: nightbane
Audience: player
Scope: composition-only (Pass A)
Race: Guardian
Paired Shadow O.C.C.: Guardian (skill program) — ingest both in same session
```

After each batch the agent runs `npm run validate:schemas`. **Flag ambiguous book text and ask for a ruling** before encoding.

---

**Source of truth (code):**

| Artifact | Path |
|----------|------|
| Schema | `src/data/schemas/palladium-race.schema.json` |
| Example rows | `src/data/schemas/examples/palladium-race.example.json`, `palladium-race.example-rcc.json` |
| Catalog (target) | `src/data/content/races/<genre>/{player,npc,gm_approval,creatures}.json` |
| Catalog (legacy) | `src/data/content/races/{player,npc,gm_approval}.json` — migrate to genre folders |
| Loader | `src/data/library/raceCatalogLoader.ts` |
| Creation filter | `src/lib/raceCatalog.ts`, `src/lib/creationRaceOccSync.ts` |
| Genre manifest | `src/data/genres.ts` — `GENRE_MANIFEST` whitelists playable races |
| Reference PDFs | `src/data/reference/<genre>/` (gitignored) |

When the schema changes, **update the matching example JSON** under `src/data/schemas/examples/`.

### Living document (process rules)

**This file is the shared ingest playbook.** Update it when conventions change. See `.cursorrules`. **Layout:** [`../content-catalog-layout.md`](../content-catalog-layout.md). **Doc sync:** [`../gemini-project-context.md`](../gemini-project-context.md) § Development workflow.

---

## Catalog layout (genre folder → audience pool)

**See [`../content-catalog-layout.md`](../content-catalog-layout.md)** for the shared layout contract (`utils/` ancillary files, loader rules, and move checklist). Genre-scoped race pools:

```
src/data/content/races/
  nightbane/
    player.json
    npc.json
    gm_approval.json
    creatures.json
  rifts/
    player.json
    npc.json
    gm_approval.json
    creatures.json
  palladium_fantasy/
    player.json
    npc.json
    gm_approval.json
    creatures.json
```

| Rule | Detail |
|------|--------|
| **Genre folder** | Stable slug matching `GENRE_MANIFEST` (`nightbane`, `rifts`, `palladium_fantasy`, …) |
| **Audience file** | `player` / `npc` / `gm_approval` / `creature` — same semantics as today, scoped per genre |
| **`raceAudience` must match file** | `player.json` → `"raceAudience": "player"` (loader throws on mismatch); `creatures.json` → `"creature"` |
| **`raceComposition`** | **`character`** — Human-style O.C.C. pick. **`rcc`** — `canPickOcc: false` + **`forcedOccId`**. **`creature`** — animals/monsters in **`creatures.json`** only; no O.C.C., no `forcedOccId`. |
| **Unique `id` per genre** | Same `race_human` **may** appear in multiple genre folders — rows are **not** merged across genres |
| **Resolution** | Runtime looks up `(hostGenreId, raceId)` — character save stores `raceId`; genre comes from `creationGenreId` / `hostGenreId` |
| **`gameSystems` on row** | Single-genre slug matching the folder (e.g. `["nightbane"]` in `races/nightbane/`) — do not multi-tag one row when genre-split |
| **`npc`** | Monsters / NPC stat blocks for that setting only |
| **`creature`** | Non-sentient animals/monsters in `creatures.json` — bestiary/summon stat blocks only |

**Loader:** `raceCatalogLoader.ts` globs `races/<genre>/{player,npc,gm_approval,creatures}.json`. Runtime resolves `(hostGenreId, raceId)` via `getRaceById(id, genreId)`.

---

## Megaversal races (e.g. Human)

Human appears in Nightbane, Rifts, Palladium Fantasy, and more. **Do not** maintain one monolithic Human row with `gameSystems: [nightbane, rifts, …]` once genre folders land.

### Recommended pattern: **one Human row per genre file, same canonical `id`**

```
races/nightbane/player.json     → race_human (Nightbane SDC rules + sources)
races/rifts/player.json         → race_human (Rifts SDC rules + sources)
races/palladium_fantasy/player.json → race_human (Fantasy SDC rules + sources)
```

| Field | Usually shared across genres | Usually **genre-specific** |
|-------|------------------------------|----------------------------|
| `id` | `race_human` (stable save key) | — |
| `name`, attribute dice | Often identical (`3D6` all) | Rare exceptions (book variants) |
| `vitals.sdc` | Strategy type (`conditional_by_occ_tags`) | **`conditionalOverrides` tags + formulas** |
| `sources` | — | One book citation per genre file |
| `psionics.capabilityType` | Genre-specific — see **Default Human** below | **`none`** on Nightbane Human (no latent gate); **`standard`** on Rifts / Fantasy |
| `lineage` | `megaversal` on Human | Nightbane-only races use `nightbane` |

### S.D.C. — use `conditional_by_occ_tags` per genre (already in schema)

Human S.D.C. is not one flat number — it depends on O.C.C. type. The engine already resolves this at chargen when an O.C.C. is selected (`vitalsCalculator.ts` + O.C.C. `tags`).

**Nightbane example** (current catalog):

```json
"sdc": {
  "strategy": "conditional_by_occ_tags",
  "defaultFormula": "3D6",
  "conditionalOverrides": [
    {
      "tags": ["military", "police", "detective", "athletic", "tactical"],
      "formula": "1D4*10"
    }
  ]
}
```

**Palladium Fantasy example** (ingest when Fantasy O.C.C.s exist — tags must match Fantasy O.C.C. `tags`, not Nightbane’s):

```json
"sdc": {
  "strategy": "conditional_by_occ_tags",
  "defaultFormula": "2D6",
  "conditionalOverrides": [
    {
      "tags": ["men_at_arms", "soldier", "knight", "mercenary"],
      "formula": "3D6+10"
    },
    {
      "tags": ["magic_user", "scholar", "cleric"],
      "formula": "2D6"
    }
  ]
}
```

Flag ambiguous book S.D.C. tables and ask the user before encoding tag→formula mappings.

### What **not** to do

- **Do not** invent `race_human_nightbane` / `race_human_fantasy` ids — breaks Megaversal Bridge and save portability of the Human concept.
- **Do not** stuff all genres’ S.D.C. overrides into one row — tag vocabularies differ per line and O.C.C. ingest.
- **Do not** hide genre differences in prose-only `description` — encode in `vitals` + `tags` alignment with O.C.C. catalog.

### Loader

`getRaceById(id, genreId)` — genre from `hostGenreId` / `creationGenreId`. Creation picker lists `races/{hostGenreId}/player.json` only.

---

## Default Human (implicit)

Nightbane (and many Palladium lines) treat **Human** as the default species — there is **no dedicated R.C.C. sidebar**. Baseline stats and S.D.C. rules live under **Creating a Character** (Nightbane RPG pp. 34–37), not a race chapter. The catalog still needs a **`race_human`** row per genre so Tab 1 can resolve attributes, vitals, and Psychic Gate policy.

### When to ingest

| Trigger | Action |
|---------|--------|
| First playable O.C.C.s for a genre land | Add **`race_human`** to `races/<genre>/player.json` (Pass A) |
| Book cites human S.D.C. / attribute baselines only in chargen | Source page = **Creating a Character** step (Nightbane **p. 34**), not faction or race sidebar pages |
| Genre has no latent “roll for psionics” on mundane humans | Set `psionics.capabilityType: "none"` — Psychic Gate Tab 3 **bypasses** for mundane O.C.C.s |
| Genre allows latent psionics on any human (e.g. Rifts) | Keep `capabilityType: "standard"` — Tab 3 None / Minor / Major applies |

### Copy-paste template (Pass A — default Human)

```text
Batch: Nightbane RPG pp. 34–37
Genre: nightbane
Audience: player
Scope: composition-only (Pass A)
Race: Human (implicit — Creating a Character baseline, not an R.C.C.)
Notes: capabilityType none; SDC conditional_by_occ_tags aligned with O.C.C. tags
```

### Encoding checklist

| Field | Nightbane Human | Rifts Human (reference) |
|-------|-----------------|-------------------------|
| `id` | `race_human` | `race_human` |
| `canPickOcc` | `true` | `true` |
| `description` | States implicit default; cites Creating a Character; notes psionics only via psychic O.C.C.s | Setting-appropriate baseline prose |
| `sources[].pageNumber` | **34** (Creating a Character) | Rifts chargen page when ingested |
| `attributes` | `3D6` all eight | Usually same |
| `vitals.hpFormula` | `PE + 1D6` | Per book |
| `vitals.sdc` | `conditional_by_occ_tags` — default `3D6`, override `1D4*10` for military/police/detective/athletic/tactical tags | Genre-specific overrides |
| `psionics.capabilityType` | **`none`** | **`standard`** |
| `psionics.naturalIspFormula` | `"0"` | `"0"` or per book |

**Important:** `capabilityType: "none"` means **no latent Psychic Gate** — not “humans never have psionics.” Psychic P.C.C.s and O.C.C.s with `ispEngine` still mount I.S.P. and psionic picks on Tab 7. See `../psychic_gate.md`.

### Psychic Gate policy by genre (Human)

| Genre | `capabilityType` | Tab 3 for mundane O.C.C. | Psionics on Human |
|-------|------------------|---------------------------|-------------------|
| **nightbane** | `none` | Bypassed | Psychic P.C.C., Sorcerer, Mystic, etc. via O.C.C. engines |
| **rifts** | `standard` | None / Minor / Major roll | Latent gate + psychic O.C.C.s |
| **palladium_fantasy** | `standard` (until ruled otherwise) | Per Rifts pattern when O.C.C.s exist | Per book |

---

## Rules ambiguity — flag and ask

Flag when you see:

- **`canPickOcc` vs R.C.C.** — separate O.C.C. step vs self-contained skill program
- **`forcedOccId`** — which Shadow O.C.C. row holds the R.C.C. package
- **`psionics.capabilityType`** — Psychic Gate bypass (`none`, `innate`, `standard`, …) — see `../psychic_gate.md`
- **Vitals** — `conditional_by_occ_tags` vs flat formulas; align `tags` with O.C.C. `tags`
- **Strength category** — normal vs supernatural vs augmented
- **`lineage`** — `nightbane` vs `megaversal`; `creationSubForgeId` for Morphus Tab 6
- **Multi-genre races** — one row with multiple `gameSystems` vs duplicate rows per line
- **Innate skills** — catalog `skill_*` ids vs percent grants

---

## Two ingest passes

### Pass A — Creation composition (default)

**Goal:** Tab 1 race picker, attribute dice header, vitals ledger seeds, Psychic Gate policy, innate packages.

**Batch size:** **1 race**.

**Schema-required fields:**

- Identity: `id`, `name`, `description`, `raceAudience`, `gameSystems`, `sources`
- `canPickOcc` — `true` (e.g. Human) or `false` (R.C.C.)
- `attributes` — all eight dice keys: `iq`, `me`, `ma`, `ps`, `pp`, `pe`, `pb`, `spd`
- `strengthCategory`, `vitals`, `psionics`, `occLimitations`, `innateSkills`, `innateBonuses`, `demographics`

**R.C.C. additions when `canPickOcc: false`:**

- **`forcedOccId`** — must point at a Shadow O.C.C. row in `occs/<genre>/*.json` (**ingest that row in the same session by default** unless the batch says composition-only race / no Shadow O.C.C.)
- Often: `lineage: "nightbane"`, `creationSubForgeId: "morphus_forge_manifest"` for Nightbane lines

**Default workflow:** Race ingest **includes** the paired Shadow O.C.C. (skills, engines, XP link) in one session. Skip only when the user explicitly says otherwise (e.g. race-only Pass A, or pure monster stat block with no skill program).

**Do not block Pass A on:** deep structured modifier automation in `innateBonuses` when prose + flat bonuses suffice for chargen.

### Pass B — Deep innate modules (optional)

**Batch size:** **1 race**.

Typical keys: structured `innateBonuses.modifiers`, `defaultTraitIds`, `combatContextModifiers`, detailed `occLimitations.forbiddenOccIds`.

---

## Psychic Gate (`psionics` block)

```json
"psionics": {
  "capabilityType": "standard"
}
```

| `capabilityType` | Effect (summary) |
|------------------|------------------|
| `none` | No **latent** psionics; Tab 3 bypasses for mundane O.C.C.s. Psychic O.C.C.s still use `ispEngine`. |
| `innate` | Fixed I.S.P. / powers; gate bypass patterns |
| `standard` | Full Psychic Gate when O.C.C. allows |

See `../psychic_gate.md` for bypass vs pick workflows.

---

## Agent workflow (checklist)

1. Read cited PDF pages.
2. **Flag ambiguity; get user ruling.**
3. Choose **audience pool file** (`player` / `npc` / `gm_approval`).
4. Confirm genre manifest will expose `player` races for target `gameSystems`.
5. Fill **Pass A** required blocks.
6. If R.C.C. (`canPickOcc: false`): **ingest paired Shadow O.C.C. in the same session** (skills, engines, XP link) unless the batch explicitly skips it.
7. Set `forcedOccId` on the race → Shadow O.C.C. `id`; link XP table bidirectionally.
8. Align `occLimitations` / vitals conditionals with O.C.C. `tags` when used.
9. **Update this doc** if precedents changed.
10. Run `npm run validate:schemas`.
11. Do **not** commit unless the user asks.

---

## Validation & tooling

| Command | Purpose |
|---------|---------|
| `npm run validate:schemas` | Race rows + `raceAudience` ↔ pool file consistency |
| `npm run validate:morphus` | When `creationSubForgeId` or morphus traits are touched |

No `audit:races` script yet.

---

## User rulings (precedents)

| Race / topic | Issue | Ruling |
|--------------|-------|--------|
| File layout | Flat pools vs genre | **`<genre>/{player,npc,gm_approval}.json`** (target; loader migration pending) |
| Creation eligibility | Pool vs genre | List `races/{hostGenreId}/player.json`; `npc` / `gm_approval` per genre |
| Megaversal Human | One row vs many | **Same `race_human` id, one row per genre file** — genre-specific `vitals.sdc` overrides + `sources` |
| Nightbane Human (implicit) | Latent Psychic Gate on mundane O.C.C.s | **`psionics.capabilityType: "none"`** — no Tab 3 roll; psychic powers only via psychic / I.S.P. O.C.C.s. Source **p. 34** (Creating a Character), not race sidebar. |
| S.D.C. variance | Per O.C.C. type | **`conditional_by_occ_tags`** per genre; tags must match that genre’s O.C.C. `tags` |
| Paired NPC races | Pilot + construct in one book entry | **Split rows** when stats differ (e.g. `race_namtar` + `race_hollow_man`, `race_nightlord` + `race_nightlord_avatar`). Link via `innateBonuses.metadata.pairedNpcRaceId`, `pairedRaceRole`, and cross-refs in `description` / `classAbilities`. |
| Human-derived R.C.C. (e.g. Priest of Night) | Always human species but own race row | **Separate `race_*` id** (not `race_human`); **`attributes` = human 3D6** baseline; R.C.C. adjustments in **`innateBonuses.modifiers`** + **`classAbilities`** (floors like M.A./P.B. min 18); **`metadata.speciesBaselineRaceId: race_human`**. Vitals encode R.C.C. gifts on top of human formulas (e.g. `3D6+30` S.D.C., `PE+1D6+3D6` H.P.). |
| Shadow O.C.C. pairing | When to ingest with race | **Default: same session** for every `canPickOcc: false` row — add Shadow O.C.C. + `forcedOccId` + XP `occIds` link. Skip only when batch explicitly says race-only or stat-block-only (no skill program). |
| True vampire powers | Shared pp. 183–188 suite | **`races/nightbane/utils/true_vampire_powers.json`** merged at load via `trueVampirePowersModuleId: nightbane_true_vampire` on Master/Secondary/Wild rows; Wampyr excluded. Tier combat/I.S.P. stay on race + shadow O.C.C. `ispEngine`. |
| True vampire powers module audit | pp. 183–188 shared suite | **`classAbilities`** prose audit (21 entries incl. psionic list + Super-Hypnotic + homeland soil); **`sources`** pp. 183–188; **`psionicGrantIds`** unchanged (9 catalog powers at 4th-level potency). No structured `activation` — reference/inspect only until vampire UI calculators. Tier slave caps / telepathic link / slow-kill rolls stay on race metadata. |
| Snake Bird Pass B (gm_approval) | Natural spell caster R.C.C. | **`raceComposition: rcc`**; **`innateBonuses.metadata`** + **`activation`** for poison bite; aerial/ground combat bonuses; shadow **`occ_snake_bird_rcc`** with **`ppeEngine`** and Mystic XP table. Alignment any. |
| Creatures (`creatures.json`) | Non-sentient stat blocks | **`raceAudience: creature`**, **`raceComposition: creature`**, **`canPickOcc: false`**, no **`forcedOccId`**. Natural combat in **`classAbilities`**; optional **`innateSkills`** for flat natural % (e.g. tracking). Example: **`race_waste_coyote`** (p. 168). |
| Waste Coyote Pass B (creature) | Waste predator stat block | **`innateBonuses.metadata`** for natural attacks, pack/ambush tactics, prey/enemy links (`race_hound`, `race_hunter`, `race_lizard_king`); **`excludedAlignments`** (Miscreant predator only). No Shadow O.C.C. |
| Lizard King Pass B (creature) | Ley-line psychic vampire predator | **`innateBonuses.metadata`** for A.R., feeding rules, regen, attack damage breakdown, hunter/minion enmity; reciprocal link with **`race_waste_coyote`**; **`excludedAlignments`** (Diabolic only). No Shadow O.C.C. |
| Doppleganger Pass B | Human-baseline R.C.C. deep modules | **`speciesBaselineRaceId: race_human`**; **`innateBonuses.metadata`** for Earth-double 48h rule, regen, vulnerability multipliers, counterpart fractions; conditional **`save_horror_factor`**; alignment mirror table in **`classAbilities`**; **`occLimitations.forbiddenOccIds`** blocks Nightbane/Guardian O.C.C.s. Minor psychic awakening on shadow **`ispEngine`**. |
| Hound Pass B (npc) | Nightlord minion stat block | **`innateBonuses.metadata`** for A.R., partial invulnerability, vulnerability multipliers, tracking ranges, darkblade spear, XP cap; **`excludedAlignments`** (Diabolic only); links to **`race_hound_master`** / **`race_hunter`**. No Shadow O.C.C. |
| Hunter Pass B (npc) | Aerial Nightlord minion | Same deep-metadata pattern as Hound; **`damageMultiplierArtifactWeaponsAndPowers`** (narrower than Hound); flight/aerial initiative in metadata; links to **`race_hound`** / **`race_hound_master`**. No Shadow O.C.C. |
| Ashmedai Pass B (npc) | Shape-shifting P.P.E. predator | **`innateBonuses.metadata`** + **`activation`** for shape-shift; **`psionicGrantIds`** (five innate powers); S.D.C. penalties by form; NSB kit + Nightbane's Skin; **`excludedAlignments`** blocks good/neutral only (Miscreant/Aberrant allowed). No Shadow O.C.C. |
| Namtar Pass B (npc) | Beetle pilot + Hollow Man builder | **`pairedNpcRaceId: race_hollow_man`**; **`activation`** for 4D6-hour build; construct vitals/repair/H.F. tiers in metadata; NSB kit; **`excludedAlignments`** (Diabolic/Miscreant only). No Shadow O.C.C. |
| Hollow Man Pass B (npc) | MIB construct shell | **`pairedNpcRaceId: race_namtar`**; construct-only vitals (no H.P., −25 S.D.C. threshold); illusion immunity; **`hth_expert`**; P.P.E./skills on pilot row. No Shadow O.C.C. |
| Nightlord Pass B (npc) | Ba'al arch-villain | **`innateBonuses.metadata`** + **`activation`** for life-force feeding; matter/energy control constants; Mirrorwall/minion-send costs; **`pairedNpcRaceId: race_nightlord_avatar`**; commanded-forces links; **`excludedAlignments`** (evil only). No Shadow O.C.C. |
| Nightlord Avatar Pass B (npc) | Ba'al extension | **`pairedNpcRaceId: race_nightlord`**; **`inheritsPowersFromParentRaceId`**; Physical/Astral types; reduced regen/P.P.E.; destruction backlash metadata; shared feeding **`activation`**. No Shadow O.C.C. |
| Night Prince Pass B (gm_approval) | Ba'al-Zebul lieutenant R.C.C. | **Moved from `npc.json`**; **`raceComposition: rcc`**; **`innateBonuses.metadata`** + **`activation`** for illusion tiers; shadow **`occ_night_prince_rcc`** + **`nightbane_core_night_prince_vampire`** XP link; PC at G.M. discretion. |
| Hound Master Pass B (gm_approval) | Elite Hound R.C.C. | **`raceComposition: rcc`**; **`innateBonuses.metadata`** + **`activation`** for Illusion Shells; **`upgradeFromRaceId: race_hound`**; shadow **`ispEngine`** grants Mind Block + Empathy; +2 initiative in metadata. |
| Priest of Night Pass B (npc) | Human cult fanatic R.C.C. | **`raceComposition: rcc`**; **`speciesBaselineRaceId: race_human`**; Gift of Power floors/bonuses in **`innateBonuses.metadata`**; **`activation`** for superhuman strength (2 P.P.E./minute); **`recruitedByRaceIds`** on Avatar/Night Prince; shadow **`occ_priest_of_night_rcc`** + **`nightbane_core_priest_of_night`** XP link; **`excludedAlignments`** (Diabolic/Miscreant only). NPC villain — stays in **`npc.json`**. |
| Master Vampire Pass B (npc) | First-generation undead R.C.C. | **`raceComposition: rcc`**; tier combat/I.S.P. in **`innateBonuses.metadata`** + **`modifiers`**; **`activation`** for slow-kill creation; master-only telepathic link/slave cap; **`trueVampirePowersModuleId`** + shared module merge; hierarchy links to **`race_secondary_vampire`** / **`race_wild_vampire`**; shadow **`occ_master_vampire_rcc`** + **`nightbane_core_night_prince_vampire`** XP link; **`excludedAlignments`** (evil only). NPC villain — not recommended as P.C. |
| Secondary Vampire Pass B (player) | Second-generation optional P.C. R.C.C. | **`raceComposition: rcc`**; tier combat/saves in **`innateBonuses.metadata`**; **`activation`** for inconsistent slow-kill outcomes (secondary/wild/wampyr roll); master mind-control susceptibility; frozen skills/magic; **`hierarchyMasterRaceId: race_master_vampire`**; shadow **`occ_secondary_vampire_rcc`** + shared vampire module; P.C. max good **Unprincipled**. |
| Wild Vampire Pass B (player) | Third-generation optional P.C. R.C.C. | **`raceComposition: rcc`**; tier combat/saves in **`innateBonuses.metadata`**; **`activation`** for wild-only slow kill; starvation/secondary creation origins; **`hierarchySecondaryCreatorRaceId`**; Nightlord minion hunt links; shadow **`occ_wild_vampire_rcc`** + shared vampire module; P.C. max **Anarchist**; no pre-rebirth magic. |
| Wampyr Pass B (player) | Slow-kill aberration P.C. R.C.C. | **`raceComposition: rcc`**; **`excludedFromTrueVampirePowersModule`** (not merged with `nightbane_true_vampire`); **`innateBonuses.metadata`** + **`activation`** for sunlight; vampire-hunter lore; anti-taboo immunities; shadow **`occ_wampyr_rcc`** + **`nightbane_core_wampyr`** XP link; **`excludedAlignments`** (Principled only). |
| Guardian Pass B (player) | Light-energy protector R.C.C. | **`raceComposition: rcc`**; P.P.E. power constants in **`innateBonuses.metadata`** + **`activation`** for Healing Touch; light/nullify/flight costs; light-deprivation/Nightlands rules; master psionic grant list; shadow **`occ_guardian_rcc`** + **`nightbane_core_nightbane_guardian`** XP link; **`excludedAlignments`** (Principled/Scrupulous only). |
| Nightbane Pass B (player) | Dual-form flagship R.C.C. | **`creationSubForgeId: morphus_forge_manifest`**; Facade/Morphus split in **`innateBonuses.metadata`** (vitals, saves, combat); **`activation`** for Mirror Walk; Becoming/Talents/P.P.E. constants; **`canPickOcc: true`** + **`allowedOccIds`** skill packages (no single `forcedOccId`); shared XP **`nightbane_core_nightbane_guardian`**. Catalog id **`race_nightbane`**. |
| BTS Mountebank (ingest scope) | GM-approval vs NPC pool | **`npc.json`** — no explicit GM-approval PC note; XP column exists but treat as NPC bandit stat block. Deferred to separate NPC brief. |
| BTS Tarantuloid (gm_approval) | Warrior vs sorcerer-priest | **One `race_tarantuloid` row**; shadow **`occ_tarantuloid_rcc`** **`specializations[]`** (ADA Field Agent pattern): Warrior/Craftsman vs Sorcerer-Priest. Warrior XP **`nightbane_core_snakebird_mystic`**; Sorcerer-Priest XP **`nightbane_core_nightbane_guardian`**. |

---

## Reference examples

| Artifact | Pattern |
|----------|---------|
| `palladium-race.example.json` | Human — `canPickOcc: true` |
| `palladium-race.example-rcc.json` | Guardian R.C.C. — `forcedOccId`, innate I.S.P. |
| `races/<genre>/player.json` | Playable pool per genre (e.g. `races/nightbane/player.json`) |

---

## Do not

- Put a row in the wrong audience file (`raceAudience` mismatch).
- Set `forcedOccId` without a real Shadow O.C.C. row.
- **Guess** attribute dice or vitals formulas.
- Hide creation-blocked races without grey-out reason (Pillar 8) when UI lists them.
- Skip `npm run validate:schemas` after edits.

---

## Related docs

- `docs/ingest/occs.md` — Shadow O.C.C. pairing
- `../psychic_gate.md` — `psionics.capabilityType`
- `../stat_engine_spec.md` — racial bonuses at spawn
- `../forge/morphus_creation.md` — Tab 6 when `creationSubForgeId` set
- `../character_creation.md` — Tab 1 configurator
- `.cursorrules`
