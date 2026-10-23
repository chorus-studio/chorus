// Procedural lo-fi backing track for the promo: 120 BPM, 25 bars, 50 s, 44.1 kHz stereo.
// Everything is synthesised here so the project ships with no licensed audio.
// Kick pattern is mirrored in src/Promo.tsx (kickEnv) so the picture pulses on the beat.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SR = 44100
const BPM = 120
const BARS = 25
const beat = 60 / BPM
const bar = beat * 4
const DUR = BARS * bar
const N = Math.ceil(SR * DUR)

const drumsL = new Float32Array(N), drumsR = new Float32Array(N)
const bassL = new Float32Array(N), bassR = new Float32Array(N)
const padL = new Float32Array(N), padR = new Float32Array(N)
const sendL = new Float32Array(N), sendR = new Float32Array(N)

let seed = 1337
const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
}
const midi = (m) => 440 * 2 ** ((m - 69) / 12)

// Am7 · Fmaj7 · C/G · G6 — close voicings, one chord per bar
const CHORDS = [
    [57, 60, 64, 67],
    [53, 57, 60, 64],
    [55, 60, 64, 67],
    [55, 59, 62, 64]
]
const ROOTS = [33, 29, 36, 31]

function addKick(t0, amp = 1) {
    const n0 = Math.floor(t0 * SR)
    const len = Math.floor(0.36 * SR)
    let ph = 0
    for (let i = 0; i < len && n0 + i < N; i++) {
        const t = i / SR
        const f = 44 + 115 * Math.exp(-t / 0.042)
        ph += (2 * Math.PI * f) / SR
        const env = Math.exp(-t / 0.12) * (1 - Math.exp(-t / 0.0015))
        const v = (Math.sin(ph) + 0.12 * Math.sin(2 * ph)) * env * amp * 0.95
        drumsL[n0 + i] += v
        drumsR[n0 + i] += v
    }
}

function addNoise(t0, { decay, amp, hp, lp, pan = 0, send = 0, into = 'drums' }) {
    const n0 = Math.floor(t0 * SR)
    const len = Math.floor(decay * 6 * SR)
    const aLp = 1 - Math.exp((-2 * Math.PI * lp) / SR)
    const aHp = Math.exp((-2 * Math.PI * hp) / SR)
    let lpY = 0, hpY = 0, hpX = 0
    const gl = Math.min(1, 1 - pan), gr = Math.min(1, 1 + pan)
    const L = into === 'pad' ? padL : drumsL
    const R = into === 'pad' ? padR : drumsR
    for (let i = 0; i < len && n0 + i < N; i++) {
        const t = i / SR
        const x = (rnd() * 2 - 1) * Math.exp(-t / decay)
        lpY += aLp * (x - lpY)
        hpY = aHp * (hpY + lpY - hpX)
        hpX = lpY
        const v = hpY * amp
        L[n0 + i] += v * gl
        R[n0 + i] += v * gr
        sendL[n0 + i] += v * gl * send
        sendR[n0 + i] += v * gr * send
    }
}

function addRiser(t0, dur, amp) {
    const n0 = Math.floor(t0 * SR)
    const len = Math.floor(dur * SR)
    let y = 0
    for (let i = 0; i < len && n0 + i < N; i++) {
        const p = i / len
        const fc = 180 + 7000 * p * p
        const a = 1 - Math.exp((-2 * Math.PI * fc) / SR)
        const x = rnd() * 2 - 1
        y += a * (x - y)
        const v = y * amp * p * p
        padL[n0 + i] += v * 0.8
        padR[n0 + i] += v * 0.8
    }
}

function addBass(t0, m, dur, amp) {
    const n0 = Math.floor(t0 * SR)
    const len = Math.floor(dur * SR)
    const f = midi(m)
    const a = 1 - Math.exp((-2 * Math.PI * 260) / SR)
    let ph = 0, y = 0
    for (let i = 0; i < len && n0 + i < N; i++) {
        const t = i / SR
        ph += (2 * Math.PI * f) / SR
        const env = Math.min(1, t / 0.006) * Math.exp(-t / (dur * 0.5))
        const saw = 2 * ((ph / (2 * Math.PI)) % 1) - 1
        const x = Math.sin(ph) * 0.85 + saw * 0.22
        y += a * (x - y)
        const v = y * env * amp
        bassL[n0 + i] += v
        bassR[n0 + i] += v
    }
}

function addPad(t0, dur, notes, amp) {
    const n0 = Math.floor(t0 * SR)
    const rel = 0.9
    const len = Math.floor((dur + rel) * SR)
    notes.forEach((m, k) => {
        const f = midi(m)
        let p1 = rnd(), p2 = rnd(), y = 0
        const pan = (k % 2 === 0 ? -0.4 : 0.4) * (k < 2 ? 1 : 0.5)
        const gl = 0.5 + 0.5 * (1 - pan) * 0.9
        const gr = 0.5 + 0.5 * (1 + pan) * 0.9
        for (let i = 0; i < len && n0 + i < N; i++) {
            const t = i / SR
            p1 = (p1 + f / SR) % 1
            p2 = (p2 + (f * 1.0045) / SR) % 1
            const tri = 1 - 4 * Math.abs(p1 - 0.5)
            const x = (2 * p1 - 1 + (2 * p2 - 1)) * 0.22 + tri * 0.5
            const fc = 650 + 380 * Math.sin(2 * Math.PI * 0.06 * (t0 + t))
            const a = 1 - Math.exp((-2 * Math.PI * fc) / SR)
            y += a * (x - y)
            const env = Math.min(1, t / 0.5) * (t < dur ? 1 : Math.exp(-(t - dur) / 0.35))
            const v = y * env * amp
            padL[n0 + i] += v * gl
            padR[n0 + i] += v * gr
            sendL[n0 + i] += v * gl * 0.3
            sendR[n0 + i] += v * gr * 0.3
        }
    })
}

// ---- arrangement -------------------------------------------------------
const kickTimes = []
for (let b = 0; b < BARS; b++) {
    const t0 = b * bar
    const chord = b >= 23 ? CHORDS[0] : CHORDS[b % 4]
    const root = ROOTS[b % 4]
    const padAmp = b < 2 ? 0.13 : b >= 23 ? 0.15 : 0.17
    addPad(t0, bar, chord, padAmp)

    if (b >= 1 && b <= 22) {
        for (let e = 0; e < 8; e++) {
            const open = e === 7
            addNoise(t0 + (e * beat) / 2, {
                decay: open ? 0.13 : 0.035,
                amp: (e % 2 === 0 ? 0.2 : 0.13) * (b < 2 ? 0.45 : 1),
                hp: 7500,
                lp: 15000,
                pan: 0.25,
                send: 0.3
            })
        }
    }
    if (b >= 2 && b <= 22) {
        addKick(t0, 1)
        addKick(t0 + 2 * beat, 0.95)
        kickTimes.push(t0, t0 + 2 * beat)
        if (b % 2 === 1) addKick(t0 + 3.5 * beat, 0.5)
    }
    if (b >= 4 && b <= 22) {
        addNoise(t0 + beat, { decay: 0.085, amp: 0.48, hp: 900, lp: 5200, send: 0.35 })
        addNoise(t0 + 3 * beat, { decay: 0.085, amp: 0.48, hp: 900, lp: 5200, send: 0.35 })
    }
    if (b >= 2 && b <= 22) {
        const pat = [0, 0.75, 1.5, 2, 2.75, 3.5]
        pat.forEach((p, k) => addBass(t0 + p * beat, root + (k === 5 && b % 4 === 3 ? 2 : 0), 0.3, 0.4))
    }
}
addRiser(1 * bar, bar, 0.2)
addNoise(2 * bar, { decay: 0.7, amp: 0.3, hp: 2500, lp: 10000, send: 0.5 })
addKick(24 * bar, 1)
kickTimes.push(24 * bar)
addNoise(24 * bar, { decay: 1.0, amp: 0.26, hp: 2500, lp: 9000, send: 0.5 })

// sidechain envelope for the pad
const duck = new Float32Array(N)
for (const tk of kickTimes) {
    const n0 = Math.floor(tk * SR)
    const len = Math.floor(0.5 * SR)
    for (let i = 0; i < len && n0 + i < N; i++) {
        const d = Math.exp(-(i / SR) / 0.16)
        if (d > duck[n0 + i]) duck[n0 + i] = d
    }
}

// ping-pong delay on the send bus (dotted eighth)
const D = Math.floor(0.375 * SR)
const dl = new Float32Array(N), dr = new Float32Array(N)
let fl = 0, fr = 0
const aF = 1 - Math.exp((-2 * Math.PI * 3200) / SR)
for (let n = 0; n < N; n++) {
    const inL = sendL[n] + (n >= D ? dr[n - D] * 0.42 : 0)
    const inR = sendR[n] + (n >= D ? dl[n - D] * 0.42 : 0)
    fl += aF * (inL - fl)
    fr += aF * (inR - fr)
    dl[n] = fl
    dr[n] = fr
}

// master
const outL = new Float32Array(N), outR = new Float32Array(N)
let peak = 0
for (let n = 0; n < N; n++) {
    const g = 1 - 0.55 * duck[n]
    const t = n / SR
    const fade = t > DUR - 2.2 ? Math.max(0, (DUR - t) / 2.2) : 1
    const l = (drumsL[n] + bassL[n] + padL[n] * g + dl[n] * 0.45) * fade
    const r = (drumsR[n] + bassR[n] + padR[n] * g + dr[n] * 0.45) * fade
    outL[n] = l
    outR[n] = r
    peak = Math.max(peak, Math.abs(l), Math.abs(r))
}
const norm = 0.92 / peak
const wav = Buffer.alloc(44 + N * 4)
wav.write('RIFF', 0)
wav.writeUInt32LE(36 + N * 4, 4)
wav.write('WAVE', 8)
wav.write('fmt ', 12)
wav.writeUInt32LE(16, 16)
wav.writeUInt16LE(1, 20)
wav.writeUInt16LE(2, 22)
wav.writeUInt32LE(SR, 24)
wav.writeUInt32LE(SR * 4, 28)
wav.writeUInt16LE(4, 32)
wav.writeUInt16LE(16, 34)
wav.write('data', 36)
wav.writeUInt32LE(N * 4, 40)
for (let n = 0; n < N; n++) {
    const l = Math.tanh(outL[n] * norm * 1.15) / 1.15
    const r = Math.tanh(outR[n] * norm * 1.15) / 1.15
    wav.writeInt16LE(Math.round(l * 32767), 44 + n * 4)
    wav.writeInt16LE(Math.round(r * 32767), 46 + n * 4)
}
const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'public')
mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'track.wav'), wav)
console.log(`wrote public/track.wav · ${DUR}s · ${(wav.length / 1e6).toFixed(1)} MB`)
