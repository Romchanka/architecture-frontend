import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'

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
 * @example
 * const { data: bookings, loading, reload } = useApiData<BookingRow[]>('/bookings?size=200', [])
 */
export function useApiData<T>(url: string, initial: T): UseApiDataResult<T> {
    const [data, setData] = useState<T>(initial)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const { data: resp } = await api.get(url)
            setData(resp.content ?? resp ?? initial)
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

    return { data, loading, error, reload: load }
}
