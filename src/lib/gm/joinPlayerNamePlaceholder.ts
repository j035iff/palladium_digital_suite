/**
 * Peer-visible player display name stub until launch “sign in” lands.
 * Join Session does not collect a Player Name field on the sheet — callers
 * pass this placeholder into `runtime.join({ displayName })` so LAN join still
 * works. Do not build sign-in UX here.
 */
export const JOIN_PLAYER_NAME_PLACEHOLDER = 'Player' as const
