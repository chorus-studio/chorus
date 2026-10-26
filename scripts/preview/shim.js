// Stand-in for the chrome.* extension APIs so the built preview page runs from a
// plain static server. Storage is seeded so the player-bar controls show their
// active states (liked, looping, snip, per-track rate).
;(() => {
    const seed = {
        chorus_now_playing: {
            song_id: '1',
            track_id: '1',
            id: '1',
            url: null,
            liked: true,
            cover: null,
            title: 'Midnight City',
            artist: 'M83',
            duration: 244,
            current: 96,
            album_id: null,
            text_colour: '#ffffff',
            bg_colour: '#000000',
            snip: { start_time: 62, end_time: 148, is_shared: false, last_updated: 'end' },
            playback: { rate: { value: 1.25, preserves_pitch: true }, pitch: 0, semitone: 0 },
            blocked: false
        },
        chorus_loop: { type: 'amount', amount: 3, iteration: 2, looping: true }
    }
    const data = { ...seed }
    const evt = () => ({ addListener() {}, removeListener() {}, hasListener: () => false })
    const area = {
        get(keys) {
            const out = {}
            if (keys == null) Object.assign(out, data)
            else if (typeof keys === 'string') {
                if (keys in data) out[keys] = data[keys]
            } else if (Array.isArray(keys))
                keys.forEach((k) => {
                    if (k in data) out[k] = data[k]
                })
            else
                Object.keys(keys).forEach((k) => {
                    out[k] = k in data ? data[k] : keys[k]
                })
            return Promise.resolve(out)
        },
        set(items) {
            Object.assign(data, items)
            return Promise.resolve()
        },
        remove(keys) {
            ;[].concat(keys).forEach((k) => delete data[k])
            return Promise.resolve()
        },
        clear() {
            for (const k in data) delete data[k]
            return Promise.resolve()
        },
        getBytesInUse: () => Promise.resolve(0),
        onChanged: evt()
    }
    const port = () => ({
        postMessage() {},
        disconnect() {},
        onMessage: evt(),
        onDisconnect: evt()
    })
    const chrome = {
        storage: { local: area, session: area, sync: area, onChanged: evt() },
        runtime: {
            id: 'preview',
            lastError: undefined,
            getURL: (p) => new URL(String(p).replace(/^\//, ''), location.origin + '/').href,
            sendMessage: () => Promise.resolve(),
            connect: port,
            onMessage: evt(),
            onConnect: evt(),
            getManifest: () => ({ version: '0.0.0', manifest_version: 3 })
        },
        tabs: {
            query: () => Promise.resolve([]),
            create: () => Promise.resolve({}),
            update: () => Promise.resolve({}),
            sendMessage: () => Promise.resolve()
        },
        commands: { getAll: () => Promise.resolve([]) }
    }
    globalThis.chrome = chrome
    globalThis.browser = chrome
})()
