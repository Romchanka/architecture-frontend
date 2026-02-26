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

/**
 * Hook to subscribe to SSE events from the backend.
 * Automatically connects with JWT auth, reconnects on failure.
 *
 * @example
 * useEventSource({
 *   eventTypes: ['booking_created', 'booking_updated'],
 *   onEvent: (e) => { console.log(e.type, e.data); reload() }
 * })
 */
export function useEventSource(options: UseEventSourceOptions) {
    const { onEvent, eventTypes, autoReconnect = true } = options
    const onEventRef = useRef(onEvent)
    onEventRef.current = onEvent

    const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>()
    const eventSourceRef = useRef<EventSource | null>(null)

    const connect = useCallback(() => {
        // SSE doesn't support custom headers natively.
        // We pass the token as a query param, which the backend should also accept.
        const token = localStorage.getItem('token')
        if (!token) return

        const url = `/api/events/subscribe?token=${encodeURIComponent(token)}`
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
            console.log('[SSE] Connected')
        })

        es.onerror = () => {
            console.warn('[SSE] Connection lost, will reconnect...')
            es.close()
            if (autoReconnect) {
                reconnectTimeout.current = setTimeout(connect, 5000)
            }
        }
    }, [eventTypes, autoReconnect])

    useEffect(() => {
        connect()
        return () => {
            eventSourceRef.current?.close()
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current)
        }
    }, [connect])
}
