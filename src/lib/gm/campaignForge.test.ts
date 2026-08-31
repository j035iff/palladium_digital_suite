import { describe, expect, it } from 'vitest'
import {
  blankCampaignForgeDraft,
  campaignForgeConfirmLabel,
  campaignForgeReady,
  campaignForgeIssues,
  patchCampaignForgeValue,
  CAMPAIGN_FORGE_OPTIONS,
} from './campaignForge'

describe('campaign forge registry', () => {
  it('keeps Create Campaign gated until name, genre, and conversion rules are valid', () => {
    let draft = blankCampaignForgeDraft()
    expect(campaignForgeReady(draft, { takenNames: [] })).toBe(false)
    draft = patchCampaignForgeValue(draft, 'name', '  Friday table  ')
    expect(campaignForgeReady(draft, { takenNames: [] })).toBe(false)
    draft = patchCampaignForgeValue(draft, 'hostGenreId', 'nightbane')
    expect(campaignForgeReady(draft, { takenNames: [] })).toBe(false)
    draft = patchCampaignForgeValue(
      draft,
      'conversionPolicy',
      'disable_non_native',
    )
    expect(campaignForgeReady(draft, { takenNames: [] })).toBe(true)
    expect(campaignForgeConfirmLabel(draft)).toBe(
      'Are you sure you want to create a new Nightbane Campaign?',
    )
  })

  it('rejects duplicate names case-insensitively', () => {
    let draft = blankCampaignForgeDraft()
    draft = patchCampaignForgeValue(draft, 'name', 'Friday Table')
    draft = patchCampaignForgeValue(draft, 'hostGenreId', 'rifts')
    draft = patchCampaignForgeValue(
      draft,
      'conversionPolicy',
      'apply_conversion',
    )
    const issues = campaignForgeIssues(draft, { takenNames: ['friday table'] })
    expect(issues.some((row) => row.optionId === 'name')).toBe(true)
    expect(campaignForgeReady(draft, { takenNames: ['friday table'] })).toBe(
      false,
    )
  })

  it('registers identity and rules options on one forge', () => {
    expect(CAMPAIGN_FORGE_OPTIONS.map((row) => row.id)).toEqual([
      'name',
      'hostGenreId',
      'conversionPolicy',
    ])
    expect(
      CAMPAIGN_FORGE_OPTIONS.find((row) => row.id === 'conversionPolicy')
        ?.kind,
    ).toBe('select')
  })
})
