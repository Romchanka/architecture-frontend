import { ReactNode } from 'react'

interface FilterBarProps {
    children: ReactNode
    className?: string
}

/**
 * Обёртка для фильтров с единым стилем — убирает дублирование CSS-классов.
 */
export default function FilterBar({ children, className = '' }: FilterBarProps) {
    return (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 mb-6">
            <div className={`flex gap-3 flex-wrap ${className}`}>
                {children}
            </div>
        </div>
    )
}

/** CSS-классы для select/input в FilterBar. */
export const filterSelectCls = 'bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none'
export const filterInputCls = 'bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none'
