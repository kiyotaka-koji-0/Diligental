"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff, LogIn, Maximize2, Minimize2, MonitorUp, CircleDot } from "lucide-react";
import { useMeshWebRTC } from '@/hooks/use-mesh-webrtc';
import { User } from '@/lib/api';

import { MobileSidebar } from "@/components/layout/sidebar";

interface VoiceChannelProps {
    channelId: string;
    workspaceId: string;
    user: User | null;
    socket: WebSocket | null;
}

export function VoiceChannel({ channelId, workspaceId, user, socket }: VoiceChannelProps) {
    const {
        joinVoice,
        leaveVoice,
        handleSignal,
        localStream,
        peers,
        toggleAudio,
        toggleVideo,
        isAudioEnabled,
        isVideoEnabled,
        startScreenShare,
        stopScreenShare,
        isScreenSharing,
        startRecording,
        stopRecording,
        isRecording
    } = useMeshWebRTC({ user, channelId, socket });

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const [isFullScreen, setIsFullScreen] = React.useState(false);
    const [zoomScale, setZoomScale] = React.useState(1);
    const pinchStartDistanceRef = useRef<number | null>(null);
    const baseScaleRef = useRef(1);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

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

    // ... (rest of useEffects)

    // Handle incoming signals from the parent socket connection
    useEffect(() => {
        if (!socket) return;

        const onMessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);

                // Filter signals that are relevant to Mesh WebRTC
                if (["voice_join", "voice_presence", "voice_leave", "call_offer", "call_answer", "ice_candidate"].includes(data.type)) {
                    handleSignal(data);
                }
            } catch (e) {
                // Ignore non-JSON
            }
        };

        socket.addEventListener('message', onMessage);
        return () => {
            socket.removeEventListener('message', onMessage);
        }
    }, [socket, handleSignal]);


    // Convert peers map to array for rendering
    const peerList = useMemo(() => {
        const list = Array.from(peers.values());
        console.log(`[VoiceChannel] Rendering ${list.length} peers`);
        return list;
    }, [peers]);

    if (!localStream) {
        return (
            <div className={`flex flex-col w-full glass-bg-3 text-white relative ${isFullScreen ? 'fixed inset-0 z-50 h-screen' : 'h-full'}`}>
                <div className="absolute top-4 left-4 md:hidden z-50">
                    <MobileSidebar currentWorkspaceId={workspaceId} />
                </div>

                <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold">Voice Channel</h2>
                        <p className="text-zinc-400">Join the conversation to talk with your team.</p>
                    </div>
                    <Button
                        onClick={joinVoice}
                        className="glass-medium bg-green-600/80 hover:bg-green-500/80 text-white px-8 py-6 rounded-full text-lg glass-shadow-lg transition-all hover:scale-105 disabled:opacity-50"
                        disabled={!socket || socket.readyState !== WebSocket.OPEN}
                    >
                        <LogIn className="w-6 h-6 mr-3" />
                        {socket?.readyState === WebSocket.OPEN ? "Join Voice" : "Connecting..."}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div 
            className={`glass-bg-3 p-4 flex flex-col relative ${isFullScreen ? 'fixed inset-0 z-50 bg-zinc-900' : 'h-full w-full'}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div className={`${isFullScreen ? '' : 'md:hidden'} absolute top-4 left-4 z-50`}>
                <MobileSidebar currentWorkspaceId={workspaceId} />
            </div>

            {/* Grid of Videos */}
            <div className={`flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr ${isFullScreen ? 'mt-0' : 'mt-8 md:mt-0'}`}
                style={{ transform: `scale(${zoomScale})`, transformOrigin: "center center", touchAction: "none" }}
            >

                {/* Local User */}
                <div className="relative bg-zinc-900 rounded-xl overflow-hidden border border-white/10 shadow-lg group">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover mirror ${!isVideoEnabled ? 'hidden' : ''}`}
                    />
                    {!isVideoEnabled && (
                        <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
                            <VideoOff className="h-8 w-8 text-zinc-500" />
                        </div>
                    )}
                    <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur px-3 py-1 rounded-full text-sm font-medium">
                        {user?.username || "You"} (Me)
                    </div>
                </div>

                {/* Remote Peers */}
                {peerList.map((peer) => (
                    <PeerVideo key={peer.userId} peer={peer} />
                ))}

            </div>

            {/* Controls Bar */}
            <div className="h-24 flex items-center justify-center gap-4">
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
                    onClick={leaveVoice}
                    variant="destructive"
                    size="icon"
                    className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                >
                    <PhoneOff className="h-6 w-6" />
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
    );
}

function PeerVideo({ peer }: { peer: any }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasStream, setHasStream] = React.useState(!!peer.stream);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (peer.stream) {
            console.log(`[PeerVideo] Setting srcObject for ${peer.userName}, tracks: ${peer.stream.getTracks().length}`);
            video.srcObject = peer.stream;
            setHasStream(true);
            
            // Ensure video is playing
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch(err => {
                    console.warn(`[PeerVideo] Video play failed for ${peer.userName}:`, err);
                });
            }
        } else {
            console.warn(`[PeerVideo] No stream available for ${peer.userName}`);
            video.srcObject = null;
            setHasStream(false);
        }

        return () => {
            // Don't clear srcObject on unmount as it may cause the stream to stop
        };
    }, [peer.stream, peer.userName]);

    return (
        <div className="relative bg-zinc-900 rounded-xl overflow-hidden border border-white/10 shadow-lg group">
            {!hasStream && (
                <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-zinc-800 to-zinc-900 z-10">
                    <div className="text-center space-y-2">
                        <div className="w-12 h-12 rounded-full bg-zinc-700 mx-auto flex items-center justify-center">
                            <div className="w-8 h-8 border-2 border-zinc-500 border-t-red-500 rounded-full animate-spin"></div>
                        </div>
                        <p className="text-xs text-zinc-400">Connecting...</p>
                    </div>
                </div>
            )}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={false}
                className={`w-full h-full object-cover ${!hasStream ? 'opacity-0' : 'opacity-100'}`}
            />
            <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur px-3 py-1 rounded-full text-sm font-medium">
                {peer.userName}
            </div>
        </div>
    )
}
