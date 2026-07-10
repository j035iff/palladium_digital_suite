/**
 * Creation forge identity header typography (light section on white).
 * Root is 2× forge tab page title size; child rows scale with `em`.
 */

/** Character name row — 2× {@link ForgeTabPageHeader} title (`text-sm` × 2). */
export const CREATION_FORGE_ROOT_TEXT_CLASS = 'text-[1.75rem] leading-none'

export const CREATION_FORGE_NAME_TEXT_CLASS =
  'text-[1em] font-semibold tracking-wide'

export function creationForgeReadoutLabelClass(morphusActive: boolean): string {
  return morphusActive
    ? 'text-[0.5em] font-bold uppercase leading-none tracking-wide text-violet-600'
    : 'text-[0.5em] font-bold uppercase leading-none tracking-wide text-slate-500'
}

export function creationForgeReadoutValueClass(morphusActive: boolean): string {
  return morphusActive
    ? 'text-[1em] font-semibold uppercase leading-none tracking-wide text-violet-950'
    : 'text-[1em] font-semibold uppercase leading-none tracking-wide text-slate-900'
}

/** Row 2 scale — ½ of name size. */
export const CREATION_FORGE_SETTINGS_ROW_CLASS = 'text-[0.5em] leading-none'

/** Expanded identity details (Sex / Eyes / …) — absolute size; was 0.5em and unreadable without a large root. */
export const CREATION_FORGE_DETAILS_ROW_CLASS = 'text-sm leading-none'

export function creationForgeDetailLabelClass(morphusActive: boolean): string {
  return morphusActive
    ? 'text-[0.75em] font-bold uppercase leading-none tracking-wide text-violet-600'
    : 'text-[0.75em] font-bold uppercase leading-none tracking-wide text-slate-500'
}

export function creationForgeNameInputClass(morphusActive: boolean): string {
  return morphusActive
    ? `${CREATION_FORGE_NAME_TEXT_CLASS} w-full min-w-0 border-0 bg-transparent text-violet-800 placeholder:font-normal placeholder:text-violet-400 outline-none`
    : `${CREATION_FORGE_NAME_TEXT_CLASS} w-full min-w-0 border-0 bg-transparent text-blue-800 placeholder:font-normal placeholder:text-slate-400 outline-none`
}

export function creationForgeDetailInputClass(morphusActive: boolean): string {
  const tone = morphusActive
    ? 'border-violet-400 text-violet-950 focus:border-violet-600'
    : 'border-slate-500 text-slate-900 focus:border-blue-600'
  return `text-[1em] min-h-[1.15em] border-0 border-b bg-transparent px-0 py-px font-medium leading-tight outline-none ${tone}`
}

export function creationForgeDetailsButtonClass(morphusActive: boolean): string {
  return morphusActive
    ? 'shrink-0 rounded border border-violet-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-800 hover:bg-violet-50'
    : 'shrink-0 rounded border border-blue-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-800 hover:bg-blue-50'
}

export function creationForgeHeaderRowClass(): string {
  return 'flex items-start leading-none'
}

/** @deprecated Use creationForgeReadoutLabelClass */
export function creationForgeSettingLabelClass(morphusActive: boolean): string {
  return creationForgeReadoutLabelClass(morphusActive)
}

/** @deprecated Use creationForgeReadoutValueClass */
export function creationForgeSettingValueClass(morphusActive: boolean): string {
  return creationForgeReadoutValueClass(morphusActive)
}
