import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  confirmPermanentDelete,
  permanentDeleteConfirmMessage,
} from './permanentDeleteConfirm'

describe('permanentDeleteConfirm', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('states the delete is permanent', () => {
    expect(permanentDeleteConfirmMessage('Old Chicago')).toBe(
      'Delete "Old Chicago"? This is permanent and cannot be undone.',
    )
    expect(permanentDeleteConfirmMessage('  ')).toMatch(/this entry/)
  })

  it('confirmPermanentDelete mirrors window.confirm', () => {
    const confirm = vi.fn().mockReturnValue(true)
    vi.stubGlobal('confirm', confirm)
    expect(confirmPermanentDelete('Knife')).toBe(true)
    expect(confirm).toHaveBeenCalledWith(
      'Delete "Knife"? This is permanent and cannot be undone.',
    )
  })
})
