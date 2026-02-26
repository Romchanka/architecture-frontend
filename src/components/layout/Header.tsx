import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'

export default function Header() {
    const { isAuthenticated, user, logout } = useAuthStore()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const location = useLocation()

    const closeMobileMenu = () => setMobileMenuOpen(false)

    const isActive = (path: string) =>
        location.pathname === path ? 'text-primary-600 font-semibold' : 'text-gray-700'

    return (
        <header className="bg-white shadow-sm sticky top-0 z-50">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center">
                        <span className="text-2xl font-bold text-primary-600">
                            🏢 Квартиры
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        <Link
                            to="/"
                            className={`${isActive('/')} hover:text-primary-600 transition-colors`}
                        >
                            Главная
                        </Link>
                        <Link
                            to="/marketplace"
                            className={`${isActive('/marketplace')} hover:text-primary-600 transition-colors`}
                        >
                            Каталог
                        </Link>
                        {isAuthenticated && (
                            <Link
                                to="/profile"
                                className={`${isActive('/profile')} hover:text-primary-600 transition-colors`}
                            >
                                Профиль
                            </Link>
                        )}
                    </div>

                    {/* Desktop User Menu */}
                    <div className="hidden md:flex items-center space-x-4">
                        {isAuthenticated ? (
                            <>
                                <Link
                                    to="/profile"
                                    className="flex items-center gap-2 text-gray-700 hover:text-primary-600 transition-colors font-medium"
                                >
                                    <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">
                                        {user?.firstName?.[0] || '?'}
                                    </span>
                                    {user?.firstName}
                                </Link>
                                <button
                                    onClick={logout}
                                    className="text-gray-700 hover:text-red-600 transition-colors"
                                >
                                    Выход
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="text-gray-700 hover:text-primary-600 transition-colors"
                                >
                                    Вход
                                </Link>
                                <Link
                                    to="/register"
                                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                                >
                                    Регистрация
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Hamburger Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                        aria-label="Меню"
                        id="mobile-menu-toggle"
                    >
                        <div className="w-6 h-5 relative flex flex-col justify-between">
                            <span className={`block h-0.5 w-full bg-current transform transition-all duration-300 origin-center ${mobileMenuOpen ? 'rotate-45 translate-y-[9px]' : ''}`} />
                            <span className={`block h-0.5 w-full bg-current transition-all duration-200 ${mobileMenuOpen ? 'opacity-0 scale-0' : ''}`} />
                            <span className={`block h-0.5 w-full bg-current transform transition-all duration-300 origin-center ${mobileMenuOpen ? '-rotate-45 -translate-y-[9px]' : ''}`} />
                        </div>
                    </button>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            <div
                className={`fixed inset-0 z-40 transition-opacity duration-300 md:hidden ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                style={{ top: '64px' }}
            >
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    onClick={closeMobileMenu}
                />

                {/* Menu Panel */}
                <div
                    className={`absolute top-0 right-0 w-72 max-w-[85vw] h-[calc(100vh-64px)] bg-white shadow-2xl transform transition-transform duration-300 ease-out ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
                        }`}
                >
                    <div className="flex flex-col h-full">
                        {/* Navigation Links */}
                        <nav className="flex-1 py-4 px-4 space-y-1 overflow-y-auto">
                            <Link
                                to="/"
                                onClick={closeMobileMenu}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${location.pathname === '/'
                                        ? 'bg-primary-50 text-primary-700'
                                        : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <span className="text-xl">🏠</span>
                                Главная
                            </Link>
                            <Link
                                to="/marketplace"
                                onClick={closeMobileMenu}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${location.pathname.startsWith('/marketplace')
                                        ? 'bg-primary-50 text-primary-700'
                                        : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <span className="text-xl">🏢</span>
                                Каталог
                            </Link>
                            {isAuthenticated && (
                                <Link
                                    to="/profile"
                                    onClick={closeMobileMenu}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${location.pathname === '/profile'
                                            ? 'bg-primary-50 text-primary-700'
                                            : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <span className="text-xl">👤</span>
                                    Профиль
                                </Link>
                            )}
                        </nav>

                        {/* Auth Section */}
                        <div className="border-t border-gray-100 p-4">
                            {isAuthenticated ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 px-3">
                                        <span className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">
                                            {user?.firstName?.[0] || '?'}
                                        </span>
                                        <div>
                                            <p className="font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                                            <p className="text-xs text-gray-500">{user?.phone}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { logout(); closeMobileMenu() }}
                                        className="w-full px-4 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors font-medium text-left"
                                    >
                                        Выйти из аккаунта
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Link
                                        to="/login"
                                        onClick={closeMobileMenu}
                                        className="block w-full px-4 py-3 text-center rounded-xl border-2 border-primary-600 text-primary-600 font-semibold hover:bg-primary-50 transition-colors"
                                    >
                                        Войти
                                    </Link>
                                    <Link
                                        to="/register"
                                        onClick={closeMobileMenu}
                                        className="block w-full px-4 py-3 text-center rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors"
                                    >
                                        Регистрация
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    )
}
