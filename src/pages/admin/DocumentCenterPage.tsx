import { useEffect, useState, useCallback } from 'react'
import { AdminTable, Column, PageHeader, FilterBar, filterSelectCls, filterInputCls } from '@/components/admin'
import { documentApi } from '@/lib/api/documentApi'
import { fmtDateTime } from '@/lib/format'

interface DocumentRow {
    id: number
    documentType: string
    title: string
    fileUrl: string
    uploadedAt: string
    notes: string
    userId: number
    userName: string
    userPhone: string
}

interface SearchResult {
    documents: DocumentRow[]
    totalElements: number
    totalPages: number
    currentPage: number
    typeStats: Record<string, number>
}

const DOC_TYPE_LABELS: Record<string, string> = {
    PASSPORT: 'Паспорт',
    CONTRACT: 'Договор',
    OTHER: 'Другое',
}

const DOC_TYPE_ICONS: Record<string, string> = {
    PASSPORT: '🪪',
    CONTRACT: '📑',
    OTHER: '📎',
}

export default function DocumentCenterPage() {
    const [result, setResult] = useState<SearchResult | null>(null)
    const [loading, setLoading] = useState(true)
    const [query, setQuery] = useState('')
    const [docType, setDocType] = useState('')
    const [page, setPage] = useState(0)
    const [debouncedQuery, setDebouncedQuery] = useState('')

    // Debounce search query
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(query), 400)
        return () => clearTimeout(t)
    }, [query])

    // Reset page on filter change
    useEffect(() => {
        setPage(0)
    }, [debouncedQuery, docType])

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const params: Record<string, any> = { page, size: 20 }
            if (debouncedQuery) params.query = debouncedQuery
            if (docType) params.documentType = docType
            const { data } = await documentApi.search(params)
            setResult(data)
        } catch (err) {
            console.error('Error loading documents:', err)
        } finally {
            setLoading(false)
        }
    }, [debouncedQuery, docType, page])

    useEffect(() => {
        loadData()
    }, [loadData])

    const totalDocs = result
        ? Object.values(result.typeStats).reduce((s, v) => s + v, 0)
        : 0

    const columns: Column<DocumentRow>[] = [
        {
            header: 'Клиент', render: (d) => (
                <div>
                    <div className="text-sm font-medium text-white">{d.userName}</div>
                    <div className="text-xs text-gray-500">{d.userPhone}</div>
                </div>
            )
        },
        {
            header: 'Тип', render: (d) => (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${d.documentType === 'PASSPORT'
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        : d.documentType === 'CONTRACT'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                    }`}>
                    {DOC_TYPE_ICONS[d.documentType] || '📄'} {DOC_TYPE_LABELS[d.documentType] || d.documentType}
                </span>
            )
        },
        {
            header: 'Название', render: (d) => (
                <div>
                    <div className="text-sm text-gray-200 truncate max-w-xs">{d.title || '—'}</div>
                    {d.notes && <div className="text-xs text-gray-500 truncate max-w-xs">{d.notes}</div>}
                </div>
            )
        },
        {
            header: 'Дата загрузки', render: (d) => (
                <span className="text-xs text-gray-400">{fmtDateTime(d.uploadedAt)}</span>
            )
        },
        {
            header: 'Действия', render: (d) => (
                <div className="flex gap-3">
                    <a
                        href={d.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                        id={`doc-view-${d.id}`}
                    >
                        Открыть ↗
                    </a>
                </div>
            )
        },
    ]

    return (
        <div>
            <PageHeader title="Документ-центр" count={totalDocs} />

            {/* Stats cards */}
            {result && Object.keys(result.typeStats).length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="rounded-xl border p-4 bg-gray-900 border-gray-800">
                        <p className="text-xs text-gray-400 uppercase tracking-wider">Всего</p>
                        <p className="text-2xl font-bold mt-1 text-white">{totalDocs}</p>
                    </div>
                    {Object.entries(result.typeStats).map(([type, count]) => (
                        <div
                            key={type}
                            className={`rounded-xl border p-4 cursor-pointer transition-all duration-150 ${docType === type
                                    ? 'bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/20'
                                    : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                                }`}
                            onClick={() => setDocType(docType === type ? '' : type)}
                        >
                            <p className="text-xs text-gray-400 uppercase tracking-wider">
                                {DOC_TYPE_ICONS[type] || '📄'} {DOC_TYPE_LABELS[type] || type}
                            </p>
                            <p className={`text-2xl font-bold mt-1 ${docType === type ? 'text-amber-400' : 'text-gray-200'
                                }`}>{count}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Search + filter */}
            <FilterBar>
                <div className="flex-1 min-w-[200px]">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Поиск по названию, заметкам, ФИО клиента..."
                        className={filterInputCls}
                        id="document-center-search"
                    />
                </div>
                <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className={filterSelectCls}
                    id="document-center-type-filter"
                >
                    <option value="">Все типы</option>
                    <option value="PASSPORT">🪪 Паспорт</option>
                    <option value="CONTRACT">📑 Договор</option>
                    <option value="OTHER">📎 Другое</option>
                </select>
            </FilterBar>

            {/* Table */}
            <AdminTable
                columns={columns}
                data={result?.documents || []}
                loading={loading}
                rowKey={(d) => d.id}
                emptyText={debouncedQuery ? `По запросу «${debouncedQuery}» ничего не найдено` : 'Документы не найдены'}
            />

            {/* Pagination */}
            {result && result.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 px-2">
                    <span className="text-xs text-gray-500">
                        Страница {result.currentPage + 1} из {result.totalPages} ({result.totalElements} документов)
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 0}
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            id="document-center-prev"
                        >
                            ← Назад
                        </button>
                        <button
                            disabled={page >= result.totalPages - 1}
                            onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            id="document-center-next"
                        >
                            Далее →
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
