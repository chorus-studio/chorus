import { storage } from '@wxt-dev/storage'
import { dedupeRequest } from '$lib/utils/debounce'

type RequestOptions = {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    body?: Record<string, unknown> | null
    connect?: boolean
    dedupe?: boolean
    cacheKey?: string
}

type SetOptionsResponse = {
    method: string
    body: string | null
    headers: Record<string, string>
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
    const connectHeader = connect ? connectionId?.value : undefined

    if (!authHeader || (connect && !connectHeader)) return undefined

    const headers: Record<string, string> = {
        Authorization: authHeader,
        'Content-Type': 'application/json'
    }

    if (connectHeader) {
        headers['X-Spotify-Connection-Id'] = connectHeader
    }

    return {
        method,
        body: body ? JSON.stringify(body) : null,
        headers
    }
}

type RequestParams = {
    url: string
    options: SetOptionsResponse
}

type ApiResponse<T> = T | null

export const request = async <T>({ url, options, dedupe, cacheKey }: RequestParams & { dedupe?: boolean; cacheKey?: string }): Promise<ApiResponse<T>> => {
    const requestFn = async (): Promise<ApiResponse<T>> => {
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
                console.error('JSON parsing error:', err)
                return null
            }
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Request failed: ${error.message}`)
            }
            throw new Error('Request failed with unknown error')
        }
    }
    
    // Use deduplication for GET requests or when explicitly requested
    if (dedupe || (options.method === 'GET' || !options.method)) {
        const key = cacheKey || `${options.method || 'GET'}_${url}_${JSON.stringify(options.body)}`
        return dedupeRequest(key, requestFn)
    }
    
    return requestFn()
}
