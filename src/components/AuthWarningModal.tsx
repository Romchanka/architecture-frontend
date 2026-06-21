import { useNavigate } from 'react-router-dom'

interface AuthWarningModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function AuthWarningModal({ isOpen, onClose }: AuthWarningModalProps) {
    const navigate = useNavigate()

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

            {/* Content */}
            <div 
                className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 animate-fade-in overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>🔐</span> Требуется авторизация
                    </h3>
                    <button 
                        onClick={onClose}
                        className="text-slate-400 hover:text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-800 transition-colors"
                    >
                        ✕
                    </button>
                </div>
                
                <div className="space-y-4">
                    <p className="text-slate-300 text-sm leading-relaxed">
                        Чтобы забронировать квартиру или парковочное место, пожалуйста, зарегистрируйтесь или войдите в свой аккаунт.
                    </p>
                    
                    <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 text-xs text-slate-400 flex items-start gap-2">
                        <span>💡</span>
                        <span>В личном кабинете вы сможете отслеживать статус бронирования, просматривать ваши документы и договоры.</span>
                    </div>
                </div>

                <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:gap-3">
                    <button
                        onClick={() => {
                            onClose()
                            navigate('/register', { state: { from: window.location.pathname } })
                        }}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all duration-200 text-center text-sm"
                    >
                        Регистрация
                    </button>
                    <button
                        onClick={() => {
                            onClose()
                            navigate('/login', { state: { from: window.location.pathname } })
                        }}
                        className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600 font-semibold rounded-xl transition-all duration-200 text-center text-sm"
                    >
                        Войти
                    </button>
                </div>
            </div>
        </div>
    )
}
