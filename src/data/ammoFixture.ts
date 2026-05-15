import type { AmmoPoolsState } from '../lib/ammoPools'

/** Demo spare ammo by weapon category (CharacterContext). */
export const initialAmmoPools: AmmoPoolsState = {
  Handguns: { label: 'Handgun cells / magazines', spareRounds: 24 },
  Rifles: { label: 'Rifle rounds', spareRounds: 0 },
  Swords: { label: '—', spareRounds: 0 },
}
