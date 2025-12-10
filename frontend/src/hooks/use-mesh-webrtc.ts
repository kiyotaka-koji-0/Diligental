import { useEffect, useRef, useState, useCallback } from 'react';
import { User } from '@/lib/api';

interface MeshWebRTCConfig {
    user: User | null;
    channelId: string;
    socket: WebSocket | null;
}

interface PeerConnectionState {
    pc: RTCPeerConnection;
    stream: MediaStream | null;
    userId: string;
    userName: string;
}

export const useMeshWebRTC = ({ user, channelId, socket }: MeshWebRTCConfig) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [peers, setPeers] = useState<Map<string, PeerConnectionState>>(new Map());
    // Force update for Map state changes
    const [, setForceUpdate] = useState(0);

    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
    const iceCandidateQueue = useRef<Map<string, RTCIceCandidate[]>>(new Map());

    const iceServers = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
        ],
    };

    const cleanup = useCallback(() => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }

        peerConnections.current.forEach(pc => pc.close());
        peerConnections.current.clear();
        setPeers(new Map());
        iceCandidateQueue.current.clear();
    }, [localStream]);

    // Initialize Local Stream
    const joinVoice = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);

            if (socket?.readyState === WebSocket.OPEN) {
                // Announce join
                socket.send(JSON.stringify({ type: 'voice_join' }));
            }
        } catch (err) {
            console.error("Error joining voice:", err);
            alert("Could not access camera/mic.");
        }
    };

    const leaveVoice = () => {
        if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'voice_leave' }));
        }
        cleanup();
    };

    const createPeer = (targetUserId: string, targetUsername: string, initiator: boolean) => {
        if (peerConnections.current.has(targetUserId)) {
            console.warn(`Already have peer for ${targetUserId}`);
            return peerConnections.current.get(targetUserId)!;
        }

        console.log(`Creating peer for ${targetUserId} (Initiator: ${initiator})`);
        const pc = new RTCPeerConnection(iceServers);

        // Add local tracks
        if (localStream) {
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        } else {
            console.warn("No local stream when creating peer!");
        }

        pc.onicecandidate = (event) => {
            if (event.candidate && socket?.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'ice_candidate',
                    payload: event.candidate,
                    target_user_id: targetUserId // Note: Our backend currently broadcasts, but for mesh we need filtering or just broadcast and ignore self/others?
                    // The current backend BROADCASTS everything to the channel.
                    // So we must include target_user_id in payload so receivers know who it's for?
                    // Actually, standard signaling: 'ice_candidate' message usually implies:
                    // Sender: Me
                    // Target: Specific Peer
                    // But our backend is "dumb broadcast".
                    // So we need to wrap the payload:
                    // { type: 'ice_candidate', payload: { candidate: ... }, target: targetUserId }
                }));
            }
        };

        pc.ontrack = (event) => {
            console.log(`Received track from ${targetUsername}`);
            setPeers(prev => {
                const newMap = new Map(prev);
                newMap.set(targetUserId, {
                    pc,
                    stream: event.streams[0],
                    userId: targetUserId,
                    userName: targetUsername
                });
                return newMap;
            });
            setForceUpdate(n => n + 1);
        };

        peerConnections.current.set(targetUserId, pc);
        return pc;
    };

    const handleSignal = useCallback(async (message: any) => {
        if (!user || message.sender_id === user.id) return;

        // Specialized handling for dummy backend broadcast
        // We need to know if this message is meant for US.
        // If it's a broadcast like 'voice_join', it's for everyone.
        // If it's specific signaling (offer/answer/ice), it implies a pair.
        // Since we broadcast everything, we need to check if we are the intended target?
        // OR rely on sender_id.

        // MESH STRATEGY:
        // A calls B.
        // Offer from A -> B.
        // B answers A.

        try {
            const senderId = message.sender_id;
            const senderName = message.sender_username;

            switch (message.type) {
                case 'voice_join':
                    // Someone joined. Clear any stale connection we might have for them.
                    if (peerConnections.current.has(senderId)) {
                        console.log(`[Mesh] Cleaning up stale peer for ${senderId} on join`);
                        peerConnections.current.get(senderId)?.close();
                        peerConnections.current.delete(senderId);
                        setPeers(prev => {
                            const newMap = new Map(prev);
                            newMap.delete(senderId);
                            return newMap;
                        });
                    }

                    // Someone joined. We should say hello ('voice_presence').
                    if (socket?.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({ type: 'voice_presence' }));
                    }
                    break;

                case 'voice_presence':
                    // We joined, and someone (Existing) said they are here.
                    // We (New User) should initiate connection to them.
                    // If we ALREADY have them (unlikely if we just joined, but possible?), skip.
                    if (!peerConnections.current.has(senderId)) {
                        const pc = createPeer(senderId, senderName, true);
                        const offer = await pc.createOffer();
                        await pc.setLocalDescription(offer);
                        if (socket?.readyState === WebSocket.OPEN) {
                            socket.send(JSON.stringify({
                                type: 'call_offer',
                                payload: offer,
                                target_user_id: senderId
                            }));
                        }
                    }
                    break;

                case 'voice_leave':
                    if (peerConnections.current.has(senderId)) {
                        peerConnections.current.get(senderId)?.close();
                        peerConnections.current.delete(senderId);
                        setPeers(prev => {
                            const newMap = new Map(prev);
                            newMap.delete(senderId);
                            return newMap;
                        });
                        setForceUpdate(n => n + 1);
                    }
                    break;

                case 'call_offer':
                    // We received an offer.
                    if (message.target_user_id && message.target_user_id !== user.id) return;

                    // RECONNECTION FIX:
                    // If we already have a peer for this sender, it means they likely restarted/rejoined.
                    // Our current PC is stale. We MUST close it and accept the new offer with a FRESH PC.
                    if (peerConnections.current.has(senderId)) {
                        console.warn(`[Mesh] Received OFFER from existing peer ${senderId}. Assuming restart. Recreating PC.`);
                        const oldPc = peerConnections.current.get(senderId);
                        oldPc?.close();
                        peerConnections.current.delete(senderId);
                        // Also update state to remove old stream temporarily?
                        // setPeers... (optional, might cause flicker, but safer)
                    }

                    const pc = createPeer(senderId, senderName, false);
                    await pc.setRemoteDescription(new RTCSessionDescription(message.payload));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    if (socket?.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({
                            type: 'call_answer',
                            payload: answer,
                            target_user_id: senderId
                        }));
                    }
                    break;

                case 'call_answer':
                    if (message.target_user_id && message.target_user_id !== user.id) return;
                    const pc2 = peerConnections.current.get(senderId);
                    if (pc2) {
                        await pc2.setRemoteDescription(new RTCSessionDescription(message.payload));
                    }
                    break;

                case 'ice_candidate':
                    if (message.target_user_id && message.target_user_id !== user.id) return;
                    const pc3 = peerConnections.current.get(senderId);
                    if (pc3) {
                        try {
                            await pc3.addIceCandidate(new RTCIceCandidate(message.payload));
                        } catch (e) {
                            console.error("Error adding ice candidate", e);
                        }
                    } else {
                        // Queue?
                    }
                    break;
            }
        } catch (err) {
            console.error("Mesh Signal error:", err);
        }
    }, [socket, user, localStream]);

    // Automatic cleanup on unmount
    useEffect(() => {
        return () => {
            console.log("[Mesh] Unmounting hook, cleaning up...");
            // Optionally send voice_leave here if socket is open? 
            // Better to rely on manual leave for "polite" exit, but cleanup is mandatory.
            cleanup();
        };
    }, []); // Empty dependency array ensures this runs only on mount/unmount

    // We need to attach handleSignal to the socket listener in the parent component
    // OR expose it logic.

    return {
        joinVoice,
        leaveVoice,
        handleSignal,
        localStream,
        peers
    };
};

