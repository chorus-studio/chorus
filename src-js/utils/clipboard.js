export const copyToClipBoard = (text) => {
    navigator.clipboard
        .writeText(text)
        .then(() => {
            console.log(`Copied ${text} to clipboard`)
        })
        .catch((err) => {
            console.error(`Error copying text to clipboard: ${err}`)
        })
}
