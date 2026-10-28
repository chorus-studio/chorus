// The response curve drawn behind the EQ faders: a smooth line through the
// fader knobs that never overshoots them (monotone cubic interpolation, the
// same shaping d3's curveMonotoneX uses), so a flat run of bands draws flat
// and a single boosted band does not dip its neighbours.

export type Point = { x: number; y: number }

/** An SVG path through `points` (ascending x), as cubic béziers. */
export function monotonePath(points: Point[]): string {
    const n = points.length
    if (n === 0) return ''
    if (n === 1) return `M${points[0].x},${points[0].y}`

    const dx: number[] = []
    const secant: number[] = []
    for (let i = 0; i < n - 1; i++) {
        dx[i] = points[i + 1].x - points[i].x
        secant[i] = (points[i + 1].y - points[i].y) / dx[i]
    }

    // Tangent at each knot: the mean of the neighbouring secants, zero at a
    // local peak or trough so the curve turns there instead of overshooting.
    const tangent: number[] = new Array(n).fill(0)
    tangent[0] = secant[0]
    tangent[n - 1] = secant[n - 2]
    for (let i = 1; i < n - 1; i++) {
        tangent[i] = secant[i - 1] * secant[i] <= 0 ? 0 : (secant[i - 1] + secant[i]) / 2
    }
    // Fritsch–Carlson: keep each segment monotone by capping its tangents.
    for (let i = 0; i < n - 1; i++) {
        if (secant[i] === 0) {
            tangent[i] = 0
            tangent[i + 1] = 0
            continue
        }
        const a = tangent[i] / secant[i]
        const b = tangent[i + 1] / secant[i]
        const s = a * a + b * b
        if (s > 9) {
            const tau = 3 / Math.sqrt(s)
            tangent[i] = tau * a * secant[i]
            tangent[i + 1] = tau * b * secant[i]
        }
    }

    const f = (v: number) => Math.round(v * 100) / 100
    let d = `M${f(points[0].x)},${f(points[0].y)}`
    for (let i = 0; i < n - 1; i++) {
        const h = dx[i] / 3
        const c1x = points[i].x + h
        const c1y = points[i].y + tangent[i] * h
        const c2x = points[i + 1].x - h
        const c2y = points[i + 1].y - tangent[i + 1] * h
        d += ` C${f(c1x)},${f(c1y)} ${f(c2x)},${f(c2y)} ${f(points[i + 1].x)},${f(points[i + 1].y)}`
    }
    return d
}

/** Sample a cubic bézier at t. */
export function bezierAt(p0: number, p1: number, p2: number, p3: number, t: number): number {
    const u = 1 - t
    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3
}
