"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff, LogIn } from "lucide-react";
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
        peers
    } = useMeshWebRTC({ user, channelId, socket });

    const localVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

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
    const peerList = useMemo(() => Array.from(peers.values()), [peers]);

    if (!localStream) {
        return (
            <div className="flex flex-col h-full w-full bg-zinc-950 text-white relative">
                <div className="absolute top-4 left-4 md:hidden">
                    <MobileSidebar currentWorkspaceId={workspaceId} />
                </div>

                <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold">Voice Channel</h2>
                        <p className="text-zinc-400">Join the conversation to talk with your team.</p>
                    </div>
                    <Button
                        onClick={joinVoice}
                        className="bg-green-600 hover:bg-green-500 text-white px-8 py-6 rounded-full text-lg shadow-[0_0_30px_rgba(22,163,74,0.3)] transition-all hover:scale-105"
                    >
                        <LogIn className="w-6 h-6 mr-3" />
                        Join Voice
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-zinc-950 p-4 flex flex-col relative">
            <div className="md:hidden absolute top-4 left-4 z-50">
                <MobileSidebar currentWorkspaceId={workspaceId} />
            </div>

            {/* Grid of Videos */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr mt-8 md:mt-0">

                {/* Local User */}
                <div className="relative bg-zinc-900 rounded-xl overflow-hidden border border-white/10 shadow-lg group">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover mirror"
                    />
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
            <div className="h-24 flex items-center justify-center gap-6">
                <Button
                    onClick={leaveVoice}
                    variant="destructive"
                    size="icon"
                    className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                >
                    <PhoneOff className="h-6 w-6" />
                </Button>
            </div>
        </div>
    );
}

function PeerVideo({ peer }: { peer: any }) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && peer.stream) {
            videoRef.current.srcObject = peer.stream;
        }
    }, [peer.stream]);

    return (
        <div className="relative bg-zinc-900 rounded-xl overflow-hidden border border-white/10 shadow-lg">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur px-3 py-1 rounded-full text-sm font-medium">
                {peer.userName}
            </div>
        </div>
    )
}
