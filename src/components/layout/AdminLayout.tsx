import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAdmin } from '@/components/AdminGuard'
import { ADMIN_NAV, ROLE_LABELS } from '@/types/admin'

export default function AdminLayout() {
    const employee = useAdmin()
    const navigate = useNavigate()
    const navItems = ADMIN_NAV[employee.userType] || ADMIN_NAV.CONSULTANT

    const handleLogout = () => {
        localStorage.removeItem('token')
            ; (window as any).__adminEmployee = null
        navigate('/login')
    }

    return (
        <div className="min-h-screen bg-gray-950 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col fixed h-full z-30">
                {/* Logo */}
                <div className="px-6 py-5 border-b border-gray-800">
                    <h1 className="text-xl font-bold text-white tracking-tight">
                        🏗️ <span className="text-amber-400">Architecture</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">Панель управления</p>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/admin'}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${isActive
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                }`
                            }
                        >
                            <span className="text-base">{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                {/* User info */}
                <div className="p-4 border-t border-gray-800">
                    <div className="bg-gray-800/50 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">
                                {employee.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                    {employee.fullName || employee.phone}
                                </p>
                                <p className="text-xs text-amber-400/70">
                                    {ROLE_LABELS[employee.userType]}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full mt-3 text-xs text-gray-500 hover:text-red-400 transition-colors py-1"
                        >
                            Выйти →
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 ml-64">
                <main className="p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
