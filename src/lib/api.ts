import axios from 'axios'

const api = axios.create({
    baseURL: '/api',
    withCredentials: true, // SECURITY: Send HttpOnly cookies automatically
    headers: {
        'Content-Type': 'application/json',
    },
})

// Request interceptor for adding auth token (fallback if cookies are not used)
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token')
        if (token && token !== 'undefined' && token !== 'null' && token.length > 10) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

// Response interceptor for handling errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token')
            // Prevent redirect loop on public paths
            const publicPaths = ['/login', '/register', '/', '/marketplace']
            const isPublicPath = publicPaths.some(path => window.location.pathname === path || window.location.pathname.startsWith('/marketplace'))
            if (!isPublicPath) {
                window.location.href = '/login'
            }
        }
        return Promise.reject(error)
    }
)

export default api
