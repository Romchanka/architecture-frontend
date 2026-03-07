import { useRef, useState, useEffect, useCallback } from 'react'
import Modal from './Modal'

interface SignaturePadModalProps {
    isOpen: boolean
    onClose: () => void
    onSign: (signatureBlob: Blob) => void
    title?: string
    signerLabel?: string
}

export default function SignaturePadModal({
    isOpen,
    onClose,
    onSign,
    title = 'Подпись договора',
    signerLabel = 'Подпись представителя компании',
}: SignaturePadModalProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [hasSignature, setHasSignature] = useState(false)

    const getCtx = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return null
        return canvas.getContext('2d')
    }, [])

    // Init canvas
    useEffect(() => {
        if (!isOpen) return
        const timer = setTimeout(() => {
            const canvas = canvasRef.current
            if (!canvas) return
            const rect = canvas.parentElement?.getBoundingClientRect()
            if (rect) {
                canvas.width = rect.width - 2
                canvas.height = 200
            }
            const ctx = canvas.getContext('2d')
            if (ctx) {
                ctx.fillStyle = '#1a1a2e'
                ctx.fillRect(0, 0, canvas.width, canvas.height)
                ctx.strokeStyle = '#e2e8f0'
                ctx.lineWidth = 2.5
                ctx.lineCap = 'round'
                ctx.lineJoin = 'round'
            }
        }, 100)
        return () => clearTimeout(timer)
    }, [isOpen])

    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0 }
        const rect = canvas.getBoundingClientRect()
        if ('touches' in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            }
        }
        return {
            x: (e as React.MouseEvent).clientX - rect.left,
            y: (e as React.MouseEvent).clientY - rect.top,
        }
    }

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault()
        const ctx = getCtx()
        if (!ctx) return
        setIsDrawing(true)
        setHasSignature(true)
        const { x, y } = getPos(e)
        ctx.beginPath()
        ctx.moveTo(x, y)
    }

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault()
        if (!isDrawing) return
        const ctx = getCtx()
        if (!ctx) return
        const { x, y } = getPos(e)
        ctx.lineTo(x, y)
        ctx.stroke()
    }

    const stopDrawing = () => {
        setIsDrawing(false)
    }

    const clearCanvas = () => {
        const canvas = canvasRef.current
        const ctx = getCtx()
        if (!canvas || !ctx) return
        ctx.fillStyle = '#1a1a2e'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        setHasSignature(false)
    }

    const handleSign = () => {
        const canvas = canvasRef.current
        if (!canvas || !hasSignature) return
        canvas.toBlob((blob) => {
            if (blob) {
                onSign(blob)
                onClose()
            }
        }, 'image/png')
    }

    return (
        <Modal open={isOpen} onClose={onClose} title={title} width="max-w-lg">
            <div className="space-y-4">
                <p className="text-sm text-slate-400">{signerLabel}</p>

                <div className="rounded-lg border border-slate-600 overflow-hidden">
                    <canvas
                        ref={canvasRef}
                        className="cursor-crosshair w-full touch-none"
                        style={{ height: 200 }}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                    />
                </div>

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={clearCanvas}
                        className="px-4 py-2 text-sm rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                    >
                        🗑️ Очистить
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleSign}
                        disabled={!hasSignature}
                        className={`px-6 py-2 text-sm rounded-lg font-medium transition-colors ${hasSignature
                            ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            }`}
                    >
                        ✍️ Подписать
                    </button>
                </div>
            </div>
        </Modal>
    )
}
