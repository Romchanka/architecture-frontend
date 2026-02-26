import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function HomePage() {
    const { isAuthenticated } = useAuthStore()

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="bg-gradient-to-br from-primary-500 to-primary-700 text-white py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <h1 className="text-5xl md:text-6xl font-bold mb-6">
                            Найдите квартиру своей мечты
                        </h1>
                        <p className="text-xl md:text-2xl mb-8 text-primary-100">
                            Современная платформа для покупки недвижимости в Бишкеке
                        </p>
                        <Link
                            to="/marketplace"
                            className="inline-block bg-white text-primary-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors"
                        >
                            Смотреть каталог
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-16 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-center mb-12">
                        Почему выбирают нас
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white p-6 rounded-lg shadow-sm">
                            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Проверенные объекты</h3>
                            <p className="text-gray-600">
                                Все квартиры от надежных застройщиков с полным юридическим сопровождением
                            </p>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-sm">
                            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Удобная оплата</h3>
                            <p className="text-gray-600">
                                Гибкие графики платежей и возможность рассрочки
                            </p>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-sm">
                            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Быстрое бронирование</h3>
                            <p className="text-gray-600">
                                Забронируйте квартиру онлайн за несколько минут
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA — different for guests vs authenticated users */}
            <section className="py-16 bg-primary-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    {isAuthenticated ? (
                        <>
                            <h2 className="text-3xl font-bold mb-4">
                                Выберите квартиру прямо сейчас
                            </h2>
                            <p className="text-xl mb-8 text-primary-100">
                                Откройте каталог и забронируйте квартиру в несколько кликов
                            </p>
                            <Link
                                to="/marketplace"
                                className="inline-block bg-white text-primary-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors"
                            >
                                Перейти в каталог
                            </Link>
                        </>
                    ) : (
                        <>
                            <h2 className="text-3xl font-bold mb-4">
                                Готовы найти свою квартиру?
                            </h2>
                            <p className="text-xl mb-8 text-primary-100">
                                Зарегистрируйтесь и получите доступ ко всем возможностям платформы
                            </p>
                            <Link
                                to="/register"
                                className="inline-block bg-white text-primary-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors"
                            >
                                Зарегистрироваться
                            </Link>
                        </>
                    )}
                </div>
            </section>
        </div>
    )
}

