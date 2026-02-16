import { ReactNode } from 'react'

interface PageHeaderProps {
    title: string
    count?: number
    countLabel?: string
    /** Текст кнопки действия */
    actionLabel?: string
    /** Клик по кнопке */
    onAction?: () => void
    /** Доп. элементы справа */
    extra?: ReactNode
}

/**
 * Заголовок admin-страницы с опциональной кнопкой действия и счётчиком.
 */
export default function PageHeader({
    title, count, countLabel, actionLabel, onAction, extra,
}: PageHeaderProps) {
    return (
        <div className="flex items-center justify-between mb-6">
            <div>
                <h1 className="text-2xl font-bold text-white">{title}</h1>
                {count !== undefined && (
                    <p className="text-gray-500 text-sm mt-1">
                        {count} {countLabel || 'записей'}
                    </p>
                )}
            </div>
            <div className="flex items-center gap-3">
                {extra}
                {actionLabel && onAction && (
                    <button
                        onClick={onAction}
                        className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                        {actionLabel}
                    </button>
                )}
            </div>
        </div>
    )
}
