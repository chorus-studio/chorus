export const secondsToTime = (seconds: number) => {
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

    time += `${minutes}:`
    if (remainingSeconds < 10) {
        time += '0'
    }

    time += remainingSeconds

    return time
}

export const formatTimeInSeconds = (totalSeconds: string | number) => {
    const parsedSeconds = parseFloat(totalSeconds.toString())

    if (isNaN(parsedSeconds) || parsedSeconds < 0) return

    const hours = `${Math.floor(parsedSeconds / 3600)}`.padStart(2, '0')
    const minutes = `${Math.floor((parsedSeconds % 3600) / 60)}`.padStart(2, '0')
    const seconds = `${Math.floor(parsedSeconds % 60)}`.padStart(2, '0')

    return `${hours}:${minutes}:${seconds}`
}

export const timeToMilliseconds = ({
    hours,
    mins,
    secs,
    ms
}: {
    hours: string
    mins: string
    secs: string
    ms: string
}) => Number(hours) * 3600 * 1000 + Number(mins) * 60 * 1000 + Number(secs) * 1000 + Number(ms)

export const timeToSeconds = (time: string) => {
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

export function formatTime(time: number, basic: boolean = false): string {
    if (time === 0) return '0:00'

    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)
    const milliseconds = Math.floor((time % 1) * 1000)

    const shortTime = `${minutes >= 10 || (minutes < 10 && hours < 1) ? minutes : minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    const formattedTime = basic
        ? `${shortTime}.${milliseconds.toString().padStart(2, '0')}`
        : shortTime
    if (hours > 0) {
        return `${hours < 9 ? hours : hours.toString().padStart(2, '0')}:${formattedTime}`
    }
    return formattedTime
}

export function formatDate(timestamp: string) {
    const date = new Date(Number(timestamp))
    // Check if the date is valid (not NaN and within reasonable range)
    if (isNaN(date.getTime()) || date.getFullYear() < 1970 || date.getFullYear() > 2100) {
        return timestamp
    }

    return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    }).format(date)
}
