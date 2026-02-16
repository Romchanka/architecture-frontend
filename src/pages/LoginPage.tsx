import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import { LoginResponse, User } from '@/types'

export default function LoginPage() {
    const navigate = useNavigate()
    const login = useAuthStore((state) => state.login)
    const [formData, setFormData] = useState({
        phone: '',
        password: ''
    })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const { data: authData } = await api.post<LoginResponse>('/auth/login', formData)

            // Create minimal user - full details loaded lazily when needed
            const userData: User = {
                id: 0,
                phone: formData.phone,
                firstName: '',
                lastName: '',
                email: ''
            }

            login(authData.token, userData)

            // Check if this is an employee user - redirect to admin panel
            try {
                const { data: me } = await api.get('/auth/me')
                if (me.userType && ['SUPER_USER', 'ADMIN', 'ACCOUNTANT', 'CONSULTANT'].includes(me.userType)) {
                    navigate('/admin')
                    return
                }
            } catch {
                // Not an employee, continue to marketplace
            }

            navigate('/marketplace')
        } catch (err: any) {
            setError(err.response?.data?.message || 'Ошибка входа')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-lg shadow-md p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-gray-900">Вход</h2>
                        <p className="mt-2 text-gray-600">
                            Войдите в свой аккаунт
                        </p>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                                Номер телефона
                            </label>
                            <input
                                id="phone"
                                type="tel"
                                required
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                placeholder="+996 XXX XXX XXX"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                Пароль
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                placeholder="••••••••"
                            />
                            <div className="mt-2 text-right">
                                <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">
                                    Забыли пароль?
                                </Link>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50"
                        >
                            {loading ? 'Вход...' : 'Войти'}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 text-center text-sm">
                        <span className="text-gray-600">Нет аккаунта?</span>{' '}
                        <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                            Зарегистрироваться
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
