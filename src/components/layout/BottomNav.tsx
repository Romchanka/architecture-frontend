import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

/**
 * BottomNav — Mobile bottom navigation bar (SRP: only handles mobile tab navigation)
 * Visible only on mobile (md:hidden), fixed to bottom.
 * Follows iOS/Android native app patterns: 3-4 tabs with icons and labels.
 */
export default function BottomNav() {
    const location = useLocation()
    const { isAuthenticated } = useAuthStore()

    const tabs = [
        {
            to: '/',
            label: 'Главная',
            icon: (active: boolean) => (
                <svg className={`w-6 h-6 ${active ? 'text-primary-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 1.5}
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            ),
            match: (path: string) => path === '/',
        },
        {
            to: '/marketplace',
            label: 'Каталог',
            icon: (active: boolean) => (
                <svg className={`w-6 h-6 ${active ? 'text-primary-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 1.5}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
            ),
            match: (path: string) => path.startsWith('/marketplace'),
        },
        {
            to: isAuthenticated ? '/profile' : '/login',
            label: isAuthenticated ? 'Профиль' : 'Войти',
            icon: (active: boolean) => (
                <svg className={`w-6 h-6 ${active ? 'text-primary-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 1.5}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            ),
            match: (path: string) => path === '/profile' || path === '/login',
        },
    ]

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            id="bottom-nav"
        >
            <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
                {tabs.map((tab) => {
                    const active = tab.match(location.pathname)
                    return (
                        <Link
                            key={tab.to}
                            to={tab.to}
                            className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 relative group ${active ? 'text-primary-600' : 'text-gray-400'
                                }`}
                        >
                            {/* Active indicator dot */}
                            {active && (
                                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-600 rounded-full" />
                            )}
                            <span className={`transform transition-transform duration-200 ${active ? 'scale-110' : 'group-active:scale-90'}`}>
                                {tab.icon(active)}
                            </span>
                            <span className={`text-[10px] mt-0.5 font-medium transition-colors duration-200 ${active ? 'text-primary-600' : 'text-gray-400'
                                }`}>
                                {tab.label}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
