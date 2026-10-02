# Unified Path Registry

> **Pillar 9** (`docs/vision.md`) — Facade, Morphus, and dual-form variants are **modes on one pipeline**, not parallel implementations.  
> **Purpose:** Track every consolidated single-path feature so new work extends existing builders instead of forking per-stat or per-form code.

**Update this document** whenever you introduce a new unified pathway or add a stage to an existing one.

---

## When to use a unified path

| Do | Don't |
|----|-------|
| Add a new stat row via the domain's `build*Line` helper | Inline `{ label, value, hint }` objects in orchestrators |
| Pass a **mode** (`facade_relative`, `combat`, `none`) to one diff function | Copy-paste four Morphus-vs-Facade helpers per section |
| Route tooltips through the domain's single dispatcher | Add a one-off `formatFooTooltip` beside the shared formatter |
| Render all rows through one UI row component | Maintain separate "simple" and "extended" row renderers for the same schema |

---

## Entry template

Copy this block when registering a new unified path:

```markdown
### [Feature domain name]

**Status:** `complete` | `partial` | `planned`  
**Related spec:** `docs/…`

| Stage | Module | Entry point(s) | Notes |
|-------|--------|----------------|-------|
| Math | | | |
| Assembly | | | |
| Tooltip / diff | | | |
| UI render | | | |
| Orchestration | | | |

**Modes / variants:** …  
**Extension guide:** …
```

---

## Registry

### Creation ledger resolution (Pillar 9 — one source, many views)

**Status:** `partial` (Facade + Morphus attributes + vitality gather-first; combat/saves stacks wired)  
**Related spec:** `docs/stat_engine_spec.md`, `docs/unified_paths.md`

| Stage | Module | Entry point(s) | Notes |
|-------|--------|----------------|-------|
| Canonical row | `src/lib/ledgerRowResolution.ts` | `ResolvedLedgerRow`, `LedgerContribution`, `sumResolvedRowTotal` | Single gather pass per stat; contributions are source of truth |
| Attribute resolution | `src/lib/resolveCreationLedgerContext.ts` | `resolveFacadeAttributeRows`, `resolveMorphusAttributeRows` | Facade resolves first; Morphus builds on Facade totals |
| Vitality resolution | `src/lib/resolveVitalityLedgerRows.ts` | `resolveVitalityLedgerRows` | Contributions-first gather for H.P., S.D.C., P.P.E., I.S.P., Morphus vitals |
| Bundle | `src/lib/spawnDiceBlocks.ts` | `buildCreationLedgerResolutionBundle` | Live Ledger + Review tab share one bundle |
| Context assembly | `src/lib/resolveCreationLedgerContext.ts` | `resolveCreationLedgerContext`, `resolveCreationLedgerBundle` | Merges attribute + vitality rows; projects pending blocks |
| Projections | `src/lib/ledgerRowResolution.ts` | `projectFacadeAttributeLine`, `projectMorphusAttributeLine`, `projectVitalityLine`, `projectDiceGroups`, `projectPendingDiceBlockFromRow`, `resolveStackLedgerRow`, `projectStackLine` | Views only — never re-gather |
| Stack rows (combat/saves) | `src/lib/creationLiveLedger.ts` | `projectCombatStackLine`, `saveLineWithAttribution` | Saves + combat lines project from `resolveStackLedgerRow` |

**Modes / variants:**

- **Facade attributes / vitals:** `formScope: 'facade'`
- **Morphus attributes / vitals:** `formScope: 'morphus'`; Morphus dice isolated from Facade dice sub-rows
- **Review tab:** `PendingDiceBlock` is a projection via `projectPendingDiceBlockFromRow`, not a parallel model

**Extension guide:**

1. Add sources as `LedgerContribution` entries in a resolver — not in UI or tooltip formatters.
2. Add UI surfaces as projection functions alongside existing `project*` helpers.
3. Prefer `buildCreationLedgerResolutionBundle` over ad-hoc `buildPendingDiceBlocks` + separate row math.
4. Facade row must resolve before Morphus row when Morphus uses a Facade base (`facade_base` contribution).

**Tests:** `src/lib/ledgerRowResolution.test.ts`, `src/lib/resolveCreationLedgerContext.test.ts`, `src/lib/resolveVitalityLedgerRows.test.ts`

---

### Live Ledger — creation preview rows

**Status:** `complete` (Facade + Morphus parity)  
**Related spec:** `docs/stat_engine_spec.md`, `docs/live_ledger.md`

| Stage | Module | Entry point(s) | Notes |
|-------|--------|----------------|-------|
| Math | `src/lib/creationStatEngine.ts` | `buildCreationStatStack`, `statStackTotal`, `resolveExceptionalDisplayValue` | Single stack model for attributes, vitals, saves, combat, exceptional, APM |
| Row assembly | `src/lib/ledgerLineBuilder.ts` | `buildCreationLedgerLine`, `buildFacadeAttributeLedgerLine`, `buildVitalityLedgerLineFromBlock`, `buildStackBonusLedgerLine`, `buildExceptionalStackLedgerLine`, `buildFlatSourceLedgerLine`, `buildNaturalArmorLedgerLine` | All sections produce `CreationLedgerLine` |
| Tooltip | `src/lib/ledgerLineBuilder.ts` | `formatLedgerTooltip` | **Only** string emitter for live-ledger value tooltips; all rows pass a `LedgerTooltipSpec` through `buildCreationLedgerLine` |
| Vitality formatter | `src/lib/spawnDiceBlocks.ts` | `formatVitalityBlockValueTooltip` | Implementation detail invoked by `vitality_block` spec (Review tab `flatTooltip` uses the same function) |
| Morphus diff | `src/lib/morphusCreationLedger.ts` | `applyMorphusLedgerDiff`, `applyMorphusLedgerGroupDiff` | Modes: `facade_relative` (vitals, exceptional), `combat`, `none` (saves pass-through) |
| UI render | `src/components/creation/LedgerStatGrid.tsx` | `LedgerStatRow` (via `LedgerStatGrid`) | One row renderer; sub-row shows **dice groups only**; value hover shows full breakdown |
| Display policy | `src/lib/ledgerLineBuilder.ts` | `applyLedgerRowDisplayPolicy`, `buildCreationLedgerLine` | Strips breakdown hints; merges `pendingBlock.groups` → `diceGroups` |
| Orchestration | `src/lib/creationLiveLedger.ts` | `buildCreationLiveLedgerSnapshot` | Facade and Morphus share section builders; Morphus branch applies diff only |

**Modes / variants:**

- **Facade (primary):** section builders run with primary effective attributes.
- **Morphus:** attribute block from `buildMorphusCreationAttributeBlock`; sections rebuilt with Morphus attrs; diff pass highlights deltas vs Facade.
- **Single-form races:** Morphus stages skipped; no diff pass.

**Extension guide:**

1. Add or extend a stack term in `buildCreationStatStack` (math).
2. Assemble the row through the appropriate `build*LedgerLine` helper — not inline in `creationLiveLedger.ts`.
3. Pass a `LedgerTooltipSpec` to `buildCreationLedgerLine` — never pre-build `valueTooltip` strings in orchestrators.
4. Add a `LedgerTooltipSpec` kind only if no existing kind fits; wire it in `formatLedgerTooltip`.
5. If Morphus needs delta highlighting, use `applyMorphusLedgerDiff` with the correct mode — do not add a section-specific diff helper.
6. UI changes belong in `LedgerStatRow` only.
7. **Never set breakdown `hint` text** — flats/constants belong in `valueTooltip`; only `diceGroups` (or short context labels like `Immune`) may appear under the row. `buildCreationLedgerLine` enforces this via `applyLedgerRowDisplayPolicy`.

**Tests:** `src/lib/ledgerLineBuilder.test.ts`, `src/lib/creationLiveLedger.test.ts`, `src/lib/morphusCreationLedger.test.ts`, `src/lib/creationOccLedger.test.ts`

---

### Stat stack math (core engine)

**Status:** `complete` for creation Live Ledger; live sheet may still have legacy call sites  
**Related spec:** `docs/stat_engine_spec.md` §3

| Stage | Module | Entry point(s) | Notes |
|-------|--------|----------------|-------|
| Stack terms | `src/lib/creationStatEngine.ts` | `buildCreationStatStack`, `StatStackTerm`, `statStackToLedgerLines` | Buckets: `race`, `occ`, `skill`, `hth`, `exceptional`, `trait`, `misc`, … |
| Save attribution | `src/lib/saveProfile.ts` | `creationLedgerSaveModifierAttribution`, `computeHorrorFactorAura` | Per-source breakdown for saves and H.F. |
| Attribute bonuses | `src/lib/attributeBonuses.ts` | `get*Bonuses` | Exceptional (17–30) and super (31+) tables |

**Extension guide:** New modifier sources become stack terms or flat attribution entries — not ad-hoc totals in UI code.

---

### Pending dice & vitality blocks

**Status:** `complete` for creation  
**Related spec:** `docs/stat_engine_spec.md` §3.3, `docs/forge/character_creation.md` Tab 5–6

| Stage | Module | Entry point(s) | Notes |
|-------|--------|----------------|-------|
| Block schema | `src/lib/spawnDiceBlocks.ts` | `buildPendingDiceBlocks`, `PendingDiceBlock`, `pendingDiceBlockRunningTotal` | Shared with Review tab and Live Ledger |
| Vitality formulas | `src/lib/ledgerVitalFormula.ts` | `resolvePpeCreationFormula`, `formatVitalityBlockValueTooltip` | Formula parts + flat terms |
| Ledger row | `src/lib/ledgerLineBuilder.ts` | `buildVitalityLedgerLineFromBlock` | Pending-roll yellow state via `resolveLedgerHasPendingRolls` |

**Modes / variants:** Facade dice (Tab 5), Morphus dice (Tab 6 when dual-form).

---

### Genre middleware (presentation layer)

**Status:** `complete`  
**Related spec:** `docs/vision.md` §Centralized Pipeline Transformation, `docs/master_flow.md`

| Stage | Module | Entry point(s) | Notes |
|-------|--------|----------------|-------|
| Transform | `src/lib/genreTransformer.ts` | (derived view model from save + `hostGenreId`) | UI never computes cross-genre conversions |
| Components | React views | Consume pre-translated payload | "Dumb UI" — Pillar 9 aligned with architecture §3 |

---

### Movement derivation

**Status:** `complete`  
**Related spec:** `docs/movement_engine_spec.md`

| Stage | Module | Entry point(s) | Notes |
|-------|--------|----------------|-------|
| Derivation | `src/lib/movementDerivation.ts` (or `characterDerived.ts`) | Form-gated speed pipelines | Land / swim / fly / leap from one middleware layer |
| UI | Live sheet components | Render final payload only | No inline Spd×5 math in components |

**Modes / variants:** `activeForm` gates which attribute pool feeds movement.

---

### Campaign Creation Forge

**Status:** `partial` (v1 Identity: unique name + host genre; Rules: conversion policy)  
**Related spec:** `docs/gm_hub.md`, `docs/app_viewport_launcher.md` Vector C

| Stage | Module | Entry point(s) | Notes |
|-------|--------|----------------|-------|
| Registry | `src/lib/gm/campaignForge.ts` | `CAMPAIGN_FORGE_OPTIONS`, `campaignForgeReady` | Add options here; do not fork a second create form |
| Field render | `src/components/gm/CampaignForgeField.tsx` | `kind: text \| genreSelect \| select` | New `kind`s get a renderer case; dropdowns use `select` + `choices` |
| Viewport | `CampaignCreationForge` | Confirm Yes / Not yet | Commit via `commitCampaignForge` then `enterGmHub` |

**Modes / variants:** One draft (`CampaignForgeDraft`) for all campaign options. Extra groups may become UFNE tabs later.

**Extension guide:** New campaign questions are new `CampaignForgeOptionDef` rows (and a `kind` if the field UI is new). Conversion-style dropdowns reuse `kind: 'select'`. Validation stays on the option, not in the React screen.

---

### GM Hub — party observer + combat roster

**Status:** `partial` (local GM + interim same-WiFi join; production desktop WS sidecar not shipped)  
**Related spec:** `docs/gm_hub.md`

| Stage | Module | Entry point(s) | Notes |
|-------|--------|----------------|-------|
| Transform | `src/utils/genreTransformer.ts` | `transformCharacterToHostEnvironment` | Session `hostGenreId`; saves never written |
| Party assemble | `src/lib/gm/partyObserver.ts` | `buildPartyObserverSlice` | Facade / Morphus is a `viewForm` mode on one builder; joiner `party.snapshot` cache feeds the same builder; summary fields include attributes, PPE/ISP, HtH, Abilities |
| Campaign PC history | `src/lib/gm/campaignPcHistory.ts` | `upsertCampaignPcHistory`, `deleteCampaignPcHistoryEntry`, `setCampaignPcHistoryComment` | Unique spawned PCs per campaign (`isFinalized`); latest snapshot only; GM comment; persists on `pds:gmSession:*` |
| Fodder | `src/lib/gm/npcInstance.ts` | `createNpcFromArchetype` | Encounter catalog → instance vitals / APM |
| Roster | `src/lib/gm/combatRoster.ts` | `assembleGmCombatRoster`, `sortCombatRoster` | One sorted list; `kind: pc \| npc` |
| Nav | `src/lib/gm/hubTabs.ts` + `hubTableChrome.ts` + `hubNavigation.ts` | `buildGmHubTabViews`, `gmHubTabTitle`, `gmHubModeLabel`, `defaultHubTabForMode`, `navigateHubTarget` / `hubNavTargetForContentKind`, table control / Players overlay helpers | Lane-specific tabs: Narrative Story Beats/People/Places/Things/Notes; Combat Melee/Prefabs; optional People `attention` blink; Notes links force Narrative (never People from Combat) |
| Notes links | `src/lib/gm/contentLinks.ts` + `contentLinkEditorDom.ts` + `narrativePlaceholders.ts` | `segmentContentLinks`, `contentLinksDisplayText`, `findActiveMention`, `replaceMentionWithContentLink`, `searchAllLinkableEntities`, `resolveContentLinkTarget`, `createPlaceholderEntity` | Structured `[[kind:id\|label]]` storage; UI shows clickable labels via shared contentEditable; `@` mention typeahead; `pc` kind resolves joined + **campaign history** PCs; navigate → People → PCs auto-pins history summary (`GmCampaignPcHistorySection` + `hubFocus`); placeholder store; Create? stubs; Radical Visibility for missing targets |
| UI | `src/components/gm/*` | `GmHubShell`, `GmHubContentPane`, `GmTabBar`, `GmPeoplePanel`, `GmPartyPanel`, `GmCampaignPcHistorySection`, `GmThingsPanel`, `GmCombatPanel`, `GmContentLinkedNotesField`, `GmNotesScratchpad`, `GmPlaceholderLane`, `hubTableChrome.ts`, shared `PortalChromeActions` | Compact top nav (no bottom bar); shared content pane scrolls under anchored chrome; Return + Settings icons; units in Settings; Narrative / Combat lane tabs; People/PCs blink on joiner attach; PCs = At the table + Campaign history; Melee dropdowns add from People data; shared content-linked notes on Notes / Story Beats / Places / Things / People / cast stubs |
| Play sitting | `src/lib/gm/playSession.ts` | `openPlaySession`, `playSessionPlayerLabel` | UI **Open Table** stamps sitting + starts listen; date label is event-log / uniqueness (Join Session shows campaign name only) |
| Session mutators | `src/lib/gm/sessionModel.ts` | `emitHorrorFactor`, `spendNpcApm`, … | H.F. records saves; does not spend PC APM |
| Protocol | `src/lib/gm/sessionMessages.ts` | `createGmEnvelope`, `gmHelloPayloadFromCampaign` | v1 envelopes including join/presence + combat |
| Presence | `src/lib/gm/sessionPresence.ts` + `sessionHostRuntime.ts` | `grantOrReclaimSeat`, `seatTrayPresentation`, `seatFlippedToFullyJoined`, `createGmHostRuntime` | Ephemeral seats; yellow joining / green joined tray tokens |
| People blink | `src/lib/gm/partyBlink.ts` | `nextPartyTabBlink`, `partyTabBlinkAfterTabChange`, `partyTabBlinkAfterCharactersSubTabChange` | Hub chrome only; clears on Narrative → People → PCs / Close Table |
| Transport | `src/lib/gm/browserWsTransport.ts` + interim `ws` host | `createBrowserWsTransport`, `npm run gm:ws-host`, `GET /sessions`, `GET /discover` | Interim same-WiFi; desktop sidecar later |
| Discovery | `src/lib/gm/sessionDiscovery.ts` + `browserLanHints.ts` | `listLanSessions` → local `/discover` (UDP + TCP + lanHints) + browser `/24` probe | Join Session browse; **campaignName** display only; Advanced IP = failure mode only (does not rebind browse) |
| Join UX | `GmJoinHostChrome`, `GmJoinTableViewport` | hub **Open Table** → **Table Open** hover **Players in Session** overlay (Close Table inside); launcher **Join table** → name + characters (spawned + drafts; default Select a character) + **Create new character** + Join Session list → sheet / forge | One People pipeline — no remote fork; PCs = joined seats + campaign history; NPCs = local-machine adds + archetypes; host Advanced code/QR hidden this pass (listen intact); player Advanced code/IP = failure fallback; shared client runtime survives sheet handoff; Return to launcher confirms Close Table (GM) / leave (player) |
| Leave / party | `sessionHostRuntime` + `joinTableLeave.ts` | `applyPartyDetach`, `playerNameForPartyCharacter`, `joinedPartyCharacterIds` | Leave/kick/Close Table clear seat + party id + joiner cache (no Missing saves phantoms) |
| Melee engagement | `src/lib/gm/meleeEngagement.ts` + `combatRoster.ts` | `listMeleePcCandidates`, `listMeleeNpcCandidates`, `addCharacterToMelee`, `assembleGmCombatRoster` | Opt-in roster from People data; no Combat People tab |
| Gear grant | `src/lib/gear/gmGearForgeHost.ts` + `customGearLibrary.ts` + `gmCharacterInventoryGrant.ts` | `buildGmGearForgeAdapter` | Things → Gear → My Custom Gear lists; optional push to character save; Quick-Blocks blocked (no inventory) |

**Modes / variants:** Hub `story` (chrome **Narrative**) / `combat` (distinct tab sets; People is Narrative-only; Melee reuses party/NPC ids via engagement lists). Party `viewForm` (`primary` / `morphus`). Combatant `kind` (`pc` / `npc`) on one roster renderer. Gear uses the shared `GearForgeShell` (`kind: 'gm'`) under Things — do not fork a GM-only forge. Join is a transport/presence mode on this path — not a second People implementation.

**Extension guide:** Add observer fields in `buildPartyObserverSlice`, not in tab components. Campaign history cards rebuild from the same builder (store character JSON + comment on `campaignPcHistory` — do not fork a second summary assembler). Add combatant columns on `GmCombatRosterRow` rather than forking PC vs NPC tables. Do not fork People panels. Melee engagement stays on `meleeEngagement` + shared roster assembler — never a second combatant list. Notes content links go through `hubNavigation` / `navigateHubTarget` — never open People from Combat. Extend `contentLinks` + `GmContentLinkedNotesField` for mention/render UX — do not fork per-tab editors or per-kind typeahead pipelines. New join envelopes stay on `sessionMessages` v1.

---

### Combat Home category bubbles

**Status:** `partial`  
**Related spec:** `docs/ui_wireframe.md` §3, `docs/combat_logic.md` §3

| Stage | Module | Entry point(s) | Notes |
|-------|--------|----------------|-------|
| Era / glyph | `src/lib/combatWeaponSlots.ts` | `resolveWeaponCombatEra`, `hostGenreOffersModernWeapons`, `combatWeaponGlyphId` | One classifier for Unarmed / Ancient / Modern |
| Weapon math | `src/lib/weaponBonuses.ts` | `computeWeaponProfileBonuses` | Same profile as strike cards |
| Unarmed math | `sheetCombatDerived` + `handToHandCombatProfile` | Live stack totals + HtH accumulation | Initiative in APM header; Unarmed label = active HtH name |
| UI | `CombatCategoryBubble` | Collapsed summary + Expand | One shell for all three categories |

**Modes / variants:** Facade/Morphus via existing live stack. Modern bubble is always shown: empty = grayed (Gear explanation); a carried firearm remains usable even when `hostGenreOffersModernWeapons` is false. Owned HtH styles: `listOwnedHandToHandStyles` → Combat Unarmed expand + Skills tab (`HandToHandStylePicker`); `activeCombatHandToHandSkillId` selects among them on **Facade only**. Nightbane **Morphus** always resolves innate `hth_martial_arts` from `nightbane_base_morphus.json` — independent of Facade O.C.C. Hand-to-Hand.

---

### Gear Forge (inventory)

**Status:** `partial`  
**Related spec:** `docs/forge/gear_forge.md`, `docs/inventory_weapons.md`

| Stage | Module | Entry point(s) | Notes |
|-------|--------|----------------|-------|
| Lane nav | `src/lib/forgeNavigation/gearForge.ts` | `buildGearForgeLaneViews` | Weapons / Armor / Artifacts / Other — stubs stay visible |
| Weapons era sub-tabs | `src/lib/forgeNavigation/gearForgeWeapons.ts` | `buildGearForgeWeaponsSubTabViews` | Ancient (live) / Modern (visible stub) inside Weapons only |
| Host adapter | `src/lib/gear/gearForgeHost.ts` | `GearForgeHostAdapter` | `library` \| `creation` \| `sheet` \| `gm` |
| Creation host | `src/lib/gear/creationGearForgeHost.ts` | `buildCreationGearForgeAdapter` | `tab8_gear` → draft inventory |
| Sheet host | `src/lib/gear/sheetGearForgeHost.ts` | `buildSheetGearForgeAdapter` | Live `GearPanel` → active inventory |
| GM host | `src/lib/gear/gmGearForgeHost.ts` | `buildGmGearForgeAdapter` | Things → Gear → My Custom Gear library; optional character push |
| Inventory commit | `src/lib/gear/inventoryWeaponCommit.ts` | `createInventoryWeaponFromPiece` | Shared grant/patch for creation / sheet / GM |
| GM save grant | `src/lib/gear/gmCharacterInventoryGrant.ts` | `addWeaponToCharacterSave`, `gmGearLibraryBlockedReason` | Optional push write-back; library saves never gated |
| Custom library | `src/lib/gear/customGearLibrary.ts` | `saveCustomGearWeapon`, `listLibraryWeaponsAsInventory` | Portal My Custom Gear + GM Things → Gear |
| Permanent delete confirm | `src/lib/gm/permanentDeleteConfirm.ts` | `confirmPermanentDelete` | Hub stubs / custom gear Delete dialogs |
| Property stack | `src/lib/weaponForgeProperties.ts` | `Weapon.forgeProperties` | Indestructible / quality / multipliers / triggers |
| UI shell | `src/components/gear/GearForgeShell.tsx` | Portal + creation + sheet + GM `GmGearPanel` | One shell for all hosts |

**Modes / variants:** One shell for all hosts. Portal commits to library; creation and sheet commit to character inventory (draft vs active); GM Things → Gear commits to the same My Custom Gear library, with optional push copies onto a selected party character save (push never gates library saves). Cast Quick-Blocks have no inventory yet (visible why-disabled). Do not fork lane editors per host.

---

## Planned / partial paths

Track work here until promoted to the registry above.

| Domain | Gap | Target unified entry |
|--------|-----|----------------------|
| Live sheet combat HUD | Strike cards still assemble some fire-mode math in the component | Keep feeding `computeWeaponProfileBonuses` / fire-mode helpers |
| Skill percent display | Master Equation in `skill_selection.md` | Single `buildSkillPercentLine` when creation sheet gets parity rows |

---

### Measurement units (Standard ↔ Metric)

**Status:** `partial` (engine + preference + Gear Forge wired; catalog dual backfill ongoing)  
**Related spec:** `docs/units_preference.md`, `docs/ingest/units.md`

| Stage | Module | Entry point(s) | Notes |
|-------|--------|----------------|-------|
| Math | `src/lib/units/convert.ts` | gross factors + rounding | Yard ladder only when book used yards |
| Resolve | `src/lib/units/resolve.ts` | `resolveLength`, `resolveWeight`, `resolveTemperature`, … | Book dual preferred; fill when one side missing |
| Format | `src/lib/units/format.ts` | `formatLength`, `weightUnitLabel`, … | Structured fields only — no prose rewrite |
| Ingest parse | `src/lib/units/parse.ts` | `parseLengthFromProse`, … | Dice lengths ignored for now |
| Preference | `src/lib/units/preference.ts` + `UnitsPreferenceContext` | `localStorage` `pds:unitsPreference` | Per-user/device; not in character saves |
| Schema | `palladium-units.schema.json` | `#/$defs/*Measure` | Shared dual structures |
| UI | `UnitsPreferenceToggle` inside `AppSettingsDialog` | Via shared `PortalChromeActions` Settings gear on launcher / sheet / Hub / campaign forge / gear forge / join table; Gear Forge field labels still use preference | |

**Modes / variants:** `standard` \| `metric`  
**Extension guide:** Add new quantity kinds to schema `$defs` + convert/resolve/format; wire UI through `useUnitsPreference` — never fork per-form converters.

**Tests:** `src/lib/units/units.test.ts`

---

### Portal chrome (Return + Settings)

**Status:** `complete`  
**Related spec:** `docs/app_viewport_launcher.md`, `docs/units_preference.md`, `docs/gm_hub.md`

| Stage | Module | Entry point(s) | Notes |
|-------|--------|----------------|-------|
| Icons | `src/components/chrome/PortalChromeIcons.tsx` | `ReturnToLauncherIcon`, `SettingsGearIcon` | One SVG pair |
| Actions | `src/components/chrome/PortalChromeActions.tsx` | `PortalChromeActions` | Exit + Settings; tones `dark` / `sheet` / `morphus` |
| Settings | `src/components/chrome/AppSettingsDialog.tsx` | units dial | App-global only — do not invent per-viewport settings |
| Hosts | Hub / launcher / sheet / campaign forge / gear forge / join table | same component | Launcher: Settings only (`showReturn={false}`) |

**Modes / variants:** Tone is a presentation mode on one control — do not fork per-viewport exit/settings buttons. Confirm dialogs for leave/Close Table stay on the host `onReturnToLauncher` callback.

**Extension guide:** New viewports that need exit or units mount `PortalChromeActions`; do not reintroduce text **Portal** / **Return to launcher** buttons or header `UnitsPreferenceToggle`s.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-10-02 | GM Hub shared `GmHubContentPane`: hub chrome anchored; all Narrative/Combat workspace tabs scroll in one content pane (no per-tab overflow fork) |
| 2026-09-29 | Portal chrome unified: `PortalChromeActions` Return + Settings icons on launcher / sheet / Hub / campaign forge / gear forge / join table; units only in Settings |
| 2026-09-29 | GM Hub compact chrome: top nav only; Return + Settings icons; units in Settings; Open Table → Table Open hover Players overlay; host Advanced UI hidden |
| 2026-09-28 | Join Table backlog: Open Table stamp matches publish; leave/kick/Close Table detach party+cache; Party = joined + player name; Cast hosts local add; Return to launcher confirms Close/leave |
| 2026-09-25 | GM Hub client join first slice: interim `ws`, presence/join envelopes, Join table viewport, interacting sheet |
| 2026-09-21 | Measurement units path: Standard/Metric preference, dual measure schema, Gear Forge convert-on-edit |
| 2026-10-01 | GM Things → Gear: library-first My Custom Gear saves; optional character push; Delete + permanent confirm on Hub stubs/custom gear |
| 2026-09-18 | Gear Forge GM host: Hub **Gear** tab + `kind: 'gm'` adapter on shared shell → selected party character save |
| 2026-09-18 | Gear Forge Sheet host: live `GearPanel` + `kind: 'sheet'` adapter on shared shell → active inventory |
| 2026-09-16 | Gear Forge Creation host: `tab8_gear` + `kind: 'creation'` adapter on shared shell; Review → `tab9_review` |
| 2026-10-01 | GM Hub content-link labels: shared `GmContentLinkedNotesField` renders clickable names (not raw `[[…]]`) on Notes, Story Beats, Places/Things/People stubs, and cast notes |
| 2026-10-01 | GM Hub Notes `@` mention typeahead: primary authoring via `findActiveMention` + `searchAllLinkableEntities`; storage stays `[[kind:id\|label]]` |
| 2026-10-01 | GM Hub Notes content links: `[[kind:id\|label]]`, placeholder store, shared `hubNavigation` (no Narrative/Combat fork) |
| 2026-10-01 | GM Hub lane tabs: Narrative Story Beats/People/Places/Things/Notes; Combat Melee/Prefabs; Melee dropdowns from People data |
| 2026-08-30 | GM Hub Story/Combat master tabs (Home + Party + Cast), matching live sheet |
| 2026-08-30 | Play sessions: Open Session stamps `{campaign}: {date}` join name; Sessions landing drops saved-tables / passive matrix |
| 2026-08-30 | Campaign Creation Forge: conversion rules dropdown (baked in; Sessions is read-only) |
| 2026-08-30 | Campaign Creation Forge registry (identity: unique name + host genre) |
| 2026-08-30 | GM Hub party observer + combat roster (local v1) |
| 2026-07-05 | Vitality gather-first via `resolveVitalityLedgerRows`; combat/saves project through `resolveStackLedgerRow` + `projectStackLine` |
| 2026-07-05 | Vitality pending blocks projected from `ResolvedLedgerRow`; `refreshMorphusAttributeRowsInContext` avoids full bundle rebuild on Morphus ledger |
| 2026-07-05 | Creation ledger resolution layer: `ResolvedLedgerRow` + projections; vitality rows from pending blocks; `buildCreationLedgerResolutionBundle` |
| 2026-07-05 | Tooltip path consolidation: removed parallel `valueTooltip` / `valueTooltipOverride` bypasses; all live-ledger tooltips route through `formatLedgerTooltip` |
| 2026-07-05 | Initial registry: Live Ledger full parity (Pillar 9), stat stack, pending dice, middleware, movement |
