import type { SheetSkill } from '../types'
import type {
  MorphusAggregatedFlightEngine,
  MorphusAggregatedJumpBonuses,
  MorphusAggregatedSwimSpeedModifiers,
} from './morphusCharacteristicAggregation'

export type SpeedInputType = 'attribute' | 'mph' | 'yardsPerMelee'

export type SpeedProfile = {
  attributeValue: number
  mph: number
  yardsPerMelee: number
}

export type LeapProfile = {
  standingHorizontal: string
  standingVertical: string
  runningHorizontal: string
  runningVertical: string
}

export type DerivedMovementStats = {
  ground: SpeedProfile
  swim: SpeedProfile | null
  fly?: SpeedProfile
  leap: LeapProfile
}

export type MovementDerivationInput = {
  landSpdAttribute: number
  ps: number
  totalHeightInches?: number
  skills: readonly SheetSkill[]
  isMorphusActive: boolean
  canSwimPhysically: boolean
  swimSpeedModifiers?: MorphusAggregatedSwimSpeedModifiers
  jumpBonuses?: MorphusAggregatedJumpBonuses
  jumpMultiplier?: number
  minimumJumpFeet?: number
  flightEngine?: MorphusAggregatedFlightEngine | null
}

type LeapAxisModifier = {
  flat: number
  dice: string
}

export function resolveSpeedProfile(input: {
  type: SpeedInputType
  value: number
  modifiers?: { flat?: number; percent?: number }
}): SpeedProfile {
  let baseSpd = 0
  switch (input.type) {
    case 'attribute':
      baseSpd = input.value
      break
    case 'mph':
      baseSpd = Math.round(input.value * (22 / 15))
      break
    case 'yardsPerMelee':
      baseSpd = Math.round(input.value / 5)
      break
  }

  const flat = input.modifiers?.flat ?? 0
  const percent = input.modifiers?.percent ?? 0
  const attributeValue = Math.max(
    0,
    Math.round((baseSpd + flat) * (1 + percent / 100)),
  )
  return {
    attributeValue,
    mph: Math.round(attributeValue * (15 / 22)),
    yardsPerMelee: Math.round(attributeValue * 5),
  }
}

function hasSkill(skills: readonly SheetSkill[], ...tokens: readonly string[]): boolean {
  const lowered = tokens.map((t) => t.toLowerCase())
  return skills.some((s) => {
    if (s.restricted) return false
    const id = s.id.toLowerCase()
    const name = s.name.toLowerCase()
    return lowered.some((t) => id.includes(t) || name.includes(t))
  })
}

function formatLeapString(
  diceCount: number,
  diceType: 'D4' | 'D6',
  bonus: number,
  extraDice = '',
): string {
  const roundedBonus = Math.round(bonus)
  const bonusStr = roundedBonus > 0 ? `+${roundedBonus}` : roundedBonus < 0 ? `${roundedBonus}` : ''
  const extraDiceStr = extraDice ? `+${extraDice}` : ''
  return `${diceCount}${diceType}${extraDiceStr}${bonusStr} Ft`
}

function deriveLeapProfile(input: MovementDerivationInput): LeapProfile {
  const hasAcrobaticsOrGymnastics = hasSkill(
    input.skills,
    'skill_acrobatics',
    'acrobatics',
    'skill_gymnastics',
    'gymnastics',
  )
  const heightInches = input.totalHeightInches ?? 72
  const leapBaseDiceNumber = Math.floor(input.ps / 10) < 2 ? 1 : Math.round(input.ps / 15)
  const heightRatio = Math.round((heightInches * 2) / 36)
  const leapBase = heightRatio < 1 ? 0 : heightRatio + (hasAcrobaticsOrGymnastics ? 1 : 0)
  const spdMultiplier =
    input.landSpdAttribute < 20
      ? 1.5
      : 2 + Math.floor((input.landSpdAttribute - 20) / 10) * 0.5

  const standHorizDiceType = hasAcrobaticsOrGymnastics ? 'D6' : 'D4'
  const standVertDiceCount = Math.round(leapBaseDiceNumber / 2)
  const runHorizDiceCount = hasAcrobaticsOrGymnastics
    ? leapBaseDiceNumber + 1
    : leapBaseDiceNumber
  const runVertDiceCount = Math.round(leapBaseDiceNumber)

  const jump = input.jumpBonuses ?? {
    standingHeight: 0,
    standingDistance: 0,
    runningHeight: 0,
    runningDistance: 0,
  }
  const jumpMul = input.jumpMultiplier ?? 1
  const minJump = input.minimumJumpFeet ?? 0
  const standDist: LeapAxisModifier = { flat: jump.standingDistance, dice: '' }
  const standHeight: LeapAxisModifier = { flat: jump.standingHeight, dice: '' }
  const runDist: LeapAxisModifier = {
    flat: jump.runningDistance || jump.standingDistance * 2,
    dice: '',
  }
  const runHeight: LeapAxisModifier = {
    flat: jump.runningHeight || jump.standingHeight * 2,
    dice: '',
  }

  if (input.isMorphusActive) {
    const standingDistanceBonus = Math.max(minJump, leapBase + standDist.flat) * jumpMul
    const standingHeightBonus =
      Math.floor((Math.max(minJump, leapBase + standHeight.flat) * jumpMul) * 0.75) +
      (hasAcrobaticsOrGymnastics ? 1 : 0)
    const runningDistanceBonus =
      Math.max(minJump, leapBase * spdMultiplier + runDist.flat) * jumpMul
    const runningHeightBonus =
      Math.floor((Math.max(minJump, leapBase * 0.75 + runHeight.flat) * jumpMul)) +
      (hasAcrobaticsOrGymnastics ? 2 : 1)

    return {
      standingHorizontal: formatLeapString(
        leapBaseDiceNumber,
        standHorizDiceType,
        standingDistanceBonus,
        standDist.dice,
      ),
      standingVertical: formatLeapString(
        standVertDiceCount,
        'D4',
        standingHeightBonus,
        standHeight.dice,
      ),
      runningHorizontal: formatLeapString(
        runHorizDiceCount,
        'D6',
        runningDistanceBonus,
        runDist.dice,
      ),
      runningVertical: formatLeapString(
        runVertDiceCount,
        'D4',
        runningHeightBonus,
        runHeight.dice,
      ),
    }
  }

  return {
    standingHorizontal: formatLeapString(leapBaseDiceNumber, standHorizDiceType, leapBase),
    standingVertical: formatLeapString(
      standVertDiceCount,
      'D4',
      Math.floor(leapBase / 4) + (hasAcrobaticsOrGymnastics ? 1 : 0),
    ),
    runningHorizontal: formatLeapString(
      runHorizDiceCount,
      'D6',
      leapBase * spdMultiplier,
    ),
    runningVertical: formatLeapString(
      runVertDiceCount,
      'D4',
      Math.floor(leapBase / 2) + (hasAcrobaticsOrGymnastics ? 2 : 1),
    ),
  }
}

export function deriveMovementStats(input: MovementDerivationInput): DerivedMovementStats {
  const ground = resolveSpeedProfile({ type: 'attribute', value: input.landSpdAttribute })
  const hasSwimmingSkill = hasSkill(input.skills, 'skill_swimming', 'swimming')

  const swim = input.canSwimPhysically
    ? resolveSpeedProfile({
        type: 'attribute',
        value: hasSwimmingSkill
          ? Math.round(input.ps * (3 / 5))
          : Math.round(input.ps * (3 / 10)),
        modifiers: {
          flat: input.swimSpeedModifiers?.flat ?? 0,
          percent: input.swimSpeedModifiers?.percent ?? 0,
        },
      })
    : null

  let fly: SpeedProfile | undefined
  const flight = input.flightEngine
  if (flight) {
    if (flight.flySpdAttribute > 0) {
      fly = resolveSpeedProfile({ type: 'attribute', value: flight.flySpdAttribute })
    } else if (flight.maxSpeedMph > 0) {
      fly = resolveSpeedProfile({ type: 'mph', value: flight.maxSpeedMph })
    }
  }

  return {
    ground,
    swim,
    fly,
    leap: deriveLeapProfile(input),
  }
}
