import { create } from 'zustand'
import { User } from '@/types'
import api from '../lib/api'

interface AuthState {
    user: User | null
    token: string | null
    isAuthenticated: boolean
    login: (token: string, user: User) => void
    logout: () => Promise<void>
    updateUser: (user: User) => void
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: null,
    isAuthenticated: false,

    login: (token, user) => {
        set({ token, user, isAuthenticated: true })
    },

    logout: async () => {
        try {
            await api.post('/auth/logout')
        } catch (err) {
            console.error('Logout error:', err)
        }
        localStorage.removeItem('token')
        set({ token: null, user: null, isAuthenticated: false })
    },

    updateUser: (user) => {
        set({ user })
    },
}))
