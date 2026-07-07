import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export default function CameraCapture({ open, onClose, onCapture }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [, setStream] = useState(null);
    const [error, setError] = useState(null);

    const startCamera = useCallback(async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Lỗi khi mở camera:", err);
            setError(err.message || "Không thể truy cập camera");
        }
    }, []);

    const stopCamera = useCallback(() => {
        setStream((currentStream) => {
            currentStream?.getTracks().forEach(track => track.stop());
            return null;
        });
    }, []);

    const handleFallbackUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const previewUrl = URL.createObjectURL(file);
            onCapture({ file, previewUrl });
            onClose();
        }
    };

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert to object URL for preview, or File for upload
            canvas.toBlob((blob) => {
                const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
                // We'll also return a preview URL
                const previewUrl = URL.createObjectURL(blob);
                onCapture({ file, previewUrl });
                onClose();
            }, 'image/jpeg', 0.8);
        }
    };

    useEffect(() => {
        if (open) {
            const timer = window.setTimeout(() => {
                setError(null);
                void startCamera();
            }, 0);
            return () => {
                window.clearTimeout(timer);
                stopCamera();
            };
        }
        return () => stopCamera();
    }, [open, startCamera, stopCamera]);

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black border-none [&>button]:hidden">
                <DialogTitle className="sr-only">Chụp ảnh minh chứng</DialogTitle>
                <div className="relative w-full h-[70vh] bg-black flex flex-col">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    
                    <div className="flex-1 flex items-center justify-center overflow-hidden">
                        {error ? (
                            <div className="text-white text-center p-6 flex flex-col items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 mb-2">
                                    <Camera className="w-8 h-8" />
                                </div>
                                <p className="text-sm text-gray-300 mb-2">Không thể mở camera ({error}).</p>
                                <label className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium cursor-pointer transition-colors">
                                    Tải ảnh lên hoặc Chụp bằng app mặc định
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        capture="environment" 
                                        className="hidden" 
                                        onChange={handleFallbackUpload} 
                                    />
                                </label>
                            </div>
                        ) : (
                            <>
                                <video 
                                    ref={videoRef} 
                                    autoPlay 
                                    playsInline 
                                    className="w-full h-full object-cover"
                                />
                                <canvas ref={canvasRef} className="hidden" />
                            </>
                        )}
                    </div>

                    {!error && (
                        <div className="p-6 bg-black flex justify-center items-center h-24 shrink-0">
                            <button 
                                onClick={handleCapture}
                                className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors focus:outline-none"
                            >
                            </button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
