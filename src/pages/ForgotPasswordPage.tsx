import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '@/lib/api'

interface PasswordResetEmailRequest {
    email: string
}

interface PasswordResetRequest {
    token: string
    newPassword: string
}

interface MessageResponse {
    message: string
}

export default function ForgotPasswordPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const resetToken = searchParams.get('token')

    const [step, setStep] = useState<'email' | 'reset'>(resetToken ? 'reset' : 'email')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSendResetLink = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setLoading(true)

        try {
            const { data } = await api.post<MessageResponse>('/auth/password/forgot', { email } as PasswordResetEmailRequest)
            setSuccess(data.message)
        } catch (err: any) {
            setError(err.response?.data?.message || 'Ошибка отправки письма')
        } finally {
            setLoading(false)
        }
    }

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        if (password !== confirmPassword) {
            setError('Пароли не совпадают')
            return
        }

        if (password.length < 6) {
            setError('Пароль должен содержать минимум 6 символов')
            return
        }

        setLoading(true)

        try {
            const { data } = await api.post<MessageResponse>('/auth/password/reset', {
                token: resetToken,
                newPassword: password
            } as PasswordResetRequest)

            setSuccess(data.message)
            setTimeout(() => navigate('/login'), 2000)
        } catch (err: any) {
            setError(err.response?.data?.message || 'Ошибка смены пароля')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 px-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        {step === 'email' ? 'Восстановление пароля' : 'Новый пароль'}
                    </h1>
                    <p className="text-gray-600">
                        {step === 'email' && 'Введите email для получения ссылки'}
                        {step === 'reset' && 'Создайте новый пароль'}
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
                            {success}
                        </div>
                    )}

                    {/* Step 1: Email */}
                    {step === 'email' && (
                        <form onSubmit={handleSendResetLink} className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    placeholder="your@email.com"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50"
                            >
                                {loading ? 'Отправка...' : 'Отправить ссылку'}
                            </button>

                            <p className="text-sm text-gray-500 mt-4">
                                Мы отправим ссылку для сброса пароля на указанный email, если он зарегистрирован в системе.
                            </p>
                        </form>
                    )}

                    {/* Step 2: New Password */}
                    {step === 'reset' && (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                    Новый пароль
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    minLength={6}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    placeholder="Минимум 6 символов"
                                />
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                    Подтвердите пароль
                                </label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    required
                                    minLength={6}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    placeholder="Повторите пароль"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50"
                            >
                                {loading ? 'Сохранение...' : 'Изменить пароль'}
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center text-sm text-gray-600">
                        Вспомнили пароль?{' '}
                        <Link to="/login" className="text-primary-600 hover:underline font-medium">
                            Войти
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
