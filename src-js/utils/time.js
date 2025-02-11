export const secondsToTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    let time = ''

    if (hours > 0) {
        time += hours + ':'
    }

    if (minutes < 10 && hours !== 0) {
        time += '0'
    }

    time += minutes + ':'
    if (remainingSeconds < 10) {
        time += '0'
    }

    time += remainingSeconds

    return time
}

export const formatTimeInSeconds = (totalSeconds) => {
    const parsedSeconds = parseFloat(totalSeconds)

    if (isNaN(parsedSeconds) || parsedSeconds < 0) return

    const hours = `${Math.floor(parsedSeconds / 3600)}`.padStart(2, '0')
    const minutes = `${Math.floor((parsedSeconds % 3600) / 60)}`.padStart(2, '0')
    const seconds = `${Math.floor(parsedSeconds % 60)}`.padStart(2, '0')
    const milliseconds = `${Math.round((parsedSeconds % 1) * 1000)}`.padStart(3, '0').slice(0, 2)

    return `${hours}:${minutes}:${seconds}:${milliseconds}`
}

export const timeToMilliseconds = ({ hours, mins, secs, ms }) =>
    Number(hours) * 3600 * 1000 + Number(mins) * 60 * 1000 + Number(secs) * 1000 + Number(ms)

export const timeToSeconds = (time) => {
    if (!time || !time?.includes(':')) return

    const timeParts = time.split(':').map(Number)

    if (timeParts.length === 3) {
        const [hours, minutes, seconds] = timeParts
        return (hours || 0) * 3600 + minutes * 60 + seconds
    } else if (timeParts.length === 2) {
        const [minutes, seconds] = timeParts
        return minutes * 60 + seconds
    } else if (timeParts.length === 4) {
        const [hours, minutes, seconds, milliseconds] = timeParts
        return (hours || 0) * 3600 + minutes * 60 + seconds + milliseconds / 100
    }

    return timeParts.at(0)
}
