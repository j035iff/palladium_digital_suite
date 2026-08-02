/** User-facing creation labels — "Facade" / Morphus only for Nightbane dual-form. */

/** Nightbane primary-form label. Never show for single-form races. */
export const FACADE_LABEL = 'Facade'

/** PE hint fragment inside dual-form P.P.E. formulas, e.g. `PE (Facade)`. Nightbane only. */
export function dualFormPeHintLabel(): string {
  return FACADE_LABEL
}

/** Morphus S.D.C. tooltip carry-over label. Nightbane only. */
export function primaryFormSdcBreakdownLabel(): string {
  return `${FACADE_LABEL} S.D.C.`
}

/** Live Ledger header blurb — never says Facade unless dual-form. */
export function liveLedgerDescription(input: {
  supportsDualForm: boolean
  morphus: boolean
  variant?: 'card' | 'sidebar'
}): string {
  if (input.supportsDualForm && input.morphus) {
    return input.variant === 'sidebar'
      ? 'Morphus build mirror — supernatural stats update as you forge.'
      : 'Morphus build mirror — supernatural stats update as you work through each tab.'
  }
  if (input.supportsDualForm) {
    return input.variant === 'sidebar'
      ? `${FACADE_LABEL} build mirror — updates as you work through each forge tab.`
      : `${FACADE_LABEL} build mirror — attributes, vitals, saves, and combat update as you work through each tab below.`
  }
  return input.variant === 'sidebar'
    ? 'Build mirror — updates as you work through each forge tab.'
    : 'Build mirror — attributes, vitals, saves, and combat update as you work through each tab below.'
}

export function creationHpLabel(supportsDualForm: boolean, form?: 'primary' | 'morphus'): string {
  if (!supportsDualForm) return 'H.P.'
  if (form === 'morphus') return 'Morphus H.P.'
  return `${FACADE_LABEL} H.P.`
}

export function creationSdcLabel(supportsDualForm: boolean, form?: 'primary' | 'morphus'): string {
  if (!supportsDualForm) return 'S.D.C.'
  if (form === 'morphus') return 'Morphus S.D.C.'
  return `${FACADE_LABEL} S.D.C.`
}

export function creationAttributesBlockerLabel(
  supportsDualForm: boolean,
  form: 'primary' | 'morphus',
): string {
  if (!supportsDualForm) {
    return 'Attributes look incomplete or invalid — finish attribute allocation.'
  }
  if (form === 'morphus') {
    return 'Morphus attributes look incomplete or invalid — finish attribute allocation.'
  }
  return `${FACADE_LABEL} attributes look incomplete or invalid — finish attribute allocation.`
}

export function creationIspLabel(supportsDualForm: boolean): string {
  return supportsDualForm ? 'Morphus I.S.P.' : 'I.S.P.'
}
