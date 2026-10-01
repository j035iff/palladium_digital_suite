/**
 * DOM sync for content-linked notes editors (contentEditable).
 * Storage stays `[[kind:id|label]]`; the DOM shows labels as atomic chips.
 * Pillar 9 — one editor pipeline for every Narrative notes surface.
 */

import {
  isGmContentLinkKind,
  segmentContentLinks,
  serializeContentLink,
  type GmContentLinkKind,
  type GmContentLinkRef,
} from './contentLinks'

export const CONTENT_LINK_CHIP_ATTR = 'data-content-link'

function appendTextWithBreaks(parent: HTMLElement, text: string): void {
  const parts = text.split('\n')
  parts.forEach((part, index) => {
    if (part) parent.appendChild(document.createTextNode(part))
    if (index < parts.length - 1) {
      parent.appendChild(document.createElement('br'))
    }
  })
}

function createLinkChip(ref: GmContentLinkRef): HTMLSpanElement {
  const span = document.createElement('span')
  span.contentEditable = 'false'
  span.setAttribute(CONTENT_LINK_CHIP_ATTR, '1')
  span.dataset.kind = ref.kind
  span.dataset.id = ref.id
  span.dataset.label = ref.label
  span.textContent = ref.label
  span.className = 'gm-content-link-chip'
  return span
}

/** Replace editor children from structured storage text. */
export function writeContentLinkEditor(
  root: HTMLElement,
  storage: string,
): void {
  root.replaceChildren()
  if (storage === '') return
  for (const seg of segmentContentLinks(storage)) {
    if (seg.type === 'text') {
      appendTextWithBreaks(root, seg.text)
    } else {
      root.appendChild(createLinkChip(seg.ref))
    }
  }
}

function readChipRef(el: HTMLElement): GmContentLinkRef | null {
  const kindRaw = (el.dataset.kind ?? '').toLowerCase()
  const id = (el.dataset.id ?? '').trim()
  const label = (el.dataset.label ?? el.textContent ?? '').trim()
  if (!isGmContentLinkKind(kindRaw) || !id) return null
  return { kind: kindRaw, id, label: label || id }
}

function serializeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? ''
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return ''
  const el = node as HTMLElement
  if (el.getAttribute(CONTENT_LINK_CHIP_ATTR) === '1') {
    const ref = readChipRef(el)
    return ref ? serializeContentLink(ref) : (el.textContent ?? '')
  }
  if (el.tagName === 'BR') return '\n'

  let out = ''
  const kids = Array.from(el.childNodes)
  kids.forEach((child, index) => {
    if (index > 0) {
      const prev = kids[index - 1]!
      const prevBlock =
        prev.nodeType === Node.ELEMENT_NODE &&
        ['DIV', 'P'].includes((prev as HTMLElement).tagName)
      const curBlock =
        child.nodeType === Node.ELEMENT_NODE &&
        ['DIV', 'P'].includes((child as HTMLElement).tagName)
      if (prevBlock || curBlock) out += '\n'
    }
    out += serializeNode(child)
  })
  return out
}

/** Serialize editor DOM back to `[[kind:id|label]]` storage. */
export function serializeContentLinkEditor(root: HTMLElement): string {
  return serializeNode(root)
}

export type ContentLinkChipHit = {
  kind: GmContentLinkKind
  id: string
  label: string
  element: HTMLElement
}

export function contentLinkChipFromEventTarget(
  target: EventTarget | null,
  root: HTMLElement,
): ContentLinkChipHit | null {
  if (!(target instanceof Element)) return null
  const chip = target.closest(`[${CONTENT_LINK_CHIP_ATTR}="1"]`)
  if (!(chip instanceof HTMLElement) || !root.contains(chip)) return null
  const ref = readChipRef(chip)
  if (!ref) return null
  return { ...ref, element: chip }
}

/**
 * Storage-text caret offset for the current selection inside `root`.
 * Uses a pre-caret clone so chip tokens count as full `[[…]]` length.
 */
export function getContentLinkEditorCaretStorageOffset(
  root: HTMLElement,
): number {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) {
    return serializeContentLinkEditor(root).length
  }
  const range = sel.getRangeAt(0)
  if (!root.contains(range.startContainer)) {
    return serializeContentLinkEditor(root).length
  }

  const pre = range.cloneRange()
  pre.selectNodeContents(root)
  pre.setEnd(range.startContainer, range.startOffset)

  const holder = document.createElement('div')
  holder.appendChild(pre.cloneContents())
  return serializeContentLinkEditor(holder).length
}

/** Place the caret at a storage offset (after rewrite). */
export function setContentLinkEditorCaretStorageOffset(
  root: HTMLElement,
  storageOffset: number,
): void {
  const target = Math.max(0, storageOffset)
  const sel = window.getSelection()
  if (!sel) return

  let walked = 0

  const collapseTo = (node: Node, offset: number) => {
    const range = document.createRange()
    range.setStart(node, offset)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
  }

  const collapseAfter = (node: Node) => {
    const range = document.createRange()
    range.setStartAfter(node)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
  }

  const walk = (node: Node): boolean => {
    if (node.nodeType === Node.TEXT_NODE) {
      const len = node.textContent?.length ?? 0
      if (walked + len >= target) {
        collapseTo(node, target - walked)
        return true
      }
      walked += len
      return false
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return false
    const el = node as HTMLElement
    if (el.getAttribute(CONTENT_LINK_CHIP_ATTR) === '1') {
      const ref = readChipRef(el)
      const tokenLen = (ref ? serializeContentLink(ref) : el.textContent ?? '')
        .length
      if (walked + tokenLen >= target) {
        collapseAfter(el)
        return true
      }
      walked += tokenLen
      return false
    }
    if (el.tagName === 'BR') {
      if (walked + 1 >= target) {
        collapseAfter(el)
        return true
      }
      walked += 1
      return false
    }

    const kids = Array.from(el.childNodes)
    for (let i = 0; i < kids.length; i += 1) {
      const child = kids[i]!
      if (i > 0) {
        const prev = kids[i - 1]!
        const prevBlock =
          prev.nodeType === Node.ELEMENT_NODE &&
          ['DIV', 'P'].includes((prev as HTMLElement).tagName)
        const curBlock =
          child.nodeType === Node.ELEMENT_NODE &&
          ['DIV', 'P'].includes((child as HTMLElement).tagName)
        if (prevBlock || curBlock) {
          if (walked + 1 >= target) {
            collapseTo(child, 0)
            return true
          }
          walked += 1
        }
      }
      if (walk(child)) return true
    }
    return false
  }

  if (!walk(root)) {
    const range = document.createRange()
    range.selectNodeContents(root)
    range.collapse(false)
    sel.removeAllRanges()
    sel.addRange(range)
  }
}

/** Caret coords relative to `root` (mention popup anchor). */
export function getContentLinkEditorCaretClientOffset(
  root: HTMLElement,
): { top: number; left: number; height: number } {
  const sel = window.getSelection()
  const rootRect = root.getBoundingClientRect()
  if (!sel || sel.rangeCount === 0) {
    return { top: 4, left: 8, height: 16 }
  }
  const range = sel.getRangeAt(0).cloneRange()
  range.collapse(true)
  let rect = range.getBoundingClientRect()
  if ((rect.width === 0 && rect.height === 0) || Number.isNaN(rect.top)) {
    const marker = document.createElement('span')
    marker.textContent = '\u200b'
    range.insertNode(marker)
    rect = marker.getBoundingClientRect()
    const parent = marker.parentNode
    parent?.removeChild(marker)
    parent?.normalize()
  }
  return {
    top: rect.bottom - rootRect.top + root.scrollTop,
    left: Math.max(0, rect.left - rootRect.left + root.scrollLeft),
    height: Math.max(rect.height, 16),
  }
}

/** Selected plain text inside the editor (Insert link fallback). */
export function getContentLinkEditorSelectedText(root: HTMLElement): string {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return ''
  if (!root.contains(sel.anchorNode) || !root.contains(sel.focusNode)) return ''
  return sel.toString().trim()
}
