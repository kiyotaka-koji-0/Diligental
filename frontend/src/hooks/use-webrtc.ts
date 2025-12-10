"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { User } from '@/lib/api';

interface WebRTCConfig {
    user: User | null;
    channelId: string;
    socket: WebSocket | null;
    onIncomingCall?: (senderId: string, senderName: string) => void;
}

export const useWebRTC = ({ user, channelId, socket, onIncomingCall }: WebRTCConfig) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isCallActive, setIsCallActive] = useState(false);
    const [incomingCall, setIncomingCall] = useState<{ senderId: string; senderName: string } | null>(null);

    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const iceCandidateQueue = useRef<RTCIceCandidate[]>([]);

    // ICE Servers (Google STUN is free and reliable)
    const iceServers = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
        ],
    };

    const cleanup = useCallback(() => {
        if (localStream) {
            localStream.getTracks().forEach(track => {
                track.stop();
            });
            setLocalStream(null);
        }
        if (remoteStream) {
            remoteStream.getTracks().forEach(track => track.stop());
            setRemoteStream(null);
        }
        if (peerConnection.current) {
            // Remove event listeners to prevent memory leaks or side effects
            peerConnection.current.onicecandidate = null;
            peerConnection.current.ontrack = null;
            peerConnection.current.close();
            peerConnection.current = null;
        }
        setIsCallActive(false);
        setIncomingCall(null);
        iceCandidateQueue.current = [];
        setIsAudioEnabled(true);
        setIsVideoEnabled(true);
    }, [localStream, remoteStream]);

    // Ensure cleanup on unmount
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, []);

    const createPeerConnection = useCallback(() => {
        if (peerConnection.current) return peerConnection.current;

        console.log("Creating new RTCPeerConnection");
        const pc = new RTCPeerConnection(iceServers);

        pc.onicecandidate = (event) => {
            if (event.candidate && socket?.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'ice_candidate',
                    payload: event.candidate
                }));
            }
        };

        pc.ontrack = (event) => {
            console.log("Received remote track:", event.streams[0]);
            setRemoteStream(event.streams[0]);
        };

        pc.onconnectionstatechange = () => {
            console.log("Connection state:", pc.connectionState);
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                // Optionally auto-end call here, but let's wait for explicit end for now
                // or just handle cleanup if it's strictly failed
            }
        };

        peerConnection.current = pc;
        return pc;
    }, [socket, iceServers]);

    const processIceQueue = async () => {
        if (!peerConnection.current) return;
        while (iceCandidateQueue.current.length > 0) {
            const candidate = iceCandidateQueue.current.shift();
            if (candidate) {
                try {
                    await peerConnection.current.addIceCandidate(candidate);
                    console.log("Processed queued ICE candidate");
                } catch (e) {
                    console.error("Error adding queued ice candidate", e);
                }
            }
        }
    };

    const startCall = async () => {
        cleanup(); // Ensure fresh state
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert("WebRTC Not Supported! You must be on localhost or HTTPS to use this feature.");
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream); // Set state immediately for UI

            const pc = createPeerConnection();

            // Add local tracks to PC
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            setIsCallActive(true);

            if (socket?.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'call_offer',
                    payload: offer
                }));
            }
        } catch (err) {
            console.error("Error starting call:", err);
            alert("Could not start call: " + err);
            cleanup();
        }
    };

    const answerCall = async () => {
        try {
            if (!incomingCall) return;

            // Don't full cleanup here as we might have received ICE candidates already?
            // Actually, we usually want a fresh PC for a new answer.
            // BUT, if we have queued candidates, we need them. 
            // The `incomingCall` state implies we are in the 'ringing' phase.

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert("WebRTC Not Supported! Use localhost or HTTPS.");
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);

            // Ensure PC exists (it might have been created when offer received, or not)
            const pc = createPeerConnection(); // Returns existing or new

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            setIsCallActive(true);
            setIncomingCall(null);

            // Now that we have local description set (and remote must have been set on offer receive), 
            // we can process queue if any, though usually queue is for remote candidates.
            await processIceQueue();

            if (socket?.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'call_answer',
                    payload: answer
                }));
            }

        } catch (err) {
            console.error("Error answering call:", err);
            alert("Could not answer call: " + err);
            cleanup();
        }
    };

    const endCall = () => {
        if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'call_end' }));
        }
        cleanup();
    };

    // Handle Signaling Messages
    const handleSignal = useCallback(async (message: any) => {
        if (!user) return;
        if (message.sender_id === user.id) return;

        try {
            const pc = createPeerConnection();

            switch (message.type) {
                case 'call_offer':
                    console.log("Received call offer");
                    // We received an offer. We should NOT reset the PC if we already have one (from previous failed attempts?) 
                    // But usually, an offer starts a new session.

                    // If we are already in a call, maybe reject? For now, we assume implicit override.

                    await pc.setRemoteDescription(new RTCSessionDescription(message.payload));
                    await processIceQueue(); // If any candidates arrived before offer (unlikely but possible)

                    setIncomingCall({ senderId: message.sender_id, senderName: message.sender_username });
                    if (onIncomingCall) onIncomingCall(message.sender_id, message.sender_username);
                    break;

                case 'call_answer':
                    console.log("Received call answer");
                    await pc.setRemoteDescription(new RTCSessionDescription(message.payload));
                    await processIceQueue();
                    break;

                case 'ice_candidate':
                    // console.log("Received ICE candidate");
                    if (pc.remoteDescription) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(message.payload));
                        } catch (e) {
                            console.error("Error adding ice candidate", e);
                        }
                    } else {
                        console.log("Queuing ICE candidate (remote desc not set)");
                        iceCandidateQueue.current.push(new RTCIceCandidate(message.payload));
                    }
                    break;

                case 'call_end':
                    console.log("Received call end signal");
                    cleanup();
                    break;
            }
        } catch (err) {
            console.error("Signaling error:", err);
        }
    }, [socket, user, onIncomingCall, iceServers, createPeerConnection, cleanup]);

    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);

    const toggleAudio = useCallback(() => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsAudioEnabled(prev => !prev);
        }
    }, [localStream]);

    const toggleVideo = useCallback(() => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsVideoEnabled(prev => !prev);
        }
    }, [localStream]);

    return {
        startCall,
        answerCall,
        endCall,
        handleSignal,
        localStream,
        remoteStream,
        isCallActive,
        incomingCall,
        toggleAudio,
        toggleVideo,
        isAudioEnabled,
        isVideoEnabled
    };
};
