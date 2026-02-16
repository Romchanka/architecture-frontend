export default function Footer() {
    return (
        <footer className="bg-gray-900 text-white py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Company info */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Сервис покупки квартир</h3>
                        <p className="text-gray-400 text-sm">
                            Современная платформа для продажи недвижимости в Бишкеке
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Навигация</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <a href="/" className="text-gray-400 hover:text-white transition-colors">
                                    Главная
                                </a>
                            </li>
                            <li>
                                <a href="/marketplace" className="text-gray-400 hover:text-white transition-colors">
                                    Каталог
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Контакты</h3>
                        <p className="text-gray-400 text-sm">
                            Бишкек, Кыргызстан
                        </p>
                    </div>
                </div>

                <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
                    <p>&copy; 2026 Сервис покупки квартир. Все права защищены.</p>
                </div>
            </div>
        </footer>
    )
}
