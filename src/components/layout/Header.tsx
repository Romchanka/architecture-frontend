import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function Header() {
    const { isAuthenticated, user, logout } = useAuthStore()

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

                    {/* Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        <Link
                            to="/"
                            className="text-gray-700 hover:text-primary-600 transition-colors"
                        >
                            Главная
                        </Link>
                        <Link
                            to="/marketplace"
                            className="text-gray-700 hover:text-primary-600 transition-colors"
                        >
                            Каталог
                        </Link>
                        {isAuthenticated && (
                            <Link
                                to="/profile"
                                className="text-gray-700 hover:text-primary-600 transition-colors"
                            >
                                Профиль
                            </Link>
                        )}
                    </div>

                    {/* User menu */}
                    <div className="flex items-center space-x-4">
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
                </div>
            </nav>
        </header>
    )
}
