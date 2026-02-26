import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

// PWA Service Worker — auto-update
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const { registerSW } = await import('virtual:pwa-register')
            registerSW({ immediate: true })
        } catch {
            // SW registration not available in dev mode — ignore
        }
    })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>,
)
