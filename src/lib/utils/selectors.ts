const mediaKeys = {
    dj: '[data-testid="control-button-npv"]',
    repeat: '[data-testid="control-button-repeat"]',
    shuffle: '[data-testid="control-button-shuffle"]',
    next: '[data-testid="control-button-skip-forward"]',
    previous: '[data-testid="control-button-skip-back"]',
    'play/pause': '[data-testid="control-button-playpause"]',
    'mute/unmute': '[data-testid="volume-bar-toggle-mute-button"]'
}

const chorusKeys = {
    loop: '#loop-button',
    'mute/unmute': '#volume-button',
    'seek-rewind': '#seek-player-rw-button',
    'seek-forward': '#seek-player-ff-button',
    'toggle-config': '#chorus-config-dialog-trigger',
    'toggle-new-releases': '#chorus-new-releases-icon',
    settings: '[data-testid="now-playing-widget"] div#chorus-ui #chorus-settings',
    'save/unsave': '[data-testid="now-playing-widget"] div#chorus-ui #chorus-heart',
    'block-track': '[data-testid="now-playing-widget"] div#chorus-ui #chorus-block'
}

export { mediaKeys, chorusKeys }
