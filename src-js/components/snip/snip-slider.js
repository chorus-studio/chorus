import { secondsToTime } from '../../utils/time.js'

const createInput = ({ type, max, value }) => `
    <input min="0" max="${max}" step="0.01" type="range" class="input" value="${value}" id="input-${type}">
`

const createTime = ({ id, time }) => `
    <p class="time${id == 'end' ? ' end' : ''}"><span id="${id}">${time}</span></p>
`

export const createSlider = ({ current, duration, style = '' }) => `
    <div id="snippy" class="snippy" style="${style}">
        ${createTime({ id: 'start', time: '0:00' })}
        <div class="slider-container">
            ${createInput({ type: 'start', max: duration, value: current })}
            ${createInput({ type: 'end', max: duration, value: duration })}
            <div class="slider">
                <div class="track"></div>
                <div class="range"></div>
                <div class="thumb left"></div>
                <div class="thumb right"></div>
            </div>
        </div>
        ${createTime({ id: 'end', time: secondsToTime(duration) })}
    </div>
`
