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
            console.log("[Mesh] Requesting user media...");
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: { ideal: 720 }, height: { ideal: 480 } }, 
                audio: true 
            });
            console.log("[Mesh] Got local stream with tracks:", stream.getTracks().map(t => t.kind));
            setLocalStream(stream);

            if (socket?.readyState === WebSocket.OPEN) {
                // Announce join
                console.log("[Mesh] Announcing voice_join");
                socket.send(JSON.stringify({ type: 'voice_join' }));
            } else {
                console.error("[Mesh] Socket not open when trying to join");
            }
        } catch (err) {
            console.error("[Mesh] Error joining voice:", err);
            alert("Could not access camera/mic. Make sure you're on HTTPS or localhost, and have allowed permissions.");
        }
    };

    const leaveVoice = () => {
        if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'voice_leave' }));
        }
        cleanup();
    };

    const createPeer = useCallback((targetUserId: string, targetUsername: string, initiator: boolean) => {
        if (peerConnections.current.has(targetUserId)) {
            console.warn(`[Mesh] Already have peer for ${targetUserId}`);
            return peerConnections.current.get(targetUserId)!;
        }

        console.log(`[Mesh] Creating peer for ${targetUserId} (Initiator: ${initiator})`);
        const pc = new RTCPeerConnection(iceServers);

        // Add local tracks
        if (localStream) {
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
            console.log(`[Mesh] Added ${localStream.getTracks().length} local tracks to peer`);
        } else {
            console.warn("[Mesh] No local stream when creating peer!");
        }

        pc.onicecandidate = (event) => {
            if (event.candidate && socket?.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'ice_candidate',
                    payload: event.candidate,
                    target_user_id: targetUserId
                }));
            }
        };

        pc.ontrack = (event) => {
            console.log(`[Mesh] Received track from ${targetUsername} (userId: ${targetUserId}), streams: ${event.streams.length}`);
            if (event.streams.length === 0) {
                console.warn(`[Mesh] No streams in ontrack event from ${targetUsername}`);
                return;
            }
            
            const stream = event.streams[0];
            console.log(`[Mesh] Stream has ${stream.getTracks().length} tracks`);
            
            setPeers(prev => {
                const newMap = new Map(prev);
                newMap.set(targetUserId, {
                    pc,
                    stream: stream,
                    userId: targetUserId,
                    userName: targetUsername
                });
                console.log(`[Mesh] Updated peers map with stream, total peers: ${newMap.size}`);
                return newMap;
            });
            setForceUpdate(n => n + 1);
        };

        // Handle track removal (using property setter instead of onremovetrack)
        pc.addEventListener('removetrack', (event) => {
            console.log(`[Mesh] Track removed from ${targetUsername}`);
        });

        pc.onconnectionstatechange = () => {
            console.log(`[Mesh] Connection state change for ${targetUsername}: ${pc.connectionState}`);
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                console.warn(`[Mesh] Connection ${pc.connectionState} for ${targetUsername}`);
            }
        };

        pc.onicegatheringstatechange = () => {
            console.log(`[Mesh] ICE gathering state for ${targetUsername}: ${pc.iceGatheringState}`);
        };

        peerConnections.current.set(targetUserId, pc);
        return pc;
    }, [localStream, socket, iceServers]);

    const handleSignal = useCallback(async (message: any) => {
        if (!user || message.sender_id === user.id) return;

        try {
            const senderId = message.sender_id;
            const senderName = message.sender_username;

            console.log(`[Mesh] Handling signal type: ${message.type} from ${senderName}`);

            switch (message.type) {
                case 'voice_join':
                    console.log(`[Mesh] ${senderName} joined the voice channel`);
                    // Someone joined. Clear any STALE connection we might have for them (from a previous session).
                    // But only if we have an OLD connection - a fresh join shouldn't remove anything.
                    if (peerConnections.current.has(senderId)) {
                        const existingPc = peerConnections.current.get(senderId);
                        if (existingPc?.connectionState === 'failed' || existingPc?.connectionState === 'closed') {
                            console.log(`[Mesh] Cleaning up failed peer for ${senderId} on join`);
                            existingPc?.close();
                            peerConnections.current.delete(senderId);
                            setPeers(prev => {
                                const newMap = new Map(prev);
                                newMap.delete(senderId);
                                return newMap;
                            });
                        }
                    }

                    // Someone joined. We should say hello ('voice_presence').
                    if (socket?.readyState === WebSocket.OPEN) {
                        console.log(`[Mesh] Sending voice_presence response to ${senderName}`);
                        socket.send(JSON.stringify({ type: 'voice_presence' }));
                    }
                    break;

                case 'voice_presence':
                    console.log(`[Mesh] ${senderName} acknowledged our join, initiating connection`);
                    // We joined, and someone (Existing) said they are here.
                    // We (New User) should initiate connection to them.
                    if (!peerConnections.current.has(senderId)) {
                        console.log(`[Mesh] Creating peer connection for ${senderName} (initiator mode)`);
                        const pc = createPeer(senderId, senderName, true);
                        
                        // Pre-add peer to state with null stream initially
                        setPeers(prev => {
                            const newMap = new Map(prev);
                            if (!newMap.has(senderId)) {
                                newMap.set(senderId, {
                                    pc,
                                    stream: null,
                                    userId: senderId,
                                    userName: senderName
                                });
                                console.log(`[Mesh] Pre-added peer ${senderName} to state (awaiting stream)`);
                            }
                            return newMap;
                        });
                        
                        const offer = await pc.createOffer();
                        await pc.setLocalDescription(offer);
                        if (socket?.readyState === WebSocket.OPEN) {
                            console.log(`[Mesh] Sending call_offer to ${senderName}`);
                            socket.send(JSON.stringify({
                                type: 'call_offer',
                                payload: offer,
                                target_user_id: senderId
                            }));
                        }
                    }
                    break;

                case 'voice_leave':
                    console.log(`[Mesh] ${senderName} left the voice channel`);
                    if (peerConnections.current.has(senderId)) {
                        peerConnections.current.get(senderId)?.close();
                        peerConnections.current.delete(senderId);
                        setPeers(prev => {
                            const newMap = new Map(prev);
                            newMap.delete(senderId);
                            console.log(`[Mesh] Removed peer ${senderName}, remaining peers: ${newMap.size}`);
                            return newMap;
                        });
                        setForceUpdate(n => n + 1);
                    }
                    break;

                case 'call_offer':
                    console.log(`[Mesh] Received call_offer from ${senderName}`);
                    if (message.target_user_id && message.target_user_id !== user.id) {
                        console.log(`[Mesh] Offer not for us, ignoring`);
                        return;
                    }

                    if (peerConnections.current.has(senderId)) {
                        console.warn(`[Mesh] Received OFFER from existing peer ${senderId}. Assuming restart. Recreating PC.`);
                        const oldPc = peerConnections.current.get(senderId);
                        oldPc?.close();
                        peerConnections.current.delete(senderId);
                    }

                    const pc = createPeer(senderId, senderName, false);
                    
                    // Pre-add peer to state
                    setPeers(prev => {
                        const newMap = new Map(prev);
                        if (!newMap.has(senderId)) {
                            newMap.set(senderId, {
                                pc,
                                stream: null,
                                userId: senderId,
                                userName: senderName
                            });
                            console.log(`[Mesh] Pre-added peer ${senderName} from offer`);
                        }
                        return newMap;
                    });
                    
                    try {
                        await pc.setRemoteDescription(new RTCSessionDescription(message.payload));
                        console.log(`[Mesh] Remote description set for ${senderName}`);
                        
                        // Process any queued ICE candidates now that remote description is set
                        if (iceCandidateQueue.current.has(senderId)) {
                            const candidates = iceCandidateQueue.current.get(senderId) || [];
                            console.log(`[Mesh] Processing ${candidates.length} queued ICE candidates for ${senderName}`);
                            for (const candidate of candidates) {
                                try {
                                    await pc.addIceCandidate(candidate);
                                } catch (e) {
                                    console.error(`[Mesh] Error adding queued ICE candidate for ${senderName}:`, e);
                                }
                            }
                            iceCandidateQueue.current.delete(senderId);
                        }
                        
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);

                        if (socket?.readyState === WebSocket.OPEN) {
                            console.log(`[Mesh] Sending call_answer to ${senderName}`);
                            socket.send(JSON.stringify({
                                type: 'call_answer',
                                payload: answer,
                                target_user_id: senderId
                            }));
                        }
                    } catch (err) {
                        console.error(`[Mesh] Error handling call_offer from ${senderName}:`, err);
                    }
                    break;

                case 'call_answer':
                    console.log(`[Mesh] Received call_answer from ${senderName}`);
                    const pc2 = peerConnections.current.get(senderId);
                    if (pc2) {
                        try {
                            console.log(`[Mesh] Setting remote description for ${senderName}`);
                            await pc2.setRemoteDescription(new RTCSessionDescription(message.payload));
                            
                            // Process any queued ICE candidates now that remote description is set
                            if (iceCandidateQueue.current.has(senderId)) {
                                const candidates = iceCandidateQueue.current.get(senderId) || [];
                                console.log(`[Mesh] Processing ${candidates.length} queued ICE candidates for ${senderName}`);
                                for (const candidate of candidates) {
                                    try {
                                        await pc2.addIceCandidate(candidate);
                                    } catch (e) {
                                        console.error(`[Mesh] Error adding queued ICE candidate for ${senderName}:`, e);
                                    }
                                }
                                iceCandidateQueue.current.delete(senderId);
                            }
                        } catch (err) {
                            console.error(`[Mesh] Error handling call_answer from ${senderName}:`, err);
                        }
                    } else {
                        console.warn(`[Mesh] Received answer but no peer connection for ${senderName}`);
                    }
                    break;

                case 'ice_candidate':
                    // Don't filter by target_user_id - candidates might be meant for us
                    // The backend broadcasts to the channel, so check if this is for our peer
                    const pc3 = peerConnections.current.get(senderId);
                    if (pc3) {
                        const candidate = new RTCIceCandidate(message.payload);
                        try {
                            // Only add if remote description is set
                            if (pc3.remoteDescription) {
                                console.log(`[Mesh] Adding ICE candidate from ${senderName}`);
                                await pc3.addIceCandidate(candidate);
                            } else {
                                // Queue the candidate for later
                                if (!iceCandidateQueue.current.has(senderId)) {
                                    iceCandidateQueue.current.set(senderId, []);
                                }
                                iceCandidateQueue.current.get(senderId)?.push(candidate);
                                console.log(`[Mesh] Queued ICE candidate from ${senderName} (no remote description yet)`);
                            }
                        } catch (e) {
                            console.error(`[Mesh] Error adding ice candidate from ${senderName}:`, e);
                        }
                    } else {
                        console.warn(`[Mesh] Received ICE candidate from ${senderName} but no peer connection exists`);
                    }
                    break;
            }
        } catch (err) {
            console.error("[Mesh] Signal error:", err);
        }
    }, [socket, user, createPeer]);

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

