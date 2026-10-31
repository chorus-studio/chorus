import { describe, expect, it } from 'vitest'
import {
    LOOK_FILE_FORMAT,
    adoptLook,
    lookFileName,
    lookWallpaperId,
    parseLookFile,
    sanitiseBackdrop,
    sanitiseLook,
    sanitiseWallpaper,
    serialiseLookFile
} from './look-file'
import { BUILTIN_LOOKS, type Look } from '$lib/types/look'
import type { StoredWallpaper } from './wallpapers'

const aurora = BUILTIN_LOOKS[0]
const pixel = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA=='
const wallpaper: StoredWallpaper = {
    mime: 'image/webp',
    data: 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==',
    width: 1,
    height: 1,
    bytes: 34,
    animated: false
}
const withPicture: Look = {
    id: 'mine-1',
    name: 'Beach',
    palette: { kind: 'colours', base: '#10263a', accent: '#ffb36b' },
    backdrop: {
        kind: 'image',
        source: { type: 'file', id: 'mine-1.k2' },
        info: {
            name: 'beach.jpg',
            mime: 'image/webp',
            width: 1,
            height: 1,
            bytes: 34,
            animated: false,
            thumb: pixel
        },
        fit: 'cover',
        anchor: 'center',
        dim: 35,
        blur: 0,
        saturate: 100,
        tint: true,
        animate: true
    },
    panels: { showThrough: 30, glass: true },
    createdAt: 1,
    updatedAt: 2
}

describe('serialiseLookFile / parseLookFile', () => {
    it('round-trips a look and its picture, and never marks it built-in', () => {
        const text = serialiseLookFile({ ...aurora }, '2.11.0')
        const file = JSON.parse(text)
        expect(file).toMatchObject({
            app: 'chorus',
            kind: 'look',
            format: LOOK_FILE_FORMAT,
            version: '2.11.0'
        })
        expect(file.look.builtIn).toBeUndefined()
        expect(file.wallpaper).toBeUndefined()
        expect(parseLookFile(text).look).toEqual({ ...aurora, builtIn: undefined })

        const parsed = parseLookFile(serialiseLookFile(withPicture, '2.11.0', wallpaper))
        expect(parsed).toEqual({ look: withPicture, wallpaper, missingPicture: false })
    })

    it('rejects what is not JSON, not a look, or from a newer Chorus', () => {
        expect(() => parseLookFile('{nope')).toThrow('not JSON')
        expect(() => parseLookFile('{"app":"chorus","kind":"backup"}')).toThrow('not a Chorus look')
        expect(() =>
            parseLookFile(JSON.stringify({ app: 'chorus', kind: 'look', format: 99, look: aurora }))
        ).toThrow('newer Chorus')
        expect(() =>
            parseLookFile(
                JSON.stringify({ app: 'chorus', kind: 'look', format: 1, look: { id: 'x' } })
            )
        ).toThrow('damaged')
    })

    it('drops a kept picture the file does not carry, and says so', () => {
        const parsed = parseLookFile(serialiseLookFile(withPicture, '2.11.0'))
        expect(parsed.missingPicture).toBe(true)
        expect(parsed.look.backdrop).toBeNull()
        expect(parsed.wallpaper).toBeNull()
    })

    it('ignores a picture a look does not name', () => {
        const parsed = parseLookFile(serialiseLookFile(aurora, '2.11.0', wallpaper))
        expect(parsed.wallpaper).toBeNull()
    })

    it('names the file after the look', () => {
        expect(lookFileName({ name: 'Northern lights' })).toBe('chorus-look-northern-lights.json')
        expect(lookFileName({ name: '  ✨ ' })).toBe('chorus-look-look.json')
        expect(lookFileName({ name: 'Café / Été' })).toBe('chorus-look-cafe-ete.json')
    })
})

describe('sanitiseLook', () => {
    it('falls back and clamps field by field, and keeps the id', () => {
        const look = sanitiseLook({
            id: 'abc',
            name: '  Loud  ',
            palette: { kind: 'builtin', name: 'not-a-theme' },
            backdrop: {
                kind: 'gradient',
                type: 'spiral',
                angle: 999,
                origin: 'nowhere',
                drift: 'yes',
                stops: [
                    { color: '#fff', at: 150 },
                    { color: 'red', at: 1 },
                    { color: '#000000', at: -5 }
                ]
            },
            panels: { showThrough: 150, glass: 1 },
            createdAt: 'then'
        })
        expect(look).toMatchObject({
            id: 'abc',
            name: 'Loud',
            palette: { kind: 'builtin', name: 'spotify' },
            backdrop: {
                kind: 'gradient',
                type: 'linear',
                angle: 360,
                origin: 'center',
                drift: false,
                stops: [
                    { color: '#ffffff', at: 100 },
                    { color: '#000000', at: 0 }
                ]
            },
            panels: { showThrough: 100, glass: false }
        })
        expect(typeof look?.createdAt).toBe('number')
    })

    it('completes a partial slots palette and keeps a colour seed', () => {
        const slots = sanitiseLook({
            name: 'S',
            palette: {
                kind: 'slots',
                colours: { main: '121212', button: '#1ed760', bogus: '#fff' }
            }
        })
        expect(slots?.palette.kind).toBe('slots')
        if (slots?.palette.kind === 'slots') {
            expect(slots.palette.colours.main).toBe('#121212')
            expect(slots.palette.colours.button).toBe('#1ed760')
            expect(Object.keys(slots.palette.colours)).toHaveLength(15)
            expect((slots.palette.colours as Record<string, string>).bogus).toBeUndefined()
        }
        const seed = sanitiseLook({
            name: 'C',
            palette: { kind: 'colours', base: 'ABC', accent: '#123456', text: 'nope' }
        })
        expect(seed?.palette).toEqual({ kind: 'colours', base: '#aabbcc', accent: '#123456' })
    })

    it("keeps a palette that follows the cover, and a video file's info", () => {
        expect(
            sanitiseLook({ name: 'Live', palette: { kind: 'cover', extra: 1 } })?.palette
        ).toEqual({
            kind: 'cover'
        })
        const video = sanitiseBackdrop({
            kind: 'image',
            source: { type: 'file', id: 'v1' },
            info: {
                name: 'loop.mp4',
                mime: 'video/mp4',
                thumb: pixel,
                animated: true,
                video: true,
                duration: 12.4
            }
        })
        expect(video?.kind === 'image' && video.info).toMatchObject({
            video: true,
            duration: 12.4,
            animated: true
        })
    })

    it('keeps a look on the default show-through when it has no value of its own', () => {
        expect(sanitiseLook({ name: 'D', panels: { glass: true } })?.panels).toEqual({
            showThrough: null,
            glass: true
        })
        expect(sanitiseLook({ name: 'D', panels: { showThrough: null } })?.panels.showThrough).toBe(
            null
        )
        expect(sanitiseLook({ name: 'D', panels: { showThrough: 40 } })?.panels.showThrough).toBe(
            40
        )
    })

    it('returns null for anything without a name', () => {
        expect(sanitiseLook(null)).toBeNull()
        expect(sanitiseLook({ id: 'x' })).toBeNull()
        expect(sanitiseLook({ name: '   ' })).toBeNull()
    })
})

describe('sanitiseBackdrop', () => {
    it('keeps only https links and data-URL thumbnails for a picture', () => {
        expect(
            sanitiseBackdrop({ kind: 'image', source: { type: 'url', url: 'http://x/a.jpg' } })
        ).toBeNull()
        expect(
            sanitiseBackdrop({ kind: 'image', source: { type: 'url', url: 'javascript:alert(1)' } })
        ).toBeNull()
        const ok = sanitiseBackdrop({
            kind: 'image',
            source: { type: 'url', url: 'https://x/a.jpg' },
            info: { name: 'a', mime: 'image/jpeg', thumb: 'https://tracker/pixel.gif' },
            fit: 'stretch',
            dim: -10,
            blur: 400,
            saturate: 150
        })
        expect(ok).toEqual({
            kind: 'image',
            source: { type: 'url', url: 'https://x/a.jpg' },
            fit: 'cover',
            anchor: 'center',
            dim: 0,
            blur: 40,
            saturate: 150,
            tint: true,
            animate: true
        })
    })

    it("keeps a gradient's repeat and shape, dropping a shape it does not know", () => {
        const rings = sanitiseBackdrop({
            kind: 'gradient',
            type: 'radial',
            repeat: true,
            shape: 'circle',
            stops: [
                { color: '#f00', at: 0 },
                { color: '#00f', at: 20 }
            ]
        })
        expect(rings).toMatchObject({
            kind: 'gradient',
            type: 'radial',
            repeat: true,
            shape: 'circle'
        })
        const odd = sanitiseBackdrop({
            kind: 'gradient',
            type: 'radial',
            repeat: 'yes',
            shape: 'square',
            stops: [
                { color: '#f00', at: 0 },
                { color: '#00f', at: 20 }
            ]
        })
        expect(odd && 'repeat' in odd).toBe(false)
        expect(odd && 'shape' in odd).toBe(false)
    })

    it('needs at least two usable stops for a gradient, and clamps a cover', () => {
        expect(sanitiseBackdrop({ kind: 'gradient', stops: [{ color: '#fff', at: 0 }] })).toBeNull()
        expect(sanitiseBackdrop({ kind: 'cover', blur: 100, dim: 100, zoom: 10 })).toEqual({
            kind: 'cover',
            blur: 40,
            dim: 80,
            zoom: 100
        })
        expect(sanitiseBackdrop({ kind: 'video' })).toBeNull()
    })
})

describe('sanitiseWallpaper', () => {
    it('takes an image or video record with base64 bytes and nothing else', () => {
        expect(sanitiseWallpaper(wallpaper)).toEqual(wallpaper)
        expect(sanitiseWallpaper({ ...wallpaper, mime: 'text/html' })).toBeNull()
        expect(sanitiseWallpaper({ ...wallpaper, data: '<script>' })).toBeNull()
        expect(sanitiseWallpaper({ ...wallpaper, still: 'https://x/y.png' })).toEqual(wallpaper)
        expect(sanitiseWallpaper({ mime: 'video/mp4', data: 'AAAA' })).toMatchObject({
            mime: 'video/mp4',
            bytes: 3,
            animated: false
        })
    })
})

describe('adoptLook / lookWallpaperId', () => {
    it('gives an import a fresh id and moves its picture to a fresh wallpaper id', () => {
        const parsed = parseLookFile(serialiseLookFile(withPicture, '2.11.0', wallpaper))
        const adopted = adoptLook(parsed, 'new-id', 'new-id.w')
        expect(adopted.id).toBe('new-id')
        expect(lookWallpaperId(adopted)).toBe('new-id.w')
        expect(adopted.createdAt).toBeGreaterThan(withPicture.createdAt)
        expect(lookWallpaperId(aurora)).toBeNull()
    })
})
