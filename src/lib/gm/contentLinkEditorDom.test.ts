/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest'
import {
  contentLinkEditorNeedsRewrite,
  contentLinkEditorVisibleText,
  serializeContentLinkEditor,
  writeContentLinkEditor,
} from './contentLinkEditorDom'
import { contentLinksDisplayText } from './contentLinks'

describe('contentLinkEditorDom Familiar Surface', () => {
  it('writes chips so visible text is the label, not raw wiki', () => {
    const root = document.createElement('div')
    const storage =
      'The characters went to [[place:place_c90d8935-7d5a-47ae-81a2-6747f491ac0d|Old Chicago]]'
    writeContentLinkEditor(root, storage)
    expect(contentLinkEditorVisibleText(root)).toBe(
      'The characters went to Old Chicago',
    )
    expect(contentLinkEditorVisibleText(root)).not.toContain('[[')
    expect(contentLinkEditorVisibleText(root)).not.toContain('place_c90d')
    expect(serializeContentLinkEditor(root)).toBe(storage)
    expect(contentLinksDisplayText(storage)).toBe(
      contentLinkEditorVisibleText(root),
    )
    expect(contentLinkEditorNeedsRewrite(root, storage)).toBe(false)
  })

  it('flags rewrite when raw wiki text is left in the DOM', () => {
    const root = document.createElement('div')
    const storage = 'See [[place:p1|Dock]]'
    root.textContent = storage
    expect(contentLinkEditorNeedsRewrite(root, storage)).toBe(true)
    writeContentLinkEditor(root, storage)
    expect(contentLinkEditorVisibleText(root)).toBe('See Dock')
    expect(contentLinkEditorNeedsRewrite(root, storage)).toBe(false)
  })
})
