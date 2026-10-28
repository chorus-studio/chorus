import { describe, expect, it } from 'vitest'
import { bezierAt, monotonePath } from './eq-curve'

// Pull the bézier control points back out of the path so the curve can be
// sampled between the knots.
function segments(d: string) {
    const [start, ...rest] = d.split(/(?=[MC])/).map((s) => s.trim())
    let [x0, y0] = start.slice(1).split(',').map(Number)
    return rest.map((seg) => {
        const [c1, c2, p] = seg
            .slice(1)
            .split(' ')
            .map((pair) => pair.split(',').map(Number))
        const out = { x0, y0, c1, c2, x1: p[0], y1: p[1] }
        x0 = p[0]
        y0 = p[1]
        return out
    })
}

function sample(d: string, steps = 20) {
    return segments(d).flatMap((s) =>
        Array.from({ length: steps + 1 }, (_, k) => {
            const t = k / steps
            return {
                x: bezierAt(s.x0, s.c1[0], s.c2[0], s.x1, t),
                y: bezierAt(s.y0, s.c1[1], s.c2[1], s.y1, t)
            }
        })
    )
}

describe('monotonePath', () => {
    const knots = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

    it('passes through every knob', () => {
        const pts = knots.map((x, i) => ({
            x: x * 40,
            y: [50, 20, 80, 80, 10, 90, 50, 50, 30, 70][i]
        }))
        const segs = segments(monotonePath(pts))
        expect(segs).toHaveLength(9)
        segs.forEach((s, i) => {
            expect(s.x1).toBeCloseTo(pts[i + 1].x, 1)
            expect(s.y1).toBeCloseTo(pts[i + 1].y, 1)
        })
    })

    it('never overshoots the knobs: a lone boost does not dip its neighbours', () => {
        // Flat except one band up: the curve must stay between flat and the peak.
        const ys = [50, 50, 50, 50, 10, 50, 50, 50, 50, 50]
        const pts = knots.map((x, i) => ({ x: x * 40, y: ys[i] }))
        for (const { y } of sample(monotonePath(pts))) {
            expect(y).toBeGreaterThanOrEqual(10 - 1e-6)
            expect(y).toBeLessThanOrEqual(50 + 1e-6)
        }
    })

    it('draws a flat run flat', () => {
        const pts = knots.map((x) => ({ x: x * 40, y: 42 }))
        for (const { y } of sample(monotonePath(pts))) expect(y).toBeCloseTo(42, 6)
    })

    it('keeps a ramp monotone', () => {
        const pts = knots.map((x, i) => ({ x: x * 40, y: 100 - i * 9 }))
        const ys = sample(monotonePath(pts)).map((p) => p.y)
        for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeLessThanOrEqual(ys[i - 1] + 1e-6)
    })

    it('handles the degenerate sizes', () => {
        expect(monotonePath([])).toBe('')
        expect(monotonePath([{ x: 3, y: 4 }])).toBe('M3,4')
    })
})
