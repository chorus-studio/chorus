# Changelog


## v2.10.0

[compare changes](https://github.com/chorus-studio/chorus/compare/v2.9.0...v2.10.0)

### 🚀 Enhancements

- Add master on/off toggle for the extension ([4e635af](https://github.com/chorus-studio/chorus/commit/4e635af))
- **vocal:** Add real-time model-based vocal separation ([1450d7f](https://github.com/chorus-studio/chorus/commit/1450d7f))
- **effects:** Add live reverb config and EQ band editors ([e0e66d9](https://github.com/chorus-studio/chorus/commit/e0e66d9))
- **reverb:** Split config editor into core and advanced params ([9165adb](https://github.com/chorus-studio/chorus/commit/9165adb))
- **reverb:** User-saved config presets + config UX polish ([4c1bd66](https://github.com/chorus-studio/chorus/commit/4c1bd66))
- **eq:** User-saved config presets + parity with reverb, context-aware reset ([072fbb7](https://github.com/chorus-studio/chorus/commit/072fbb7))

### 🩹 Fixes

- **player:** Self-heal Chorus controls when Spotify re-renders the now-playing bar ([7a90d2b](https://github.com/chorus-studio/chorus/commit/7a90d2b))
- **popup:** Match on/off power button color to other top-bar icons ([59850e2](https://github.com/chorus-studio/chorus/commit/59850e2))
- **eq:** Remap to a full-spectrum 10-band EQ ([a4cf761](https://github.com/chorus-studio/chorus/commit/a4cf761))
- **player:** Stop volume media keys from seeking via the progress bar ([6f2ef60](https://github.com/chorus-studio/chorus/commit/6f2ef60))
- **player:** Treat missing playback-position as unknown, not 0:00 ([0afd768](https://github.com/chorus-studio/chorus/commit/0afd768))
- **player:** Give playback duration the same null discipline as position ([73fc52a](https://github.com/chorus-studio/chorus/commit/73fc52a))
- **player:** Don't apply old track's snip state during track-change race ([43de544](https://github.com/chorus-studio/chorus/commit/43de544))
- **player:** Don't clamp seeks to the unknown-duration sentinel ([e5e966e](https://github.com/chorus-studio/chorus/commit/e5e966e))
- **player:** Clear old track's duration and detect song changes flag-free ([786e59f](https://github.com/chorus-studio/chorus/commit/786e59f))
- **snip:** Validate snip bounds before saving ([795c728](https://github.com/chorus-studio/chorus/commit/795c728))
- **spotify:** Follow renamed now-playing test ids and album query shape ([6d02658](https://github.com/chorus-studio/chorus/commit/6d02658))
- **skip:** Require a track id before blocking from the track list ([98cf824](https://github.com/chorus-studio/chorus/commit/98cf824))

### 💅 Refactors

- **views:** Merge settings and info into one switchable page ([98a1186](https://github.com/chorus-studio/chorus/commit/98a1186))
- **views:** Split fx ([eq into separate fx and eq tabs](https://github.com/chorus-studio/chorus/commit/eq into separate fx and eq tabs))
- **reverb:** Prune 8 near-duplicate presets with alias fallback ([10a2ee8](https://github.com/chorus-studio/chorus/commit/10a2ee8))

### 📦 Build

- **reverb:** AOT Faust worklet toolchain (jpverb + zita) ([aafcd04](https://github.com/chorus-studio/chorus/commit/aafcd04))
- **deps:** Pin svelte-sonner to the published 1.2.1 release ([e85ced5](https://github.com/chorus-studio/chorus/commit/e85ced5))
- **vocal:** Fetch rt_core_v1 model at build time from a release asset ([3d61535](https://github.com/chorus-studio/chorus/commit/3d61535))

### 🏡 Chore

- **vocal:** Drop dangling vocal-remove.js prototype reference ([94fb5d0](https://github.com/chorus-studio/chorus/commit/94fb5d0))
- **promo:** Ignore Remotion output and keep promo/ out of the sources zip ([0e23648](https://github.com/chorus-studio/chorus/commit/0e23648))

### 🤖 CI

- **release:** Wait for Chrome Web Store upload processing before publishing ([f62bccf](https://github.com/chorus-studio/chorus/commit/f62bccf))

### ❤️ Contributors

- Cdrani <charlesdrani@gmail.com>
- Charles ([@cdrani](https://github.com/cdrani))
- A6f00d6 <cdrani>

## v2.9.0

[compare changes](https://github.com/chorus-studio/chorus/compare/v2.8.3...v2.9.0)

### 🚀 Enhancements

- **background:** Add onboarding page on install and uninstall feedback URL ([0e4ae4e](https://github.com/chorus-studio/chorus/commit/0e4ae4e))

### 🩹 Fixes

- **volume:** Preserve muted state across page loads and track skips ([6575017](https://github.com/chorus-studio/chorus/commit/6575017))
- **audio:** Guard effect updates until audio chain is initialized ([0819c03](https://github.com/chorus-studio/chorus/commit/0819c03))
- **pip:** Resolve audio cutoff and seek in Picture-in-Picture ([ca3b7fc](https://github.com/chorus-studio/chorus/commit/ca3b7fc))
- **audio:** Reduce impulse reverb intensity and restore mono input for digital reverb ([19383f4](https://github.com/chorus-studio/chorus/commit/19383f4))
- **types:** Resolve TypeScript narrowing error in MediaElement play handler ([5fd2d3b](https://github.com/chorus-studio/chorus/commit/5fd2d3b))

### ❤️ Contributors

- Cdrani ([@cdrani](https://github.com/cdrani))

## v2.8.3

[compare changes](https://github.com/chorus-studio/chorus/compare/v2.8.2...v2.8.3)

### 🩹 Fixes

- **audio:** Restore parallel dry bypass for digital reverb effects ([0fd3689](https://github.com/chorus-studio/chorus/commit/0fd3689))

### ❤️ Contributors

- Cdrani ([@cdrani](https://github.com/cdrani))

## v2.8.2

[compare changes](https://github.com/chorus-studio/chorus/compare/v2.8.1...v2.8.2)

### 🩹 Fixes

- **audio:** Prevent duplicate effect processing and preserve stereo in reverb ([34fd6a1](https://github.com/chorus-studio/chorus/commit/34fd6a1))

### ❤️ Contributors

- Cdrani ([@cdrani](https://github.com/cdrani))

## v2.8.1

[compare changes](https://github.com/chorus-studio/chorus/compare/v2.8.0...v2.8.1)

### 🩹 Fixes

- **audio:** Prevent effect bleed on preset switch and reduce transition clicks ([7ef601f](https://github.com/chorus-studio/chorus/commit/7ef601f))
- **security:** Replace {@html} SVG strings with native SVG elements ([d46515d](https://github.com/chorus-studio/chorus/commit/d46515d))
- **manifest:** Add Firefox data_collection_permissions property ([142911d](https://github.com/chorus-studio/chorus/commit/142911d))
- **types:** Widen gecko manifest type for data_collection_permissions ([7ed4538](https://github.com/chorus-studio/chorus/commit/7ed4538))
- **types:** Narrow SVG fill-rule/clip-rule types to match SVG attribute union ([8c6ba28](https://github.com/chorus-studio/chorus/commit/8c6ba28))

### ❤️ Contributors

- Cdrani ([@cdrani](https://github.com/cdrani))

## v2.8.0

[compare changes](https://github.com/chorus-studio/chorus/compare/v2.7.2...v2.8.0)

### 🚀 Enhancements

- Add MS (Mid-Side) Audio Processor with Multi-Effect Support ([#273](https://github.com/chorus-studio/chorus/pull/273))

### 🔥 Performance

- Comprehensive resource optimization and performance improvements ([#266](https://github.com/chorus-studio/chorus/pull/266))

### 🩹 Fixes

- Correct Firefox sources extraction in validate workflow ([d81078b](https://github.com/chorus-studio/chorus/commit/d81078b))
- Use npx instead of pnpx in GitHub workflows ([f47c871](https://github.com/chorus-studio/chorus/commit/f47c871))
- Correct beta release workflow build and zip process ([be9a71e](https://github.com/chorus-studio/chorus/commit/be9a71e))
- Use correct Chrome build directory name (chrome-mv3) ([8499ec1](https://github.com/chorus-studio/chorus/commit/8499ec1))
- Display full semantic version including beta tags in UI ([#268](https://github.com/chorus-studio/chorus/pull/268))
- Popup mute button now correctly mutes playback ([#269](https://github.com/chorus-studio/chorus/pull/269))
- Prevent next track from starting at previous snip's start_time ([#270](https://github.com/chorus-studio/chorus/pull/270))
- Revert audio manager optimizations for Windows compatibility ([#272](https://github.com/chorus-studio/chorus/pull/272))
- Resolve PiP communication and service worker errors ([#274](https://github.com/chorus-studio/chorus/pull/274))
- Preserve EQ internal filter chain during effect rebuilds ([5119f43](https://github.com/chorus-studio/chorus/commit/5119f43))
- Seek to snip start on save instead of skipping to next track ([6ca41d8](https://github.com/chorus-studio/chorus/commit/6ca41d8))
- **ci:** Use last stable tag for changelogen version bump ([82c2f9f](https://github.com/chorus-studio/chorus/commit/82c2f9f))

### 💅 Refactors

- Replace media timeupdate events with UI position polling ([9cf9e65](https://github.com/chorus-studio/chorus/commit/9cf9e65))

### 🏡 Chore

- Exclude CHANGELOG.md from Firefox source bundle ([c257031](https://github.com/chorus-studio/chorus/commit/c257031))
- Merge main into develop and resolve conflicts ([b89d961](https://github.com/chorus-studio/chorus/commit/b89d961))
- **release:** V2.8.0 ([5864976](https://github.com/chorus-studio/chorus/commit/5864976))

### 🤖 CI

- Implement GitFlow release workflow and Firefox source validation ([d2fce0b](https://github.com/chorus-studio/chorus/commit/d2fce0b))
- Add beta release workflow for Chrome Web Store ([#267](https://github.com/chorus-studio/chorus/pull/267))
- Automatically sync main to develop after release ([ec90b41](https://github.com/chorus-studio/chorus/commit/ec90b41))
- Add beta branch support to CI workflows ([025a1c5](https://github.com/chorus-studio/chorus/commit/025a1c5))

### ❤️ Contributors

- Cdrani ([@cdrani](https://github.com/cdrani))
- Charles ([@cdrani](https://github.com/cdrani))

## v2.7.2

[compare changes](https://github.com/chorus-studio/chorus/compare/v2.7.1...v2.7.2)

### 🏡 Chore

- Merge develop to main for release ([#271](https://github.com/chorus-studio/chorus/pull/271))

### ❤️ Contributors

- Charles ([@cdrani](https://github.com/cdrani))

## v2.7.1

[compare changes](https://github.com/chorus-studio/chorus/compare/v2.7.0...v2.7.1)

## v2.7.0

[compare changes](https://github.com/chorus-studio/chorus/compare/v2.6.1...v2.7.0)

### 🚀 Enhancements

- Unlock premium features for all users ([#263](https://github.com/chorus-studio/chorus/pull/263))

### 🩹 Fixes

- Resolve all TypeScript compilation errors ([937033d](https://github.com/chorus-studio/chorus/commit/937033d))

### 💅 Refactors

- Comprehensive code optimization and refactoring ([1c04b45](https://github.com/chorus-studio/chorus/commit/1c04b45))

### 📖 Documentation

- Add Claude Code custom commands ([af02adf](https://github.com/chorus-studio/chorus/commit/af02adf))
- Bump version to v2.6.2 ([9524ae5](https://github.com/chorus-studio/chorus/commit/9524ae5))

### 🏡 Chore

- Add caniuse-lite dependency ([1d4dda6](https://github.com/chorus-studio/chorus/commit/1d4dda6))
- Add format script for modified files ([b6374af](https://github.com/chorus-studio/chorus/commit/b6374af))
- Bump version to 2.6.3 ([ebecf97](https://github.com/chorus-studio/chorus/commit/ebecf97))

### ❤️ Contributors

- Charles ([@cdrani](https://github.com/cdrani))
- Cdrani ([@cdrani](https://github.com/cdrani))

