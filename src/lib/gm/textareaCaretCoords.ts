/**
 * Approximate caret pixel coords inside a textarea (mirror-div technique).
 * Used to anchor the Notes `@` mention popup near the caret.
 */

export type TextareaCaretCoords = {
  top: number
  left: number
  height: number
}

const MIRROR_STYLE_PROPS = [
  'boxSizing',
  'width',
  'height',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
  'whiteSpace',
  'wordWrap',
  'wordBreak',
] as const

export function getTextareaCaretCoords(
  textarea: HTMLTextAreaElement,
  position: number,
): TextareaCaretCoords {
  const style = window.getComputedStyle(textarea)
  const mirror = document.createElement('div')
  mirror.setAttribute('aria-hidden', 'true')

  for (const prop of MIRROR_STYLE_PROPS) {
    mirror.style[prop] = style[prop]
  }
  mirror.style.position = 'absolute'
  mirror.style.visibility = 'hidden'
  mirror.style.whiteSpace = 'pre-wrap'
  mirror.style.wordWrap = 'break-word'
  mirror.style.overflow = 'hidden'
  mirror.style.top = '0'
  mirror.style.left = '-9999px'

  const value = textarea.value
  const before = value.slice(0, position)
  mirror.textContent = before

  const marker = document.createElement('span')
  marker.textContent = value.slice(position) || '.'
  mirror.appendChild(marker)
  document.body.appendChild(mirror)

  const top =
    marker.offsetTop - textarea.scrollTop + parseFloat(style.borderTopWidth)
  const left =
    marker.offsetLeft -
    textarea.scrollLeft +
    parseFloat(style.borderLeftWidth)
  const height = parseFloat(style.lineHeight) || marker.offsetHeight || 16

  document.body.removeChild(mirror)
  return { top, left, height }
}
