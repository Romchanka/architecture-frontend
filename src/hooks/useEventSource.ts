import { useEffect, useRef, useCallback } from 'react'

interface SseEvent {
    type: string
    data: any
}

interface UseEventSourceOptions {
    /** Called when any SSE event is received */
    onEvent?: (event: SseEvent) => void
    /** Event types to listen for (default: all) */
    eventTypes?: string[]
    /** Auto-reconnect on disconnect (default: true) */
    autoReconnect?: boolean
}

/** Check if JWT token is expired by decoding its payload */
function isTokenExpired(token: string): boolean {
    try {
        const parts = token.split('.')
        if (parts.length !== 3) return true
        const payload = JSON.parse(atob(parts[1]))
        if (!payload.exp) return false
        // Add 30s buffer to avoid edge cases
        return Date.now() >= (payload.exp * 1000) - 30000
    } catch {
        return true
    }
}

/**
 * Hook to subscribe to SSE events from the backend.
 * Automatically connects with JWT auth, reconnects on failure.
 * Ensures only ONE connection per component instance.
 * Stops reconnecting if JWT token is expired.
 */
export function useEventSource(options: UseEventSourceOptions) {
    const { onEvent, eventTypes, autoReconnect = true } = options
    const onEventRef = useRef(onEvent)
    onEventRef.current = onEvent

    const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>()
    const eventSourceRef = useRef<EventSource | null>(null)
    const isConnecting = useRef(false)
    const retryCount = useRef(0)
    const MAX_RETRIES = 30 // Stop after ~5 minutes of failures

    const connect = useCallback(async () => {
        // Prevent duplicate connections
        if (isConnecting.current) return
        if (eventSourceRef.current?.readyState === EventSource.OPEN) return

        const token = localStorage.getItem('token')
        if (!token || token === 'undefined' || token === 'null') return

        // Don't connect if token is expired
        if (isTokenExpired(token)) {
            console.warn('[SSE] JWT token expired, not connecting. Please re-login.')
            return
        }

        // Stop after too many retries
        if (retryCount.current >= MAX_RETRIES) {
            console.warn('[SSE] Max retries reached, stopping reconnection.')
            return
        }

        // Close any existing connection first
        if (eventSourceRef.current) {
            eventSourceRef.current.close()
            eventSourceRef.current = null
        }

        isConnecting.current = true

        // SECURITY: Obtain a short-lived SSE token instead of exposing main JWT in URL
        let sseToken = token // fallback to main JWT
        try {
            const response = await fetch('/api/events/token', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                sseToken = data.sseToken
            } else {
                console.warn('[SSE] Failed to obtain SSE token, using main JWT as fallback')
            }
        } catch (e) {
            console.warn('[SSE] SSE token fetch failed, using main JWT as fallback', e)
        }

        const url = `/api/events/subscribe?token=${encodeURIComponent(sseToken)}`
        const es = new EventSource(url)
        eventSourceRef.current = es

        // Listen for specific event types
        const types = eventTypes || ['booking_created', 'booking_updated']
        types.forEach(type => {
            es.addEventListener(type, (e: MessageEvent) => {
                try {
                    const data = JSON.parse(e.data)
                    onEventRef.current?.({ type, data })
                } catch {
                    onEventRef.current?.({ type, data: e.data })
                }
            })
        })

        es.addEventListener('connected', () => {
            if (import.meta.env.DEV) console.log('[SSE] Connected')
            isConnecting.current = false
            retryCount.current = 0 // Reset retries on successful connection
        })

        es.onerror = () => {
            es.close()
            eventSourceRef.current = null
            isConnecting.current = false

            // Check if token expired before scheduling reconnect
            const currentToken = localStorage.getItem('token')
            if (!currentToken || isTokenExpired(currentToken)) {
                console.warn('[SSE] JWT expired, stopping reconnection.')
                return
            }

            if (autoReconnect && retryCount.current < MAX_RETRIES) {
                retryCount.current++
                // Exponential backoff: 10s, 20s, 30s... max 60s
                const delay = Math.min(10000 * retryCount.current, 60000)
                console.warn(`[SSE] Connection lost, retry ${retryCount.current}/${MAX_RETRIES} in ${delay / 1000}s...`)
                reconnectTimeout.current = setTimeout(connect, delay)
            }
        }
    }, [eventTypes, autoReconnect])

    useEffect(() => {
        connect()
        return () => {
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current)
            if (eventSourceRef.current) {
                eventSourceRef.current.close()
                eventSourceRef.current = null
            }
            isConnecting.current = false
            retryCount.current = 0
        }
    }, [connect])
}
