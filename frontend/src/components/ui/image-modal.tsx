'use client'

import { X, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from './button'

interface ImageModalProps {
    src: string
    alt: string
    isOpen: boolean
    onClose: () => void
}

export function ImageModal({ src, alt, isOpen, onClose }: ImageModalProps) {
    const [zoom, setZoom] = useState(1)

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'auto'
        }
        return () => {
            document.body.style.overflow = 'auto'
        }
    }, [isOpen])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown)
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            {/* Modal Content */}
            <div
                className="relative max-w-4xl max-h-[90vh] w-full mx-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="absolute -top-10 right-0 text-white hover:bg-white/10"
                >
                    <X className="w-6 h-6" />
                </Button>

                {/* Image Container */}
                <div className="flex items-center justify-center overflow-auto rounded-lg">
                    <img
                        src={src}
                        alt={alt}
                        style={{ transform: `scale(${zoom})` }}
                        className="object-contain transition-transform duration-200 cursor-zoom-in"
                    />
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4 mt-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setZoom(Math.max(1, zoom - 0.2))}
                        disabled={zoom <= 1}
                        className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
                    >
                        <ZoomOut className="w-4 h-4" />
                    </Button>

                    <span className="text-white text-sm min-w-[60px] text-center">
                        {Math.round(zoom * 100)}%
                    </span>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setZoom(Math.min(3, zoom + 0.2))}
                        disabled={zoom >= 3}
                        className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
                    >
                        <ZoomIn className="w-4 h-4" />
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => setZoom(1)}
                        className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
                    >
                        Reset
                    </Button>
                </div>
            </div>
        </div>
    )
}
