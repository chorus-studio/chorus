export const createSpeedRange = () => `
    <div id="snippy" class="snippy">
        <p class="time" style="min-width:unset">
            <span id="speed-min">0.25x</span>
        </p>

        <div class="slider-container">
            <input
                min="0.1"
                max="4"
                step="0.001"
                type="range"
                class="input"
                id="speed-input"
                name="speed-input"
            >

            <div class="slider">
                <div class="track"></div>
                <div 
                    class="range"
                    id="speed-range"
                    style="left:0;right:100%;"
                >
                </div>
                <div id="speed-thumb" class="thumb right" style="display:block"></div>
            </div>
        </div>

        <p class="time" style="min-width:unset;">
            <span id="speed-max">4x</span>
        </p>
    </div>
`
