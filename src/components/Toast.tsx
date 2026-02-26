import { useState, useEffect, useCallback } from 'react'

export interface ToastMessage {
    id: number
    text: string
    type?: 'info' | 'success' | 'warning'
}

let nextId = 0

export function useToast() {
    const [toasts, setToasts] = useState<ToastMessage[]>([])

    const show = useCallback((text: string, type: ToastMessage['type'] = 'info') => {
        const id = ++nextId
        setToasts(prev => [...prev, { id, text, type }])
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
    }, [])

    return { toasts, show }
}

export function ToastContainer({ toasts }: { toasts: ToastMessage[] }) {
    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
                <ToastItem key={t.id} toast={t} />
            ))}
        </div>
    )
}

function ToastItem({ toast }: { toast: ToastMessage }) {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true))
        const timer = setTimeout(() => setVisible(false), 3500)
        return () => clearTimeout(timer)
    }, [])

    const colors = {
        info: 'from-blue-600/90 to-blue-700/90 border-blue-500/30',
        success: 'from-emerald-600/90 to-emerald-700/90 border-emerald-500/30',
        warning: 'from-amber-600/90 to-amber-700/90 border-amber-500/30',
    }

    const icons = {
        info: '🔔',
        success: '✅',
        warning: '⚠️',
    }

    return (
        <div
            className={`
                pointer-events-auto px-4 py-3 rounded-xl border backdrop-blur-xl
                bg-gradient-to-r ${colors[toast.type || 'info']}
                text-white text-sm font-medium shadow-2xl
                transition-all duration-300 ease-out min-w-[280px] max-w-[400px]
                ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}
            `}
        >
            <span className="mr-2">{icons[toast.type || 'info']}</span>
            {toast.text}
        </div>
    )
}
