/**
 * Tab 4 skill-library browse lock helpers.
 *
 * Joe 2026-11: all skill slots fill in parallel — no progressive browse locks
 * that force vocational → voucher → related/secondary order.
 */

import type { PalladiumOcc } from '../types'
import { hasIncompleteCreationVoucherPicks } from './occCoreSkillVouchers'
import {
  hasIncompleteVocationalFocusVouchers,
  type OccRelatedVoucherTask,
} from './occRelatedSkillVouchers'

export type CreationSkillBrowseLockInput = {
  effectiveOcc: PalladiumOcc | undefined
  specializationId: string | null | undefined
  relatedVoucherTasks: readonly OccRelatedVoucherTask[]
  voucherPicks: Readonly<Record<string, unknown>> | undefined
  relatedVoucherPicks: Readonly<Record<string, unknown>> | undefined
  relatedVoucherClusters: Readonly<Record<string, string>> | undefined
}

export type CreationSkillBrowseLockState = {
  /** Vocational Focus vouchers still have open cluster/slots. */
  vocationalFocusIncomplete: boolean
  /** O.C.C. core + non-vocational related vouchers still have open slots. */
  creationVouchersIncomplete: boolean
  /**
   * When true, UI would hide related/secondary add actions until vouchers complete.
   * Always false under parallel-fill (Joe 2026-11).
   */
  blocksRelatedSecondaryBrowse: boolean
  /**
   * When true, UI would block creation-voucher adds until vocational focus completes.
   * Always false under parallel-fill (Joe 2026-11).
   */
  blocksCreationVoucherWhileVocationalIncomplete: boolean
}

/** Resolve incomplete-voucher flags; progressive browse locks stay off. */
export function resolveCreationSkillBrowseLock(
  input: CreationSkillBrowseLockInput,
): CreationSkillBrowseLockState {
  const vocationalFocusIncomplete = hasIncompleteVocationalFocusVouchers(
    input.relatedVoucherTasks,
    input.relatedVoucherPicks,
    input.relatedVoucherClusters,
  )
  const creationVouchersIncomplete = hasIncompleteCreationVoucherPicks(
    input.effectiveOcc,
    input.specializationId,
    input.voucherPicks,
    input.relatedVoucherPicks,
    input.relatedVoucherClusters,
  )

  return {
    vocationalFocusIncomplete,
    creationVouchersIncomplete,
    blocksRelatedSecondaryBrowse: false,
    blocksCreationVoucherWhileVocationalIncomplete: false,
  }
}
