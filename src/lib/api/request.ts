import { getState } from '$lib/utils/state'

type RequestOptions = {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    body?: Record<string, unknown> | null
    connect?: boolean
}

export type ChorusMetadata = {
    auth_token: string
    device_id: string
    connection_id: string
}

type SetOptionsResponse = RequestInit & {
    method: string
    body: string | null
    headers: {
        Authorization: string
        'Content-Type': string
        'X-Spotify-Connection-Id': string | null
    }
}

export const setOptions = async ({
    method = 'GET',
    body = null,
    connect = false
}: RequestOptions): Promise<SetOptionsResponse | undefined> => {
    const [authToken, connectionId] = await storage.getItems([
        'local:chorus_auth_token',
        'local:chorus_connection_id'
    ])
    const authHeader = authToken?.value
    const connectHeader = connect ? connectionId?.value : null

    if (!authHeader || (connect && !connectHeader)) return

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

type RequestParams = {
    url: string
    options: RequestInit
}

type ApiResponse<T> = T | 'empty response'

export const request = async <T>({ url, options }: RequestParams): Promise<ApiResponse<T>> => {
    try {
        const response = await fetch(url, options)

        if (!response.ok) {
            throw new Error(
                `Network response was not ok: ${response.status} ${response.statusText}`
            )
        }

        try {
            return (await response.json()) as T
        } catch (err) {
            return 'empty response'
        }
    } catch (error) {
        throw error
    }
}
