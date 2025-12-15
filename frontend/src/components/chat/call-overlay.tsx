
"use client";

import React, { useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, Minimize2, MonitorUp, CircleDot } from "lucide-react";

interface CallOverlayProps {
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    onEndCall: () => void;
    isActive: boolean;
    isIncoming?: boolean;
    onAnswer?: () => void;
    callerName?: string;
    toggleAudio?: () => void;
    toggleVideo?: () => void;
    isAudioEnabled?: boolean;
    isVideoEnabled?: boolean;
    startScreenShare?: () => void;
    stopScreenShare?: () => void;
    isScreenSharing?: boolean;
    startRecording?: () => void;
    stopRecording?: () => void;
    isRecording?: boolean;
}

export function CallOverlay({
    localStream,
    remoteStream,
    onEndCall,
    isActive,
    isIncoming,
    onAnswer,
    callerName,
    toggleAudio,
    toggleVideo,
    isAudioEnabled = true,
    isVideoEnabled = true,
    startScreenShare,
    stopScreenShare,
    isScreenSharing = false,
    startRecording,
    stopRecording,
    isRecording = false,
}: CallOverlayProps) {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const [isFullScreen, setIsFullScreen] = React.useState(false);
    const [zoomScale, setZoomScale] = React.useState(1);
    const pinchStartDistanceRef = useRef<number | null>(null);
    const baseScaleRef = useRef(1);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream, isActive, isFullScreen]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream, isActive, isFullScreen]);

    const getDistance = (touches: React.TouchList) => {
        if (touches.length < 2) return 0;
        const [t1, t2] = [touches[0], touches[1]];
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        return Math.hypot(dx, dy);
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        if (e.touches.length === 2) {
            pinchStartDistanceRef.current = getDistance(e.touches);
            baseScaleRef.current = zoomScale;
        }
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (e.touches.length === 2 && pinchStartDistanceRef.current) {
            e.preventDefault();
            const currentDistance = getDistance(e.touches);
            if (currentDistance === 0) return;
            const rawScale = (baseScaleRef.current * currentDistance) / pinchStartDistanceRef.current;
            const clamped = Math.min(3, Math.max(0.5, rawScale));
            setZoomScale(clamped);
        }
    };

    const handleTouchEnd = () => {
        pinchStartDistanceRef.current = null;
        baseScaleRef.current = zoomScale;
        if (zoomScale < 0.5) setZoomScale(0.5);
    };

    if (!isActive && !isIncoming) return null;

    return (
        <div className={`transition-all duration-300 ease-in-out ${isFullScreen
            ? "fixed inset-0 z-50 bg-black"
            : "absolute top-4 right-4 w-80 glass-premium rounded-2xl glass-shadow-lg z-50 animate-in slide-in-from-right fade-in"
            } overflow-hidden`}>
            {/* Incoming Call View */}
            {isIncoming && !isActive && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 p-6">
                    <div className="h-16 w-16 rounded-full bg-red-600/20 border border-red-500/50 flex items-center justify-center animate-pulse">
                        <Video className="h-8 w-8 text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Incoming Call</h3>
                        <p className="text-sm text-gray-500 dark:text-zinc-400">from {callerName || "Unknown"}</p>
                    </div>
                    <div className="flex gap-4 w-full max-w-xs">
                        <Button
                            onClick={onEndCall}
                            variant="destructive"
                            className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-500 hover:text-red-400 border border-red-500/20"
                        >
                            Decline
                        </Button>
                        <Button
                            onClick={onAnswer}
                            className="flex-1 bg-green-600 hover:bg-green-500 text-white"
                        >
                            Answer
                        </Button>
                    </div>
                </div>
            )}

            {/* Active Call View */}
            {isActive && (
                <div
                    className="relative w-full h-full bg-zinc-900"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className="w-full h-full overflow-hidden">
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                            style={{ transform: `scale(${zoomScale})`, transformOrigin: "center center", touchAction: "none" }}
                        />
                    </div>

                    {/* Local Video (PiP) */}
                    <div className={`absolute transition-all duration-300 ${isFullScreen
                        ? "top-8 right-8 w-48 border-white/30"
                        : "top-4 right-4 w-24 border-white/20"
                        } aspect-video bg-black rounded-lg overflow-hidden border shadow-lg`}>
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`w-full h-full object-cover mirror ${!isVideoEnabled ? 'hidden' : ''}`}
                        />
                        {!isVideoEnabled && (
                            <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
                                <VideoOff className="h-4 w-4 text-zinc-500" />
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 p-3 rounded-full bg-black/60 backdrop-blur border border-white/10">
                        <Button
                            onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                            variant="ghost"
                            size="icon"
                            className={`h-12 w-12 rounded-full transition-colors ${isScreenSharing ? "bg-amber-500/30 text-amber-200 hover:bg-amber-500/40" : "text-white hover:bg-white/20"}`}
                        >
                            <MonitorUp className="h-5 w-5" />
                        </Button>
                        <Button
                            onClick={toggleAudio}
                            variant="ghost"
                            size="icon"
                            className={`h-12 w-12 rounded-full transition-colors ${isAudioEnabled
                                ? "text-white hover:bg-white/20"
                                : "bg-red-500/20 text-red-500 hover:bg-red-500/30 hover:text-red-400"}`}
                        >
                            {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                        </Button>
                        <Button
                            onClick={toggleVideo}
                            variant="ghost"
                            size="icon"
                            className={`h-12 w-12 rounded-full transition-colors ${isVideoEnabled
                                ? "text-white hover:bg-white/20"
                                : "bg-red-500/20 text-red-500 hover:bg-red-500/30 hover:text-red-400"}`}
                        >
                            {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                        </Button>
                        <Button
                            onClick={isRecording ? stopRecording : startRecording}
                            variant="ghost"
                            size="icon"
                            className={`h-12 w-12 rounded-full transition-colors ${isRecording ? "bg-red-500/30 text-red-100 hover:bg-red-500/40" : "text-white hover:bg-white/20"}`}
                        >
                            <CircleDot className="h-5 w-5" />
                        </Button>
                        <Button
                            onClick={onEndCall}
                            variant="destructive"
                            size="icon"
                            className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-500 text-white border-0"
                        >
                            <PhoneOff className="h-5 w-5" />
                        </Button>
                        <Button
                            onClick={() => setIsFullScreen(!isFullScreen)}
                            variant="ghost"
                            size="icon"
                            className="h-12 w-12 text-white hover:bg-white/20 rounded-full"
                        >
                            {isFullScreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
