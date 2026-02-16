import { useState, useCallback } from 'react'

interface ActionState {
    loading: boolean
    error: string
}

interface ExecuteOptions {
    confirm?: string
    onSuccess?: () => void
    errorFallback?: string
}

/**
 * Хук для CRUD-операций с опциональным confirm и обработкой ошибок.
 * Заменяет повторяющиеся handleCreate/handleCancel/handleConvert паттерны.
 *
 * @example
 * const [exec, { loading, error }] = useApiAction()
 * await exec(() => api.put(`/bookings/${id}/cancel`), {
 *   confirm: 'Отменить бронирование?',
 *   onSuccess: reload,
 * })
 */
export function useApiAction(): [
    (fn: () => Promise<any>, opts?: ExecuteOptions) => Promise<boolean>,
    ActionState
] {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const execute = useCallback(async (
        fn: () => Promise<any>,
        opts?: ExecuteOptions,
    ): Promise<boolean> => {
        if (opts?.confirm && !window.confirm(opts.confirm)) return false

        setLoading(true)
        setError('')
        try {
            await fn()
            opts?.onSuccess?.()
            return true
        } catch (err: any) {
            const msg = err.response?.data?.message || opts?.errorFallback || 'Ошибка'
            setError(msg)
            if (!opts?.errorFallback) alert(msg)
            return false
        } finally {
            setLoading(false)
        }
    }, [])

    return [execute, { loading, error }]
}
