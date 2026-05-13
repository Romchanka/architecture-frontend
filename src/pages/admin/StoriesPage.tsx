import { useState, useRef } from 'react'
import { PageHeader, AdminTable, Column, Modal, ModalBody, ModalFooter, SubmitButton, FormField, inputCls, StatusBadge } from '@/components/admin'
import { useApiData } from '@/hooks/useApiData'
import { useApiAction } from '@/hooks/useApiAction'
import { useToast, ToastContainer } from '@/components/Toast'
import api from '@/lib/api'
import { fmtDate } from '@/lib/format'

interface Story {
    id: number
    title: string
    description: string
    imageUrl: string
    linkUrl: string
    isActive: boolean
    expiresAt: string | null
    createdAt: string
}

export default function StoriesPage() {
    const { data: stories, loading, reload } = useApiData<Story[]>('/stories', [])
    const [exec, createState] = useApiAction()
    const { toasts, show: showToast } = useToast()

    // Create modal state
    const [showCreate, setShowCreate] = useState(false)
    const [form, setForm] = useState({ title: '', description: '', linkUrl: '', expiresAt: '' })
    const [imageFile, setImageFile] = useState<File | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    const handleCreate = async () => {
        if (!form.title || !imageFile) {
            showToast('Укажите заголовок и выберите изображение', 'warning')
            return
        }
        exec(async () => {
            const fd = new FormData()
            fd.append('title', form.title)
            fd.append('image', imageFile)
            if (form.description) fd.append('description', form.description)
            if (form.linkUrl) fd.append('linkUrl', form.linkUrl)
            if (form.expiresAt) fd.append('expiresAt', new Date(form.expiresAt).toISOString())
            
            await api.post('/stories', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
            return true
        }, {
            errorFallback: 'Ошибка создания стори',
            onSuccess: () => {
                setShowCreate(false)
                setForm({ title: '', description: '', linkUrl: '', expiresAt: '' })
                setImageFile(null)
                reload()
                showToast('Стори успешно создана', 'info')
            }
        })
    }

    const toggleStatus = (id: number, isActive: boolean) => {
        exec(() => api.patch(`/stories/${id}/status?isActive=${!isActive}`), {
            errorFallback: 'Ошибка обновления статуса',
            onSuccess: reload
        })
    }

    const deleteStory = (id: number) => {
        if (!confirm('Точно удалить эту стори?')) return
        exec(() => api.delete(`/stories/${id}`), {
            errorFallback: 'Ошибка удаления',
            onSuccess: reload
        })
    }

    const columns: Column<Story>[] = [
        {
            header: 'Изображение', render: (s) => (
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-700">
                    <img src={s.imageUrl} alt={s.title} className="w-full h-full object-cover" />
                </div>
            )
        },
        {
            header: 'Заголовок', render: (s) => (
                <div>
                    <div className="font-medium text-white">{s.title}</div>
                    {s.description && <div className="text-xs text-gray-500 truncate max-w-xs">{s.description}</div>}
                </div>
            )
        },
        {
            header: 'Статус', render: (s) => (
                <StatusBadge 
                    status={s.isActive ? 'ACTIVE' : 'INACTIVE'} 
                    colorMap={{
                        ACTIVE: { label: 'Активно', cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
                        INACTIVE: { label: 'Скрыто', cls: 'bg-gray-500/10 text-gray-400 border border-gray-500/20' }
                    }} 
                />
            )
        },
        {
            header: 'Срок действия', render: (s) => (
                <div className="text-xs text-gray-400">
                    {s.expiresAt ? `До ${fmtDate(s.expiresAt)}` : 'Бессрочно'}
                </div>
            )
        },
        {
            header: 'Действия', render: (s) => (
                <div className="flex gap-3">
                    <button onClick={() => toggleStatus(s.id, s.isActive)} className="text-xs text-blue-400 hover:text-blue-300">
                        {s.isActive ? 'Скрыть' : 'Показать'}
                    </button>
                    <button onClick={() => deleteStory(s.id)} className="text-xs text-red-400 hover:text-red-300">
                        Удалить
                    </button>
                </div>
            )
        }
    ]

    return (
        <div>
            <PageHeader title="Истории (Stories)" count={stories.length} actionLabel="+ Добавить стори" onAction={() => setShowCreate(true)} />
            <AdminTable columns={columns} data={stories} loading={loading} rowKey={(s) => s.id} emptyText="Нет историй" />

            <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Новая стори" width="max-w-md">
                <ModalBody>
                    <FormField label="Заголовок *">
                        <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="Новогодняя акция!" />
                    </FormField>
                    <FormField label="Описание">
                        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls} placeholder="Короткий текст..." rows={2} />
                    </FormField>
                    <FormField label="Изображение (9:16) *">
                        <div className="flex items-center gap-3">
                            <button onClick={() => fileRef.current?.click()} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300 hover:bg-gray-700 transition-colors">
                                Выбрать файл
                            </button>
                            <span className="text-xs text-gray-500 truncate max-w-[150px]">{imageFile?.name || 'Не выбрано'}</span>
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                    </FormField>
                    <FormField label="Ссылка (URL) - опционально">
                        <input value={form.linkUrl} onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))} className={inputCls} placeholder="https://..." />
                    </FormField>
                    <FormField label="Дата окончания - опционально">
                        <input type="datetime-local" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} className={inputCls} />
                    </FormField>
                </ModalBody>
                <ModalFooter>
                    <SubmitButton onClick={handleCreate} disabled={!form.title || !imageFile} loading={createState.loading} label="Создать" />
                </ModalFooter>
            </Modal>

            <ToastContainer toasts={toasts} />
        </div>
    )
}
