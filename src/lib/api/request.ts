type RequestOptions = {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    body?: Record<string, unknown> | null
    connect?: boolean
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
            console.error('error 1: ', err)
            return null
        }
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Request failed: ${error.message}`)
        }
        throw new Error('Request failed with unknown error')
    }
}
