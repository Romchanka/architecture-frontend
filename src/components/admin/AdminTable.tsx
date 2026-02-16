import { ReactNode } from 'react'

export interface Column<T> {
    /** Заголовок колонки */
    header: string
    /** Рендер ячейки */
    render: (row: T, index?: number) => ReactNode
    /** Дополнительные CSS-классы для td */
    className?: string
}

interface AdminTableProps<T> {
    columns: Column<T>[]
    data: T[]
    loading: boolean
    emptyText?: string
    /** Уникальный ключ строки */
    rowKey: (row: T) => string | number
    /** Клик по строке */
    onRowClick?: (row: T) => void
}

/**
 * Универсальная таблица для admin-панели.
 * Включает спиннер загрузки, empty state, hover-эффекты.
 * Убирает ~40 строк дублированной разметки из каждой страницы.
 */
export default function AdminTable<T>({
    columns, data, loading, emptyText = 'Нет данных', rowKey, onRowClick,
}: AdminTableProps<T>) {
    return (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                                {columns.map((col, i) => (
                                    <th key={i} className="px-5 py-3">{col.header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {data.map((row, rowIndex) => (
                                <tr
                                    key={rowKey(row)}
                                    className={`hover:bg-gray-800/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                                    onClick={() => onRowClick?.(row)}
                                >
                                    {columns.map((col, i) => (
                                        <td key={i} className={`px-5 py-3 ${col.className || ''}`}>
                                            {col.render(row, rowIndex)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            {data.length === 0 && (
                                <tr>
                                    <td colSpan={columns.length} className="px-5 py-12 text-center text-gray-600">
                                        {emptyText}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
