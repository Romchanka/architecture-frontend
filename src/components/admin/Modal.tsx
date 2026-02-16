import { ReactNode } from 'react'

interface ModalProps {
    open: boolean
    onClose: () => void
    title: string
    children: ReactNode
    /** Ширина модалки (Tailwind max-w-*), по умолчанию 'max-w-md' */
    width?: string
}

/**
 * Переиспользуемое модальное окно с overlay и backdrop-blur.
 * Убирает дублирование ~20 строк разметки из каждой admin-страницы.
 */
export default function Modal({ open, onClose, title, children, width = 'max-w-md' }: ModalProps) {
    if (!open) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className={`bg-gray-900 rounded-2xl border border-gray-700 w-full ${width} mx-4 max-h-[90vh] overflow-y-auto`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">{title}</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-white text-xl transition-colors"
                    >
                        ✕
                    </button>
                </div>
                {children}
            </div>
        </div>
    )
}

/** Тело модалки с padding и spacing. */
export function ModalBody({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <div className={`px-6 py-4 space-y-4 ${className}`}>{children}</div>
}

/** Футер модалки с border-top. */
export function ModalFooter({ children }: { children: ReactNode }) {
    return <div className="px-6 py-4 border-t border-gray-800">{children}</div>
}

/** Стандартная кнопка отправки формы в модалке. */
export function SubmitButton({
    onClick,
    disabled,
    loading,
    label,
    loadingLabel,
}: {
    onClick: () => void
    disabled?: boolean
    loading?: boolean
    label: string
    loadingLabel?: string
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
            {loading ? (loadingLabel || 'Загрузка...') : label}
        </button>
    )
}

/** Блок ошибки внутри модалки. */
export function ModalError({ message }: { message: string }) {
    if (!message) return null
    return (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-2 rounded-lg">
            {message}
        </div>
    )
}

/** Стилизованный input для модальных форм. */
export function FormField({
    label,
    children
}: {
    label: string
    children: ReactNode
}) {
    return (
        <div>
            <label className="text-xs text-gray-500 block mb-1">{label}</label>
            {children}
        </div>
    )
}

/** CSS-классы для input/select/textarea внутри модалки. */
export const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none'
export const textareaCls = `${inputCls} resize-none`
