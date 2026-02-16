import { useState, useMemo } from 'react'
import api from '@/lib/api'
import { ROLE_LABELS, EmployeeRole } from '@/types/admin'
import { useApiData } from '@/hooks/useApiData'
import { useApiAction } from '@/hooks/useApiAction'
import {
    AdminTable, Column, PageHeader, FilterBar, StatusBadge,
    Modal, ModalBody, ModalFooter, SubmitButton, ModalError,
    FormField, inputCls, filterSelectCls,
} from '@/components/admin'

interface EmployeeRow {
    id: number
    phone: string
    fullName: string
    userType: EmployeeRole
    isActive: boolean
    createdAt: string
}

const ACTIVE_MAP: Record<string, { label: string; cls: string }> = {
    true: { label: 'Активен', cls: 'bg-emerald-500/10 text-emerald-400' },
    false: { label: 'Неактивен', cls: 'bg-red-500/10 text-red-400' },
}

const ROLE_BADGE: Record<string, { label: string; cls: string }> = Object.fromEntries(
    Object.entries(ROLE_LABELS).map(([key, label]) => [key, { label, cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' }])
)

export default function EmployeesPage() {
    const { data: employees, loading, reload } = useApiData<EmployeeRow[]>('/employees?size=200', [])
    const [exec, createState] = useApiAction()

    const [roleFilter, setRoleFilter] = useState('')
    const [showCreate, setShowCreate] = useState(false)
    const [createForm, setCreateForm] = useState({
        phone: '', password: '', fullName: '', userType: 'CONSULTANT' as EmployeeRole,
    })

    const filtered = useMemo(() =>
        roleFilter ? employees.filter((e) => e.userType === roleFilter) : employees,
        [employees, roleFilter]
    )

    const getEndpoint = (type: EmployeeRole) => {
        const map: Record<string, string> = {
            CONSULTANT: '/employees/consultants',
            ACCOUNTANT: '/employees/accountants',
            ADMIN: '/employees/admins',
            SUPER_USER: '/employees/super-users',
        }
        return map[type] || '/employees/consultants'
    }

    const handleCreate = () => exec(
        () => api.post(getEndpoint(createForm.userType), {
            phone: createForm.phone,
            password: createForm.password,
            fullName: createForm.fullName,
        }),
        {
            errorFallback: 'Ошибка создания сотрудника',
            onSuccess: () => {
                setShowCreate(false)
                setCreateForm({ phone: '', password: '', fullName: '', userType: 'CONSULTANT' })
                reload()
            },
        }
    )

    const columns: Column<EmployeeRow>[] = [
        { header: 'ID', render: (e) => <span className="text-sm text-gray-400">#{e.id}</span> },
        { header: 'Имя', render: (e) => <span className="text-sm text-white font-medium">{e.fullName}</span> },
        { header: 'Телефон', render: (e) => <span className="text-sm text-gray-400">{e.phone}</span> },
        { header: 'Роль', render: (e) => <StatusBadge status={e.userType} colorMap={ROLE_BADGE} /> },
        { header: 'Статус', render: (e) => <StatusBadge status={String(e.isActive)} colorMap={ACTIVE_MAP} /> },
        {
            header: 'Действия', render: (emp) => (
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        const action = emp.isActive ? 'deactivate' : 'activate'
                        exec(
                            () => api.put(`/employees/${emp.id}/${action}`),
                            { confirm: `${emp.isActive ? 'Деактивировать' : 'Активировать'} ${emp.fullName}?`, onSuccess: reload }
                        )
                    }}
                    className={`text-xs transition-colors ${emp.isActive ? 'text-red-400 hover:text-red-300' : 'text-emerald-400 hover:text-emerald-300'}`}
                >
                    {emp.isActive ? 'Деактивировать' : 'Активировать'}
                </button>
            ),
        },
    ]

    const set = (k: string, v: string) => setCreateForm((f) => ({ ...f, [k]: v }))

    return (
        <div>
            <PageHeader title="Сотрудники" count={filtered.length} countLabel="сотрудников" actionLabel="+ Добавить сотрудника" onAction={() => setShowCreate(true)} />

            <FilterBar>
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={filterSelectCls}>
                    <option value="">Все роли</option>
                    {Object.entries(ROLE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
            </FilterBar>

            <AdminTable columns={columns} data={filtered} loading={loading} rowKey={(e) => e.id} emptyText="Сотрудников не найдено" />

            <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Добавить сотрудника">
                <ModalBody>
                    <ModalError message={createState.error} />
                    <FormField label="ФИО *">
                        <input type="text" value={createForm.fullName} onChange={(e) => set('fullName', e.target.value)} className={inputCls} placeholder="Иванов Иван Иванович" />
                    </FormField>
                    <FormField label="Телефон *">
                        <input type="tel" value={createForm.phone} onChange={(e) => set('phone', e.target.value)} className={inputCls} placeholder="+996 XXX XXX XXX" />
                    </FormField>
                    <FormField label="Пароль *">
                        <input type="password" value={createForm.password} onChange={(e) => set('password', e.target.value)} className={inputCls} placeholder="Пароль" />
                    </FormField>
                    <FormField label="Роль">
                        <select value={createForm.userType} onChange={(e) => set('userType', e.target.value)} className={inputCls}>
                            <option value="CONSULTANT">Консультант</option>
                            <option value="ACCOUNTANT">Бухгалтер</option>
                            <option value="ADMIN">Администратор</option>
                        </select>
                    </FormField>
                </ModalBody>
                <ModalFooter>
                    <SubmitButton onClick={handleCreate} disabled={!createForm.phone || !createForm.password || !createForm.fullName} loading={createState.loading} label="Создать сотрудника" loadingLabel="Создание..." />
                </ModalFooter>
            </Modal>
        </div>
    )
}
