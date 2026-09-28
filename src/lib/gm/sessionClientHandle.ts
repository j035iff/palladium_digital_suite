/**
 * Shared GM client runtime handle — survives Join Table → Character Sheet
 * handoff so the joined transport stays attached (Unified Path; no second
 * joiner sheet renderer).
 */

import {
  createGmClientRuntime,
  loadOrCreateDeviceId,
  type GmClientRuntime,
} from './sessionClientRuntime'

let shared: GmClientRuntime | null = null

/** Device-scoped singleton used by Join Table and post-join sheet. */
export function getSharedGmClientRuntime(): GmClientRuntime {
  if (!shared) {
    shared = createGmClientRuntime(loadOrCreateDeviceId())
  }
  return shared
}

/** Test / leave-table reset — clears the singleton so the next get creates fresh. */
export function __resetSharedGmClientRuntimeForTests(): void {
  shared = null
}
