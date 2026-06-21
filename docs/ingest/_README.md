# Content ingest playbooks

Pass A/B workflows, batch templates, and validation commands for catalog JSON authoring.

**Multi-batch orchestration:** [`orchestrator.md`](orchestrator.md) · brief input format [`brief-format.md`](brief-format.md) · files in `src/data/source/ingest-briefs/`

| Catalog | Playbook | Content path |
|---------|----------|--------------|
| Skills | [`skills.md`](skills.md) | `src/data/content/skills/*.json` (category files) |
| Hand-to-Hand | [`hth.md`](hth.md) | `src/data/content/skills/hand_to_hand.json` |
| Weapon proficiencies | [`weapon_proficiencies.md`](weapon_proficiencies.md) | `src/data/content/skills/weapon_proficiencies.json` |
| Magic | [`magic.md`](magic.md) | `src/data/content/magic/` |
| Psionics | [`psionics.md`](psionics.md) | `src/data/content/psionics/` |
| O.C.C.s | [`occs.md`](occs.md) | `src/data/content/occs/<genre>/` |
| Races | [`races.md`](races.md) | `src/data/content/races/<genre>/` |
| XP tables | [`xp_tables.md`](xp_tables.md) | `src/data/content/progression/xp_tables/<genre>/` |
| Talents | [`talents.md`](talents.md) | `src/data/content/talents/` |
| Morphus traits | [`morphus.md`](morphus.md) | `src/data/content/morphus/tables/` (+ `morphus/forge/` routing) |

**Layout contract:** [`../content-catalog-layout.md`](../content-catalog-layout.md) (`utils/` ancillary files, loader rules).  
**Multi-book source order:** [`brief-format.md`](brief-format.md) § Multi-book source order · master list `src/data/source/ingest-briefs/utils/genre-source-reference-order.json`  
**Project context & doc-sync:** [`../gemini-project-context.md`](../gemini-project-context.md) § Development workflow.
