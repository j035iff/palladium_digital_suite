import { getLibraryOccById, getRaceById, raceCatalogGenreId } from '../../data/library/registry'
import { formatGenreSlug } from '../../data/genres'
import type { GenreId } from '../../data/genres'
import { getIqBonuses, getMaBonuses, getPbBonuses } from '../attributeBonuses'
import { aggregateAllPassiveModifiers } from '../featureEngine'
import { resolveHandToHandCombatProfile } from '../handToHandPipeline'
import {
  buildLiveSheetAbilitySections,
  type LiveSheetAbilityCategoryId,
} from '../liveSheetAbilities'
import { resolveCharacterMaxApm } from '../meleeCombat'
import { resolveActiveMorphusTraits } from '../morphusPassiveBridge'
import { resolveEffectivePalladiumOcc } from '../occComposition'
import { resolveCreationPsychicTier } from '../creationPsychicSkills'
import { saveVsPsionicsForTier } from '../psychicGate'
import { characterHasDualForms } from '../raceFormPolicy'
import {
  computeDisplayScalars,
  computeSheetCombatDerived,
} from '../sheetBonuses'
import { computeSaveProfile } from '../saveProfile'
import { migrateCharacterSave } from '../characterMigrate'
import { ensureCharacterRoot } from '../characterRoot'
import { transformCharacterToHostEnvironment } from '../../utils/genreTransformer'
import type { ActiveForm, CharacterRootState, DerivedSheetSkill } from '../../types'
import type { GmConversionPolicy } from './sessionTypes'

/** Compact ability names for GM observer / campaign history cards. */
export type GmPartyAbilitySummary = {
  id: LiveSheetAbilityCategoryId
  label: string
  names: string[]
}

export type GmPartyObserverAttributes = {
  iq: number
  me: number
  ma: number
  pp: number
  pe: number
  pb: number
  spd: number
  ps: number
}

export type GmPartyObserverSlice = {
  characterId: string
  name: string
  creationGenreId: string
  creationGenreLabel: string
  hostGenreId: string
  hostGenreLabel: string
  crossGenre: boolean
  conversionPolicy: GmConversionPolicy
  conversionNote: string
  lockedSkillCount: number
  supportsDualForm: boolean
  viewForm: ActiveForm
  level: number
  hpCurrent: number
  hpMax: number
  sdcCurrent: number
  sdcMax: number
  ppeCurrent: number
  ppeMax: number
  ispCurrent: number
  ispMax: number
  attributes: GmPartyObserverAttributes
  hthSkillName: string | null
  abilities: GmPartyAbilitySummary[]
  perceptionBonus: number
  trustIntimidate: number
  charmImpress: number
  maxApm: number
  initiativeBonus: number
  strikeBonus: number
  parryBonus: number
  dodgeBonus: number
  horrorAura: number | null
  horrorSaveBonus: number
  saveSummaries: { id: string; label: string; target: number; bonus: number }[]
}

function conversionNote(
  crossGenre: boolean,
  policy: GmConversionPolicy,
  creationLabel: string,
  hostLabel: string,
): string {
  if (!crossGenre) {
    return `Native to ${hostLabel}.`
  }
  if (policy === 'disable_non_native') {
    return `${creationLabel} character in a ${hostLabel} room — non-native assets are locked. Structural M.D.C./S.D.C. conversion is not applied. The save file is unchanged.`
  }
  return `${creationLabel} character in a ${hostLabel} room — conversion requested for this session view. Structural M.D.C. mapping is not implemented yet; host-illegal assets still lock. The save file is unchanged.`
}

function horrorSaveBonusFromPassive(
  passive: Record<string, number>,
  useNightbaneHorrorFactor: boolean,
): number {
  const base =
    (passive.save_horror ?? 0) +
    (passive.save_horror_factor ?? 0)
  if (!useNightbaneHorrorFactor) return base
  return base + (passive.save_nightbane_horror_factor ?? 0)
}

function abilitySummariesFromSections(
  sections: ReturnType<typeof buildLiveSheetAbilitySections>,
): GmPartyAbilitySummary[] {
  const out: GmPartyAbilitySummary[] = []
  for (const section of sections) {
    const names = [
      ...(section.naturalRows ?? []).map((row) => row.name),
      ...(section.catalogRows ?? []).map((row) => row.name),
    ]
    if (names.length === 0) continue
    out.push({ id: section.id, label: section.label, names })
  }
  return out
}

export function loadPartyCharacterRoot(
  raw: CharacterRootState,
): CharacterRootState {
  const { character: migrated } = migrateCharacterSave(raw)
  return ensureCharacterRoot(migrated, {
    creationGenreId: migrated.creationGenreId ?? raw.creationGenreId,
    hostGenreId: migrated.hostGenreId ?? raw.hostGenreId,
  })
}

export function buildPartyObserverSlice(
  rawSave: CharacterRootState,
  hostGenreId: GenreId,
  conversionPolicy: GmConversionPolicy,
  viewForm: ActiveForm,
): GmPartyObserverSlice {
  const rooted = loadPartyCharacterRoot(rawSave)
  const derived = transformCharacterToHostEnvironment(rooted, hostGenreId)
  const supportsDualForm = characterHasDualForms(derived)
  const form: ActiveForm = supportsDualForm ? viewForm : 'primary'
  const lib = derived.occ?.id ? getLibraryOccById(derived.occ.id) : undefined
  const occ = lib
    ? resolveEffectivePalladiumOcc(lib, derived.occSpecializationId)
    : undefined
  const race = getRaceById(
    derived.raceId ?? '',
    raceCatalogGenreId(derived.hostGenreId, derived.creationGenreId),
  )
  const hth = resolveHandToHandCombatProfile(derived, form, occ)
  const passive = aggregateAllPassiveModifiers(derived, form)
  const scalars = computeDisplayScalars(derived, form, passive)
  const combat = computeSheetCombatDerived(
    derived,
    form,
    { skillName: hth.skillName, accumulated: hth.accumulated },
    { occ, supportsDualForm },
  )
  const maxApm = resolveCharacterMaxApm(
    derived,
    form,
    supportsDualForm,
    hth.accumulated,
    passive,
  )
  const psychicTier = resolveCreationPsychicTier(derived)
  const saves = computeSaveProfile(
    derived,
    form,
    saveVsPsionicsForTier(psychicTier),
    supportsDualForm,
  )
  const branch = form === 'morphus' ? derived.morphus : derived.primary
  const lockedSkillCount = branch.skills.filter(
    (s) => (s as DerivedSheetSkill).isHostGenreLocked,
  ).length
  const crossGenre =
    derived.creationGenreId.toLowerCase() !== hostGenreId.toLowerCase()
  const creationLabel = formatGenreSlug(derived.creationGenreId)
  const hostLabel = formatGenreSlug(hostGenreId)
  const morphusTraits = resolveActiveMorphusTraits(derived)
  const abilitySections = buildLiveSheetAbilitySections({
    race,
    occ,
    characterLevel: derived.level ?? 1,
    selectedAbilityIds: derived.selectedAbilities ?? [],
    activeForm: form,
    genreId: derived.creationGenreId,
    morphusTraits,
  })

  return {
    characterId: derived.id,
    name: derived.name.trim() || 'Unnamed',
    creationGenreId: derived.creationGenreId,
    creationGenreLabel: creationLabel,
    hostGenreId,
    hostGenreLabel: hostLabel,
    crossGenre,
    conversionPolicy,
    conversionNote: conversionNote(
      crossGenre,
      conversionPolicy,
      creationLabel,
      hostLabel,
    ),
    lockedSkillCount,
    supportsDualForm,
    viewForm: form,
    level: derived.level ?? 1,
    hpCurrent: branch.hitPoints.current,
    hpMax: branch.hitPoints.maximum,
    sdcCurrent: branch.structuralDamageCapacity.current,
    sdcMax: branch.structuralDamageCapacity.maximum,
    ppeCurrent: derived.ppe?.current ?? 0,
    ppeMax: derived.ppe?.maximum ?? 0,
    ispCurrent: branch.isp?.current ?? 0,
    ispMax: branch.isp?.maximum ?? 0,
    attributes: {
      iq: scalars.iq,
      me: scalars.me,
      ma: scalars.ma,
      pp: scalars.pp,
      pe: scalars.pe,
      pb: scalars.pb,
      spd: scalars.spd,
      ps: scalars.psScore,
    },
    hthSkillName: hth.skillName?.trim() || null,
    abilities: abilitySummariesFromSections(abilitySections),
    perceptionBonus: getIqBonuses(scalars.iq).perceptionBonus,
    trustIntimidate: getMaBonuses(scalars.ma).trustIntimidate,
    charmImpress: getPbBonuses(scalars.pb).charmImpress,
    maxApm,
    initiativeBonus: combat.initiative.total,
    strikeBonus: combat.strike.total,
    parryBonus: combat.parry.total,
    dodgeBonus: combat.dodge.total,
    horrorAura: saves.horrorFactor.total,
    horrorSaveBonus: horrorSaveBonusFromPassive(passive, false),
    saveSummaries: saves.saves.map((row) => ({
      id: row.id,
      label: row.sheetLabel,
      target: row.baseTarget,
      bonus: row.totalBonus,
    })),
  }
}

export function partyHorrorSaveBonus(
  rawSave: CharacterRootState,
  hostGenreId: GenreId,
  viewForm: ActiveForm,
  useNightbaneHorrorFactor: boolean,
): number {
  const rooted = loadPartyCharacterRoot(rawSave)
  const derived = transformCharacterToHostEnvironment(rooted, hostGenreId)
  const supportsDualForm = characterHasDualForms(derived)
  const form: ActiveForm = supportsDualForm ? viewForm : 'primary'
  const passive = aggregateAllPassiveModifiers(derived, form)
  return horrorSaveBonusFromPassive(passive, useNightbaneHorrorFactor)
}
