/**
 * Copies text to the clipboard using the async Clipboard API, with a
 * `document.execCommand` fallback for browsers that only support it.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fall through to the legacy path below.
    }
  }

  return copyWithExecCommand(text)
}

function copyWithExecCommand(text: string): boolean {
  if (typeof document === 'undefined') return false

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '-1000px'
  textarea.style.opacity = '0'

  document.body.appendChild(textarea)

  try {
    textarea.select()
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    document.body.removeChild(textarea)
  }
}
