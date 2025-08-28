import { setOptions, request } from './request'

/**
 * Base API service class to eliminate duplication
 * Provides common patterns for API requests and error handling
 */
export abstract class BaseAPIService {
    protected readonly baseUrl: string
    
    constructor(baseUrl: string) {
        this.baseUrl = baseUrl
    }

    /**
     * Execute a GraphQL query with standard error handling
     */
    protected async executeGraphQLQuery<T>(
        query: GraphQLQuery,
        variables: Record<string, any> = {}
    ): Promise<T | null> {
        const body = {
            variables,
            operationName: query.operationName,
            extensions: {
                persistedQuery: {
                    version: 1,
                    sha256Hash: query.sha256Hash
                }
            }
        }

        try {
            const options = await setOptions({ method: 'POST', body })
            if (!options) {
                throw new Error('Failed to set request options - no auth token found')
            }

            const response = await request<any>({ 
                url: this.baseUrl, 
                options,
                dedupe: query.dedupe,
                cacheKey: query.cacheKey 
            })
            
            if (response?.data) {
                return response.data as T
            }
            
            if (response?.errors) {
                console.error('GraphQL errors:', response.errors)
            }
            
            return null
        } catch (error) {
            this.handleError(error, `GraphQL query: ${query.operationName}`)
            return null
        }
    }

    /**
     * Execute a REST API request with standard error handling
     */
    protected async executeRequest<T>(
        endpoint: string,
        options: {
            method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
            body?: Record<string, unknown>
            connect?: boolean
            dedupe?: boolean
            cacheKey?: string
        } = {}
    ): Promise<T | null> {
        try {
            const requestOptions = await setOptions({
                method: options.method || 'GET',
                body: options.body,
                connect: options.connect
            })

            if (!requestOptions) {
                throw new Error('Failed to set request options - no auth token found')
            }

            const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`
            
            return await request<T>({ 
                url, 
                options: requestOptions,
                dedupe: options.dedupe,
                cacheKey: options.cacheKey
            })
        } catch (error) {
            this.handleError(error, `REST request: ${endpoint}`)
            return null
        }
    }

    /**
     * Batch multiple requests with error handling
     */
    protected async executeBatchRequests<T>(
        requests: Array<() => Promise<T>>
    ): Promise<(T | null)[]> {
        const results = await Promise.allSettled(requests.map(req => req()))
        
        return results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value
            } else {
                console.error(`Batch request ${index} failed:`, result.reason)
                return null
            }
        })
    }

    /**
     * Standard error handling with context
     */
    protected handleError(error: unknown, context: string): void {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`API Service Error [${context}]:`, errorMessage)
        
        // Add performance monitoring for errors
        if (process.env.NODE_ENV === 'development') {
            console.trace('API Error Stack Trace')
        }
    }

    /**
     * Create a standardized error response
     */
    protected createErrorResponse(message: string, code?: string): APIError {
        return {
            error: true,
            message,
            code: code || 'API_ERROR',
            timestamp: new Date().toISOString()
        }
    }

    /**
     * Check if response indicates an error
     */
    protected isErrorResponse(response: any): response is APIError {
        return response && response.error === true
    }
}

/**
 * Standard GraphQL query interface
 */
export interface GraphQLQuery {
    operationName: string
    sha256Hash: string
    dedupe?: boolean
    cacheKey?: string
}

/**
 * Standard API error response
 */
export interface APIError {
    error: true
    message: string
    code: string
    timestamp: string
}

/**
 * Common GraphQL queries used across services
 */
export const COMMON_QUERIES = {
    IS_CURATED: {
        operationName: 'isCurated',
        sha256Hash: 'e4ed1f91a2cc5415befedb85acf8671dc1a4bf3ca1a5b945a6386101a22e28a6',
        dedupe: true
    },
    ADD_TO_LIBRARY: {
        operationName: 'addToLibrary', 
        sha256Hash: 'a3c1ff58e6a36fec5fe1e3a193dc95d9071d96b9ba53c5ba9c1494fb1ee73915'
    },
    REMOVE_FROM_LIBRARY: {
        operationName: 'removeFromLibrary',
        sha256Hash: 'a3c1ff58e6a36fec5fe1e3a193dc95d9071d96b9ba53c5ba9c1494fb1ee73915'
    },
    GET_ALBUM: {
        operationName: 'getAlbum',
        sha256Hash: '97dd13a1f28c80d66115a13697a7ffd94fe3bebdb94da42159456e1d82bfee76',
        dedupe: true
    }
} as const