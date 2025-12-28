# Crossfade Testing & Validation Guide

## Overview
This document outlines how to test the crossfade functionality implementation.

## Prerequisites

1. **Build the extension:**
   ```bash
   bun install
   bun run dev  # or bun run build for production
   ```

2. **Load in browser:**
   - Chrome: Load unpacked extension from `.output/chrome-mv3`
   - Firefox: Load temporary add-on from `.output/firefox-mv3`

3. **Open Spotify Web Player:**
   - Navigate to https://open.spotify.com
   - Start playing a playlist or album

## Test Cases

### 1. Settings UI Validation

**Location:** Chorus Config Dialog → Crossfade Tab

**Tests:**
- [ ] Config dialog opens when clicking settings icon
- [ ] Crossfade tab is visible and accessible
- [ ] Enable/Disable toggle works
- [ ] Duration slider (3-12s) updates value display
- [ ] Fade curve selector shows all three options
- [ ] Minimum track length slider (0-120s) works
- [ ] Reset to Defaults button restores default settings
- [ ] Status indicator shows green when enabled, gray when disabled
- [ ] Settings persist after page reload

**Expected Defaults:**
- Enabled: false
- Duration: 6 seconds
- Type: equal-power
- Min Track Length: 30 seconds

---

### 2. Audio Interception Test

**Setup:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Enable crossfade in settings
4. Play a song

**Tests:**
- [ ] Console shows `[Crossfade] New track detected: [trackId]` when song starts
- [ ] No audio fetch logs appear when crossfade is disabled
- [ ] Audio fetch logs appear when crossfade is enabled

**Expected Console Output:**
```
[Crossfade] New track detected: abc123...
[Crossfade] Received chunk: { trackId: "abc123...", range: {...}, size: 65536 }
[Crossfade] Decoded: { duration: 10, channels: 2, sampleRate: 44100 }
[Crossfade] Started: { duration: 6, type: "equal-power", bufferDuration: 10 }
```

---

### 3. Crossfade Functionality Test

**Setup:**
1. Enable crossfade (duration: 6s, type: equal-power)
2. Play a playlist with tracks longer than 30 seconds

**Tests:**

#### 3A. Basic Crossfade
- [ ] Tracks transition smoothly without gaps
- [ ] Both tracks are audible during overlap (6 seconds)
- [ ] Current track fades out as next track fades in
- [ ] No sudden volume jumps or clicks
- [ ] Crossfade completes successfully

#### 3B. Fade Curve Comparison
Test all three curve types:
- [ ] **Equal-power:** Maintains constant loudness (recommended)
- [ ] **Exponential:** Natural decay curve
- [ ] **Linear:** Simple fade (may have slight volume dip)

#### 3C. Duration Variations
- [ ] 3s crossfade: Quick transition
- [ ] 6s crossfade: Standard transition (default)
- [ ] 12s crossfade: Long, gradual transition

---

### 4. Edge Cases

#### 4A. Short Tracks
**Setup:** Min Track Length = 30s

**Tests:**
- [ ] Tracks < 30s: No crossfade applied
- [ ] Tracks > 30s: Crossfade applied normally
- [ ] Set min length to 0s: All tracks crossfade

#### 4B. Manual Skip
- [ ] Skip during crossfade: Fade cancels cleanly
- [ ] No stuck audio or lingering sounds
- [ ] Next track starts normally

#### 4C. Pause/Resume
- [ ] Pause during crossfade: Crossfade pauses
- [ ] Resume: Crossfade continues
- [ ] No audio artifacts

#### 4D. Rapid Track Changes
- [ ] Skip through tracks quickly
- [ ] No memory leaks or performance degradation
- [ ] Each crossfade cancels previous one

---

### 5. Performance Test

**Monitoring:**
- Open Chrome Task Manager (Shift+Esc)
- Monitor memory and CPU usage

**Tests:**
- [ ] Memory usage stable (no leaks)
- [ ] CPU usage reasonable (< 5% spike during crossfade)
- [ ] No lag or stuttering in UI
- [ ] Extension remains responsive

**Benchmark:**
- Play 10+ tracks with crossfade enabled
- Memory should remain < 100MB
- No progressive memory increase

---

### 6. Compatibility Test

#### 6A. With Other Audio Effects
Test crossfade alongside:
- [ ] Reverb effects
- [ ] Equalizer presets
- [ ] MS Processor
- [ ] Pitch/tempo changes
- [ ] Volume changes

**Expected:** All effects should work independently without conflict

#### 6B. With Chorus Features
Test crossfade with:
- [ ] Loop/snip functionality
- [ ] Auto-skip
- [ ] Audio presets
- [ ] Manual controls (play/pause/next/previous)

---

### 7. Browser Compatibility

Test in multiple browsers:
- [ ] Chrome/Chromium
- [ ] Edge
- [ ] Brave
- [ ] Firefox (if applicable)

---

## Known Limitations

1. **Web Player Only:** Crossfade only works on Spotify Web Player, not desktop app
2. **Audio Chunk Availability:** Crossfade requires sequential audio chunks to be available
3. **Encryption:** If Spotify encrypts audio, decoding may fail (gracefully handled)
4. **First Track:** No crossfade on first track of session (no previous audio)

---

## Debugging Tips

### Issue: No console logs
**Solutions:**
- Check crossfade is enabled in settings
- Verify host_permissions in manifest
- Reload extension

### Issue: Crossfade not triggering
**Solutions:**
- Check minimum track length setting
- Ensure track is long enough
- Verify audio chunks are being intercepted

### Issue: Audio artifacts or clicks
**Solutions:**
- Try different fade curve type
- Adjust fade duration
- Check for conflicting audio effects

### Issue: Performance problems
**Solutions:**
- Disable crossfade temporarily
- Check for memory leaks in DevTools
- Reduce fade duration

---

## Success Criteria

✅ **Crossfade is working correctly if:**
1. Settings UI is fully functional and persists
2. Console shows proper interception and decoding
3. Smooth audio transitions with no gaps or clicks
4. Works alongside other Chorus features
5. No performance degradation
6. Edge cases handled gracefully

---

## Reporting Issues

If you encounter bugs, please include:
1. Browser and version
2. Crossfade settings used
3. Console error messages
4. Steps to reproduce
5. Expected vs actual behavior

---

## Next Steps After Testing

Once testing is complete and all ✅ checks pass:
1. Document any issues found
2. Fix critical bugs
3. Optimize performance if needed
4. Prepare for merge to develop branch
5. Create pull request with test results
