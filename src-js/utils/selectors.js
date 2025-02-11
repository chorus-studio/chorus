const mediaKeys = {
    repeat: '[data-testid="control-button-repeat"]',
    shuffle: '[data-testid="control-button-shuffle"]',
    next: '[data-testid="control-button-skip-forward"]',
    previous: '[data-testid="control-button-skip-back"]',
    'play/pause': '[data-testid="control-button-playpause"]',
    'mute/unmute': '[data-testid="volume-bar-toggle-mute-button"]'
}

const chorusKeys = {
    loop: '#loop-button',
    settings: '#chorus-icon',
    'block-track': '#chorus-skip',
    'seek-rewind': '#seek-player-rw-button',
    'seek-fastforward': '#seek-player-ff-button',
    'save/unsave': '[data-testid="now-playing-widget"] > #chorus > #chorus-heart'
}

export { mediaKeys, chorusKeys }
