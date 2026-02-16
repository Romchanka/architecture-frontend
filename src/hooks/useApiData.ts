import { useState, useEffect, useCallback, useRef } from 'react'
import api from '@/lib/api'

interface UseApiDataOptions {
    /** Auto-refresh interval in milliseconds. E.g. 10000 = every 10s */
    pollingInterval?: number
}

interface UseApiDataResult<T> {
    data: T
    loading: boolean
    error: string | null
    reload: () => void
}

/**
 * Хук для загрузки данных с API.
 * Заменяет повторяющийся useState + useEffect + try/catch + setLoading.
 *
 * @param url       API endpoint
 * @param initial   Initial/fallback value
 * @param options   Optional: { pollingInterval } for auto-refresh (ms)
 *
 * @example
 * const { data: bookings, loading, reload } = useApiData<BookingRow[]>('/bookings?size=200', [], { pollingInterval: 10000 })
 */
export function useApiData<T>(url: string, initial: T, options?: UseApiDataOptions): UseApiDataResult<T> {
    const [data, setData] = useState<T>(initial)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const initialRef = useRef(initial)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const { data: resp } = await api.get(url)
            setData(resp.content ?? resp ?? initialRef.current)
        } catch (err: any) {
            console.error(`Error loading ${url}:`, err)
            setError(err.response?.data?.message || 'Ошибка загрузки')
        } finally {
            setLoading(false)
        }
    }, [url])

    useEffect(() => {
        load()
    }, [load])

    // Polling: auto-refresh at interval
    useEffect(() => {
        if (!options?.pollingInterval) return
        const id = setInterval(load, options.pollingInterval)
        return () => clearInterval(id)
    }, [load, options?.pollingInterval])

    return { data, loading, error, reload: load }
}
