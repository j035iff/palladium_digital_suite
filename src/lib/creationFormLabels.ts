/** User-facing creation labels — Facade/Morphus only for Nightbane dual-form. */

export const FACADE_LABEL = 'Facade'

/** PE hint fragment inside dual-form P.P.E. formulas, e.g. `PE (Facade)`. */
export function dualFormPeHintLabel(): string {
  return 'Facade'
}

export function primaryFormSdcBreakdownLabel(): string {
  return 'Facade S.D.C.'
}

export function creationHpLabel(supportsDualForm: boolean, form?: 'primary' | 'morphus'): string {
  if (!supportsDualForm) return 'H.P.'
  if (form === 'morphus') return 'Morphus H.P.'
  return 'Facade H.P.'
}

export function creationSdcLabel(supportsDualForm: boolean, form?: 'primary' | 'morphus'): string {
  if (!supportsDualForm) return 'S.D.C.'
  if (form === 'morphus') return 'Morphus S.D.C.'
  return 'Facade S.D.C.'
}

export function creationAttributesBlockerLabel(supportsDualForm: boolean, form: 'primary' | 'morphus'): string {
  if (!supportsDualForm) {
    return 'Attributes look incomplete or invalid — finish attribute allocation.'
  }
  if (form === 'morphus') {
    return 'Morphus attributes look incomplete or invalid — finish attribute allocation.'
  }
  return 'Facade attributes look incomplete or invalid — finish attribute allocation.'
}

export function creationIspLabel(supportsDualForm: boolean): string {
  return supportsDualForm ? 'Morphus I.S.P.' : 'I.S.P.'
}
