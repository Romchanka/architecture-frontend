import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import { RegisterRequest, OtpRequest, OtpSendResponse, OtpVerifyRequest, LoginResponse, User } from '@/types'

export default function RegisterPage() {
    const navigate = useNavigate()
    const login = useAuthStore((state) => state.login)
    const [step, setStep] = useState<'phone' | 'otp' | 'details'>('phone')
    const [phone, setPhone] = useState('')
    const [otpCode, setOtpCode] = useState('')
    const [otpToken, setOtpToken] = useState('')
    const [formData, setFormData] = useState<RegisterRequest>({
        phone: '',
        password: '',
        firstName: '',
        lastName: '',
        middleName: '',
        email: ''
    })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const { data } = await api.post<OtpSendResponse>('/auth/otp/send', { phone } as OtpRequest)
            setOtpToken(data.token)
            setFormData({ ...formData, phone })
            setStep('otp')
        } catch (err: any) {
            setError(err.response?.data?.message || 'Ошибка отправки OTP')
        } finally {
            setLoading(false)
        }
    }

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await api.post('/auth/otp/verify', { token: otpToken, code: otpCode } as OtpVerifyRequest)
            setStep('details')
        } catch (err: any) {
            setError(err.response?.data?.message || 'Неверный код')
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            // Register and get tokens
            const { data: authData } = await api.post<LoginResponse>('/auth/register', formData)

            // Build user object from form data (avoid problematic /auth/me call)
            const userData: User = {
                id: 0,
                phone: formData.phone,
                firstName: formData.firstName,
                lastName: formData.lastName,
                middleName: formData.middleName || '',
                email: formData.email || ''
            }

            login(authData.token, userData)
            navigate('/marketplace')
        } catch (err: any) {
            setError(err.response?.data?.message || 'Ошибка регистрации')
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
                        <h2 className="text-3xl font-bold text-gray-900">Регистрация</h2>
                        <p className="mt-2 text-gray-600">
                            Создайте аккаунт для покупки квартиры
                        </p>
                    </div>

                    {/* Progress */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center">
                            <div className={`flex-1 h-2 rounded ${step === 'phone' ? 'bg-primary-600' : 'bg-gray-200'}`} />
                            <div className={`flex-1 h-2 rounded mx-2 ${step === 'otp' || step === 'details' ? 'bg-primary-600' : 'bg-gray-200'}`} />
                            <div className={`flex-1 h-2 rounded ${step === 'details' ? 'bg-primary-600' : 'bg-gray-200'}`} />
                        </div>
                        <div className="flex justify-between text-xs text-gray-600 mt-2">
                            <span>Телефон</span>
                            <span>OTP</span>
                            <span>Данные</span>
                        </div>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Step 1: Phone */}
                    {step === 'phone' && (
                        <form onSubmit={handleSendOtp} className="space-y-6">
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                                    Номер телефона
                                </label>
                                <input
                                    id="phone"
                                    type="tel"
                                    required
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    placeholder="+996 XXX XXX XXX"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50"
                            >
                                {loading ? 'Отправка...' : 'Получить код'}
                            </button>
                        </form>
                    )}

                    {/* Step 2: OTP */}
                    {step === 'otp' && (
                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                            <div>
                                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                                    Код из SMS
                                </label>
                                <input
                                    id="otp"
                                    type="text"
                                    required
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-center text-2xl tracking-widest"
                                    placeholder="XXXX"
                                    maxLength={6}
                                />
                                <p className="mt-2 text-sm text-gray-600">
                                    Код отправлен на номер {phone}
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50"
                            >
                                {loading ? 'Проверка...' : 'Подтвердить'}
                            </button>
                        </form>
                    )}

                    {/* Step 3: Details */}
                    {step === 'details' && (
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                                    Фамилия *
                                </label>
                                <input
                                    id="lastName"
                                    type="text"
                                    required
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                                    Имя *
                                </label>
                                <input
                                    id="firstName"
                                    type="text"
                                    required
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label htmlFor="middleName" className="block text-sm font-medium text-gray-700 mb-2">
                                    Отчество
                                </label>
                                <input
                                    id="middleName"
                                    type="text"
                                    value={formData.middleName}
                                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                    Пароль *
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    minLength={6}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    placeholder="Минимум 6 символов"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50"
                            >
                                {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                            </button>
                        </form>
                    )}

                    {/* Footer */}
                    <div className="mt-6 text-center text-sm">
                        <span className="text-gray-600">Уже есть аккаунт?</span>{' '}
                        <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                            Войти
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
