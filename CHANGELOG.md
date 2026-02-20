# Changelog


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

### 💅 Refactors

- Replace media timeupdate events with UI position polling ([9cf9e65](https://github.com/chorus-studio/chorus/commit/9cf9e65))

### 🏡 Chore

- Exclude CHANGELOG.md from Firefox source bundle ([c257031](https://github.com/chorus-studio/chorus/commit/c257031))
- Merge main into develop and resolve conflicts ([b89d961](https://github.com/chorus-studio/chorus/commit/b89d961))

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

