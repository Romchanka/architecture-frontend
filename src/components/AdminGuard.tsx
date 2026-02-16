import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import api from '@/lib/api'
import { EmployeeUser } from '@/types/admin'

interface AdminGuardProps {
    children: React.ReactNode
}

export interface AdminContextValue {
    employee: EmployeeUser
}

export default function AdminGuard({ children }: AdminGuardProps) {
    const [status, setStatus] = useState<'loading' | 'ok' | 'denied'>('loading')
    const [employee, setEmployee] = useState<EmployeeUser | null>(null)

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) {
            setStatus('denied')
            return
        }

        api.get('/auth/me')
            .then(({ data }) => {
                // EmployeeUser has userType field, regular User does not
                if (data.userType && ['SUPER_USER', 'ADMIN', 'ACCOUNTANT', 'CONSULTANT'].includes(data.userType)) {
                    setEmployee({
                        id: data.id,
                        phone: data.phone,
                        fullName: data.fullName || `${data.lastName || ''} ${data.firstName || ''}`.trim(),
                        userType: data.userType,
                        companyId: data.companyId,
                        isActive: data.isActive ?? true,
                    })
                    setStatus('ok')
                } else {
                    setStatus('denied')
                }
            })
            .catch(() => {
                setStatus('denied')
            })
    }, [])

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-400 text-sm">Загрузка...</span>
                </div>
            </div>
        )
    }

    if (status === 'denied') {
        return <Navigate to="/login" replace />
    }

    // Pass the employee data down through a context-like approach via window
    // We'll use a simple global for now, components read it via useAdmin hook
    if (employee) {
        ; (window as any).__adminEmployee = employee
    }

    return <>{children}</>
}

// Hook to access current employee in admin pages
export function useAdmin(): EmployeeUser {
    return (window as any).__adminEmployee
}
