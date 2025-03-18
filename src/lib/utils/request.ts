import { getState } from './state'

type Options = {
    method?: string
    body?: any
    connect?: boolean
}

export const setOptions = async ({ method = 'GET', body = null, connect = false }: Options) => {
    const authHeader = await getAuthHeader()
    const connectHeader = connect ? await getConnectHeader() : null

    return {
        method,
        body: body ? JSON.stringify(body) : null,
        headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
            ...(connect && { 'X-Spotify-Connection-Id': connectHeader })
        }
    }
}

const getAuthHeader = async () => await getState('auth_token')

const getConnectHeader = async () => await getState('connection_id')

export const request = async ({ url, options }: { url: string; options: Options }) => {
    try {
        const response = await fetch(url, options)

        if (!response.ok) {
            throw new Error('Network response was not ok')
        }

        try {
            return await response?.json()
        } catch (err) {
            return 'empty response'
        }
    } catch (error) {
        throw error
    }
}
