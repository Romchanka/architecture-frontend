import { Navigate } from 'react-router-dom'
import { useAdmin } from '@/components/AdminGuard'
import { ADMIN_NAV } from '@/types/admin'

interface RoleRouteProps {
    path: string
    children: React.ReactNode
}

/**
 * Protects admin routes based on the current employee's role.
 * If the employee's role doesn't include the given path in ADMIN_NAV,
 * they are redirected to /admin (dashboard).
 */
export default function RoleRoute({ path, children }: RoleRouteProps) {
    const employee = useAdmin()

    if (!employee) {
        return <Navigate to="/login" replace />
    }

    const allowedPaths = ADMIN_NAV[employee.userType]?.map((n) => n.path) || []

    // Dashboard (/admin) is always accessible
    if (path === '/admin' || allowedPaths.includes(path)) {
        return <>{children}</>
    }

    return <Navigate to="/admin" replace />
}
