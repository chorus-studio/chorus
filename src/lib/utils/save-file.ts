/**
 * Hand the browser a file to save. A content script has no downloads API, so
 * the file goes out through a link the page clicks: a blob URL in Chrome,
 * whose content scripts share the page's origin, and a data URL in Firefox,
 * where the page may not load a blob URL a content script made.
 */
export function saveTextFile(name: string, text: string, mime = 'application/json'): void {
    const link = document.createElement('a')
    const blobUrl = import.meta.env.FIREFOX
        ? null
        : URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }))
    link.href = blobUrl ?? `data:${mime};charset=utf-8,${encodeURIComponent(text)}`
    link.download = name
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    link.remove()
    // The click has queued the download; the URL can go once that has started.
    if (blobUrl) setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
}
