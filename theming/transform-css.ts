import path from 'path'
import { readFile, writeFile } from 'fs/promises'

const cssPath = path.resolve('theming/dynamic.css')
const mapPath = path.resolve('theming/css-map.json')
const outputPath = path.resolve('src/entrypoints/dynamic-theme.content.css')

async function main() {
    const [css, rawMap] = await Promise.all([
        readFile(cssPath, 'utf-8'),
        readFile(mapPath, 'utf-8')
    ])

    const map = JSON.parse(rawMap) as Record<string, string>

    // Invert the map: readable class -> [minified class names]
    const reverseMap = Object.entries(map).reduce(
        (acc, [minified, readable]) => {
            if (!acc[readable]) acc[readable] = []
            acc[readable].push(minified)
            return acc
        },
        {} as Record<string, string[]>
    )

    // Replace class names in CSS
    const transformed = css.replace(/\.(\w[\w-]*)/g, (match, className) => {
        if (reverseMap[className]) {
            return reverseMap[className].map((min) => `.${min}`).join(',\n')
        }
        return match // leave untouched
    })

    await writeFile(outputPath, transformed)
    console.log(`✅ theme.css has been ${css.includes('theme.css') ? 'updated' : 'created'}.`)
}

main().catch((err) => {
    console.error('❌ Error transforming CSS:', err)
    process.exit(1)
})
