function calculateColourPercentage(pixels, colour, tolerance = 100) {
    // Each pixel has 4 components (R, G, B, A)
    const totalPixels = pixels.length / 4

    let count = 0
    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i]
        const g = pixels[i + 1]
        const b = pixels[i + 2]

        // Euclidean distance between colours
        const distance = Math.sqrt(
            Math.pow(r - colour[0], 2) + Math.pow(g - colour[1], 2) + Math.pow(b - colour[2], 2)
        )
        if (distance <= tolerance) count++
    }

    return (count / totalPixels) * 100
}

function kmeans(data, options) {
    const k = options.k
    const tolerance = options.tolerance || 1e-6
    const maxIterations = options.maxIterations || 100

    let centroids = data.slice(0, k)

    for (let iter = 0; iter < maxIterations; iter++) {
        const clusters = Array.from({ length: k }, () => [])

        for (const point of data) {
            let minDist = Infinity
            let clusterIndex = -1

            for (let i = 0; i < k; i++) {
                const dist = point.reduce((acc, dim, j) => acc + (dim - centroids[i][j]) ** 2, 0)

                if (dist < minDist) {
                    minDist = dist
                    clusterIndex = i
                }
            }

            clusters[clusterIndex].push(point)
        }

        const newCentroids = clusters.map((cluster) => {
            return cluster.reduce(
                (acc, point) => point.map((dim, i) => acc[i] + dim / cluster.length),
                Array(data[0].length).fill(0)
            )
        })

        const converged = centroids.every((centroid, i) =>
            centroid.every((dim, j) => Math.abs(dim - newCentroids[i][j]) < tolerance)
        )

        if (converged) break
        centroids = newCentroids
    }

    return { centroids }
}

function getPalette(pixels) {
    const colourCounts = {}
    const pixelArray = []

    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i]
        const g = pixels[i + 1]
        const b = pixels[i + 2]

        const colour = [r, g, b]
        pixelArray.push(colour)

        colourCounts[colour] ? colourCounts[colour]++ : (colourCounts[colour] = 1)
    }

    const result = kmeans(pixelArray, { k: 100, tolerance: 100 })

    const palette = result.centroids.map((centroid) => {
        const colour = `rgb(${Math.round(centroid[0])}, ${Math.round(centroid[1])}, ${Math.round(centroid[2])})`
        const percentage = calculateColourPercentage(pixels, centroid)
        return {
            colour,
            percentage,
            base: [Math.round(centroid[0]), Math.round(centroid[1]), Math.round(centroid[2])]
        }
    })

    const sortedPalette = palette.sort((a, b) => b.percentage - a.percentage)
    return sortedPalette
}

function getImageData(img) {
    const canvas = document.getElementById('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0, img.width, img.height)

    return ctx.getImageData(0, 0, canvas.width, canvas.height).data
}

function calculateLuminance([r, g, b]) {
    const gamma = 2.2
    const rLinear = r / 255
    const gLinear = g / 255
    const bLinear = b / 255

    return (
        0.2126 * Math.pow(rLinear, gamma) +
        0.7152 * Math.pow(gLinear, gamma) +
        0.0722 * Math.pow(bLinear, gamma)
    )
}

function sortColoursByProximityAndLuminance(colours) {
    const colourGroups = {}
    colours.forEach((colour) => {
        const baseColour = colour.base.toString()
        if (!colourGroups[baseColour]) colourGroups[baseColour] = []

        colourGroups[baseColour].push(colour)
    })

    // Sort each colour group by luminance
    for (const baseColour in colourGroups) {
        colourGroups[baseColour].sort((a, b) => {
            const luminanceA = calculateLuminance(a.base)
            const luminanceB = calculateLuminance(b.base)
            // Sort by luminance in descending order (darker colours first)
            return luminanceB - luminanceA
        })
    }

    const sortedColours = []
    for (const baseColour in colourGroups) {
        sortedColours.push(...colourGroups[baseColour])
    }

    return sortedColours
}

function getContrastColour(backgroundRGB, textColourRGB, targetContrast = 7) {
    function getRelativeLuminance(colourRGB) {
        const [R, G, B] = colourRGB.map((value) => {
            const sRGB = value / 255
            return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4)
        })

        return 0.2126 * R + 0.7152 * G + 0.0722 * B
    }

    const L1 = getRelativeLuminance(backgroundRGB)

    // Calculate the required luminance of the text colour for the desired contrast ratio.
    const L2 = L1 + targetContrast * 0.05

    // Function to adjust a single channel's value while staying in the [0, 255] range and making it lighter.
    function adjustChannelLight(currentValue, L2, L1) {
        return Math.min(255, Math.max(currentValue, Math.round((L1 / L2) * currentValue)))
    }

    const adjustedColourLight = [
        adjustChannelLight(textColourRGB[0], L2, L1),
        adjustChannelLight(textColourRGB[1], L2, L1),
        adjustChannelLight(textColourRGB[2], L2, L1)
    ]

    const adjustedContrastLight = getContrastRatio(adjustedColourLight, backgroundRGB)
    if (adjustedContrastLight >= 4.5) return `rgb(${adjustedColourLight.join(', ')})`

    // Adjust a single channel's value while staying in the [0, 255] range and making it darker.
    function adjustChannelDark(currentValue, L2, L1) {
        return Math.min(currentValue, Math.max(0, Math.round((L2 / L1) * currentValue)))
    }

    const adjustedColourDark = [
        adjustChannelDark(textColourRGB[0], L2, L1),
        adjustChannelDark(textColourRGB[1], L2, L1),
        adjustChannelDark(textColourRGB[2], L2, L1)
    ]

    const adjustedContrastDark = getContrastRatio(adjustedColourDark, backgroundRGB)
    if (adjustedContrastDark >= 4.5) return `rgb(${adjustedColourDark.join(', ')})`

    const contrastWithBlack = getContrastRatio(backgroundRGB, [0, 0, 0])
    const contrastWithWhite = getContrastRatio(backgroundRGB, [255, 255, 255])

    // favour white text
    if (Math.abs(contrastWithWhite - contrastWithBlack) <= 1) return 'rgb(255, 255, 255)'
    return contrastWithBlack > contrastWithWhite ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)'
}

function getContrastRatio(foregroundRGB, backgroundRGB) {
    const L1 = getRelativeLuminance(foregroundRGB)
    const L2 = getRelativeLuminance(backgroundRGB)

    if (L1 > L2) return (L1 + 0.05) / (L2 + 0.05)

    return (L2 + 0.05) / (L1 + 0.05)
}

function getRelativeLuminance(colourRGB) {
    const [R, G, B] = colourRGB.map((value) => {
        const sRGB = value / 255
        if (sRGB <= 0.03928) return sRGB / 12.92

        return Math.pow((sRGB + 0.055) / 1.055, 2.4)
    })

    return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

function calculateEuclideanDistance(rgb1, rgb2) {
    return Math.sqrt(
        Math.pow(rgb2[0] - rgb1[0], 2) +
            Math.pow(rgb2[1] - rgb1[1], 2) +
            Math.pow(rgb2[2] - rgb1[2], 2)
    )
}

function findElementWithMaxDistance(initialRgb, colours) {
    let maxDistance = -1
    let elementWithMaxDistance = null

    for (let i = 0; i < colours.length; i++) {
        const currentDistance = calculateEuclideanDistance(initialRgb, colours.at(i).base)

        if (currentDistance > maxDistance) {
            maxDistance = currentDistance
            elementWithMaxDistance = colours.at(i)
        }
    }

    return elementWithMaxDistance
}

function getImageBackgroundAndTextColours(imageElement) {
    const imageData = getImageData(imageElement)
    const palette = getPalette(imageData)
    const sortedPalette = sortColoursByProximityAndLuminance(palette.slice())

    const background = sortedPalette.at(0)
    const filteredPalette = sortedPalette
        .slice(1)
        .filter(({ colour, percentage }) => percentage > 0 && colour != 'rgb(0, 0, 0)')
    const nextPrimary = findElementWithMaxDistance(background.base, filteredPalette)

    return {
        backgroundColour: background.colour,
        textColour: getContrastColour(background.base, nextPrimary?.base ?? [255, 255, 255])
    }
}

export { getImageBackgroundAndTextColours }
