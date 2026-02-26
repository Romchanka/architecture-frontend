import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAdmin } from '@/components/AdminGuard'
import { ADMIN_NAV, ROLE_LABELS } from '@/types/admin'

/**
 * AdminLayout — Admin panel shell (SRP: composes admin sidebar + content area)
 * - Desktop: fixed 256px sidebar + offset content
 * - Mobile: hamburger toggle + slide-out overlay sidebar + backdrop
 */
export default function AdminLayout() {
    const employee = useAdmin()
    const navigate = useNavigate()
    const navItems = ADMIN_NAV[employee.userType] || ADMIN_NAV.CONSULTANT
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const handleLogout = () => {
        localStorage.removeItem('token')
            ; (window as any).__adminEmployee = null
        navigate('/login')
    }

    const closeSidebar = () => setSidebarOpen(false)

    const sidebarContent = (
        <>
            {/* Logo */}
            <div className="px-6 py-5 border-b border-gray-800">
                <h1 className="text-xl font-bold text-white tracking-tight">
                    🏗️ <span className="text-amber-400">Architecture</span>
                </h1>
                <p className="text-xs text-gray-500 mt-1">Панель управления</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-thin">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/admin'}
                        onClick={closeSidebar}
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
        </>
    )

    return (
        <div className="min-h-screen bg-gray-950">
            {/* Mobile Header */}
            <div className="md:hidden sticky top-0 z-40 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 h-14">
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    aria-label="Открыть меню"
                    id="admin-sidebar-toggle"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <h1 className="text-base font-bold text-white">
                    🏗️ <span className="text-amber-400">Architecture</span>
                </h1>
                <div className="w-10" /> {/* Spacer for centering */}
            </div>

            {/* Mobile Sidebar Overlay */}
            <div
                className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
            >
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={closeSidebar}
                />
                {/* Sidebar Panel */}
                <aside
                    className={`absolute left-0 top-0 w-72 max-w-[85vw] h-full bg-gray-900 border-r border-gray-800 flex flex-col transform transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                        }`}
                >
                    {sidebarContent}
                </aside>
            </div>

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-64 bg-gray-900 border-r border-gray-800 flex-col fixed h-full z-30">
                {sidebarContent}
            </aside>

            {/* Main content */}
            <div className="md:ml-64">
                <main className="p-4 md:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
