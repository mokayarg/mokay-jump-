import { useCallback, useEffect, useRef, useState } from 'react';
import { AvatarConfig, PlayerLoadout, WardrobeSlot } from '../data/mokayaData';

export interface LeaderboardEntry {
  playerName: string;
  elo: number;
  wins: number;
  losses: number;
  stylePoints: number;
  styleRank: string;
  fighterId: string;
  petId: string;
  clanTag: string;
  updatedAt: number;
}

export interface ClanInfo {
  tag: string;
  name: string;
  district: string;
  motto: string;
  points: number;
  members: string[];
}

export interface TournamentMatch {
  id: string;
  round: 'Cuartos' | 'Semifinal' | 'Final';
  playerA: string;
  playerB: string;
  winner: string | null;
}

export interface TournamentInfo {
  id: string;
  title: string;
  district: string;
  rewardName: string;
  endsAt: number;
  participants: string[];
  matches: TournamentMatch[];
}

export interface ChatMessage {
  id: string;
  channel: string;
  sender: string;
  clanTag: string;
  text: string;
  timestamp: number;
}

export interface VoiceParticipant {
  id: string;
  playerName: string;
  clanTag: string;
  micActive: boolean;
}

export interface OpenRoomSummary {
  code: string;
  arenaId: string;
  hostName: string;
  hostPetId: string;
  hostAvatar: AvatarConfig | null;
  hostClothes: Record<WardrobeSlot, string> | null;
  hostClanTag: string;
  createdAt: number;
}

export interface RoomMatchInfo {
  code: string;
  role: 'host' | 'guest';
  arenaId: string;
  opponentId: string;
  opponentName: string;
  opponentLoadout: PlayerLoadout | null;
}

export interface OnlinePlayerSummary {
  id: string;
  playerName: string;
  clanTag: string;
  petId: string;
  roomCode: string | null;
  voiceChannel: string | null;
  micActive: boolean;
}

export interface FriendProfile {
  playerName: string;
  online: boolean;
  clientId: string | null;
  inRoom: boolean;
  clanTag: string;
  petId: string;
  elo: number;
  wins: number;
}

export interface DuelInvite {
  inviteId: string;
  fromClientId: string;
  fromName: string;
  fromClanTag: string;
  fromPetId: string;
  arenaId: string;
}

export function useMokayaRealtime(loadout: PlayerLoadout) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  const [connected, setConnected] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(1);
  const [pingMs, setPingMs] = useState<number | null>(null);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [clans, setClans] = useState<ClanInfo[]>([]);
  const [tournament, setTournament] = useState<TournamentInfo | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Room & Matchmaking state
  const [openRooms, setOpenRooms] = useState<OpenRoomSummary[]>([]);
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayerSummary[]>([]);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [incomingDuel, setIncomingDuel] = useState<DuelInvite | null>(null);
  const [duelStatusNotice, setDuelStatusNotice] = useState<string | null>(null);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [matchmakingWaiting, setMatchmakingWaiting] = useState(false);
  const [activeRoom, setActiveRoom] = useState<RoomMatchInfo | null>(null);

  // Combat sync listener callback
  const combatHandlerRef = useRef<((payload: any) => void) | null>(null);

  // Voice Chat (WebRTC + Web Audio Analyser)
  const [voiceChannel, setVoiceChannel] = useState<string | null>(null);
  const [voiceParticipants, setVoiceParticipants] = useState<VoiceParticipant[]>([]);
  const [micMuted, setMicMuted] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafLevelRef = useRef<number | null>(null);

  const loadoutRef = useRef(loadout);
  loadoutRef.current = loadout;

  const fetchFriends = useCallback(async () => {
    const name = loadoutRef.current.playerName;
    if (!name) return;
    try {
      const res = await fetch(`/api/friends/${encodeURIComponent(name)}`);
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends ?? []);
      }
    } catch {
      // Ignore transient network errors
    }
  }, []);

  const fetchServerState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) return;
      const data = await res.json();
      setLeaderboard(data.leaderboard ?? []);
      setClans(data.clans ?? []);
      setTournament(data.tournament ?? null);
      setChatMessages(data.chatMessages ?? []);
      if (typeof data.onlineCount === 'number') {
        setOnlineCount(Math.max(1, data.onlineCount));
      }
      fetchFriends();
    } catch {
      // Ignore transient network errors
    }
  }, [fetchFriends]);

  const sendWs = useCallback((payload: unknown) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }, []);

  const createPeerConnection = useCallback(
    (peerId: string, isInitiator: boolean) => {
      const existing = peersRef.current.get(peerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          sendWs({
            type: 'rtc:signal',
            targetId: peerId,
            signal: { candidate: e.candidate },
          });
        }
      };

      pc.ontrack = (e) => {
        let audio = audioElementsRef.current.get(peerId);
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          audioElementsRef.current.set(peerId, audio);
        }
        audio.srcObject = e.streams[0];
        audio.play().catch(() => {});
      };

      peersRef.current.set(peerId, pc);

      if (isInitiator) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            sendWs({
              type: 'rtc:signal',
              targetId: peerId,
              signal: { sdp: pc.localDescription },
            });
          })
          .catch(() => {});
      }

      return pc;
    },
    [sendWs]
  );

  const cleanupPeer = useCallback((peerId: string) => {
    const pc = peersRef.current.get(peerId);
    if (pc) {
      pc.close();
      peersRef.current.delete(peerId);
    }
    const audio = audioElementsRef.current.get(peerId);
    if (audio) {
      audio.srcObject = null;
      audioElementsRef.current.delete(peerId);
    }
  }, []);

  const leaveVoiceChannel = useCallback(() => {
    sendWs({ type: 'voice:leave' });
    setVoiceChannel(null);
    setVoiceParticipants([]);
    setMicLevel(0);

    if (rafLevelRef.current) {
      cancelAnimationFrame(rafLevelRef.current);
      rafLevelRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    for (const peerId of Array.from(peersRef.current.keys())) {
      cleanupPeer(peerId);
    }
  }, [cleanupPeer, sendWs]);

  const joinVoiceChannel = useCallback(
    async (channel: string) => {
      setVoiceError(null);
      try {
        if (!localStreamRef.current && navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStreamRef.current = stream;

          // Setup AudioContext analyser for real live mic meter
          const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const ctx = new AudioCtx();
          audioCtxRef.current = ctx;
          const src = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          src.connect(analyser);
          const buf = new Uint8Array(analyser.frequencyBinCount);

          const updateLevel = () => {
            if (!localStreamRef.current) return;
            analyser.getByteFrequencyData(buf);
            let sum = 0;
            for (let i = 0; i < buf.length; i++) sum += buf[i];
            const avg = sum / buf.length / 255;
            const tracksEnabled = localStreamRef.current.getAudioTracks().some((t) => t.enabled);
            setMicLevel(tracksEnabled ? Math.min(1, avg * 2.4) : 0);
            rafLevelRef.current = requestAnimationFrame(updateLevel);
          };
          updateLevel();
        }
        setVoiceChannel(channel);
        setMicMuted(false);
        sendWs({ type: 'voice:join', channel, micActive: true });
      } catch {
        setVoiceError('No se pudo activar el micrófono. Revisa los permisos del navegador.');
        // Still join voice channel in listen-only mode
        setVoiceChannel(channel);
        setMicMuted(true);
        sendWs({ type: 'voice:join', channel, micActive: false });
      }
    },
    [sendWs]
  );

  const toggleMicMute = useCallback(() => {
    setMicMuted((prev) => {
      const next = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => {
          t.enabled = !next;
        });
      }
      sendWs({ type: 'voice:state', micActive: !next });
      return next;
    });
  }, [sendWs]);

  // Connect WebSocket with auto-reconnect
  useEffect(() => {
    fetchServerState();

    let disposed = false;
    function connect() {
      if (disposed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        ws.send(
          JSON.stringify({
            type: 'auth:hello',
            playerName: loadoutRef.current.playerName,
            clanTag: loadoutRef.current.clanTag,
            loadout: loadoutRef.current,
          })
        );
        ws.send(JSON.stringify({ type: 'net:ping', ts: performance.now() }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'session:init':
              setClientId(msg.clientId);
              break;
            case 'net:pong':
              if (typeof msg.ts === 'number') {
                setPingMs(Math.max(1, Math.round(performance.now() - msg.ts)));
              }
              break;
            case 'rooms:list':
              setOpenRooms(msg.rooms ?? []);
              break;
            case 'presence:update':
              setOnlineCount(Math.max(1, msg.onlineCount ?? 1));
              setOnlinePlayers(msg.players ?? []);
              fetchFriends();
              break;
            case 'duel:incoming':
              setIncomingDuel({
                inviteId: msg.inviteId,
                fromClientId: msg.fromClientId,
                fromName: msg.fromName,
                fromClanTag: msg.fromClanTag,
                fromPetId: msg.fromPetId,
                arenaId: msg.arenaId || 'rhythm-hood',
              });
              break;
            case 'duel:invite-sent':
              setRoomError(null);
              setDuelStatusNotice(`Reto enviado a ${msg.targetName}. Esperando respuesta...`);
              break;
            case 'duel:declined':
              setDuelStatusNotice(`${msg.byName} rechazó el reto por ahora.`);
              break;
            case 'room:created':
              setRoomError(null);
              setCreatedRoomCode(msg.code);
              setMatchmakingWaiting(false);
              break;
            case 'room:error':
              setRoomError(msg.error);
              setMatchmakingWaiting(false);
              break;
            case 'matchmaking:waiting':
              setMatchmakingWaiting(true);
              setRoomError(null);
              break;
            case 'room:ready':
              setCreatedRoomCode(null);
              setMatchmakingWaiting(false);
              setRoomError(null);
              setIncomingDuel(null);
              setDuelStatusNotice(null);
              setActiveRoom({
                code: msg.code,
                role: msg.role,
                arenaId: msg.arenaId,
                opponentId: msg.opponentId,
                opponentName: msg.opponentName,
                opponentLoadout: msg.opponentLoadout ?? null,
              });
              break;
            case 'room:opponent-left':
              setActiveRoom(null);
              setRoomError('Tu rival salió de la sala.');
              break;
            case 'combat:sync':
              if (combatHandlerRef.current) {
                combatHandlerRef.current(msg.payload);
              }
              break;
            case 'chat:message':
              if (msg.message) {
                setChatMessages((prev) => {
                  if (prev.some((m) => m.id === msg.message.id)) return prev;
                  return [...prev.slice(-60), msg.message];
                });
              }
              break;
            case 'voice:participants':
              setVoiceParticipants(msg.participants ?? []);
              break;
            case 'rtc:peer-joined':
              createPeerConnection(msg.peerId, true);
              break;
            case 'rtc:peer-left':
              cleanupPeer(msg.peerId);
              break;
            case 'rtc:signal': {
              const pc = createPeerConnection(msg.fromId, false);
              if (msg.signal?.sdp) {
                pc.setRemoteDescription(new RTCSessionDescription(msg.signal.sdp))
                  .then(async () => {
                    if (msg.signal.sdp.type === 'offer') {
                      const ans = await pc.createAnswer();
                      await pc.setLocalDescription(ans);
                      sendWs({
                        type: 'rtc:signal',
                        targetId: msg.fromId,
                        signal: { sdp: pc.localDescription },
                      });
                    }
                  })
                  .catch(() => {});
              } else if (msg.signal?.candidate) {
                pc.addIceCandidate(new RTCIceCandidate(msg.signal.candidate)).catch(() => {});
              }
              break;
            }
          }
        } catch {
          // Ignore malformed ws message
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (!disposed) {
          reconnectTimerRef.current = window.setTimeout(connect, 2000);
        }
      };
    }

    connect();

    const pingInterval = window.setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'net:ping', ts: performance.now() }));
      }
    }, 4000);

    return () => {
      disposed = true;
      window.clearInterval(pingInterval);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      leaveVoiceChannel();
      wsRef.current?.close();
    };
  }, [cleanupPeer, createPeerConnection, fetchFriends, fetchServerState, leaveVoiceChannel, sendWs]);

  // Re-hello & refresh friends whenever playerName / clanTag / loadout changes
  useEffect(() => {
    sendWs({
      type: 'auth:hello',
      playerName: loadout.playerName,
      clanTag: loadout.clanTag,
      loadout,
    });
    fetchFriends();
  }, [fetchFriends, loadout, sendWs]);

  const createFriendRoom = useCallback(
    (arenaId: string, isPublic = true) => {
      setRoomError(null);
      sendWs({ type: 'room:create', arenaId, isPublic, loadout: loadoutRef.current });
    },
    [sendWs]
  );

  const joinFriendRoom = useCallback(
    (code: string) => {
      setRoomError(null);
      sendWs({ type: 'room:join', code, loadout: loadoutRef.current });
    },
    [sendWs]
  );

  const leaveRoom = useCallback(() => {
    sendWs({ type: 'room:leave' });
    setCreatedRoomCode(null);
    setActiveRoom(null);
    setMatchmakingWaiting(false);
  }, [sendWs]);

  const queueMatchmaking = useCallback(
    (arenaId: string) => {
      setRoomError(null);
      sendWs({ type: 'matchmaking:queue', arenaId, loadout: loadoutRef.current });
    },
    [sendWs]
  );

  const cancelMatchmaking = useCallback(() => {
    sendWs({ type: 'matchmaking:cancel' });
    setMatchmakingWaiting(false);
  }, [sendWs]);

  const sendCombatSync = useCallback(
    (payload: unknown) => {
      sendWs({ type: 'combat:sync', payload });
    },
    [sendWs]
  );

  const sendChatMessage = useCallback(
    (channel: string, text: string) => {
      sendWs({ type: 'chat:send', channel, text });
    },
    [sendWs]
  );

  const reportMatchResult = useCallback(
    async (won: boolean, isTournament: boolean, stylePoints: number, styleRank: string) => {
      try {
        const res = await fetch('/api/match/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerName: loadoutRef.current.playerName,
            won,
            isTournament,
            stylePoints,
            styleRank,
            fighterId: loadoutRef.current.petId,
            petId: loadoutRef.current.petId,
            clanTag: loadoutRef.current.clanTag,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.leaderboard) setLeaderboard(data.leaderboard);
          if (data.clans) setClans(data.clans);
          if (data.tournament) setTournament(data.tournament);
          return data.entry;
        }
      } catch {
        // Ignore network errors
      }
      return null;
    },
    []
  );

  const addFriend = useCallback(async (friendName: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/friends/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: loadoutRef.current.playerName,
          friendName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'No se pudo agregar amigo.' };
      }
      setFriends(data.friends ?? []);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Error de conexión.' };
    }
  }, []);

  const removeFriend = useCallback(async (friendName: string) => {
    try {
      const res = await fetch('/api/friends/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: loadoutRef.current.playerName,
          friendName,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends ?? []);
      }
    } catch {
      // ignore
    }
  }, []);

  const sendDuelInvite = useCallback(
    (targetPlayerName: string, arenaId: string, targetClientId?: string | null) => {
      setRoomError(null);
      setDuelStatusNotice(null);
      sendWs({
        type: 'duel:invite',
        targetPlayerName,
        targetClientId,
        arenaId,
        loadout: loadoutRef.current,
      });
    },
    [sendWs]
  );

  const acceptDuelInvite = useCallback(
    (invite: DuelInvite) => {
      setIncomingDuel(null);
      sendWs({
        type: 'duel:accept',
        fromClientId: invite.fromClientId,
        arenaId: invite.arenaId,
        loadout: loadoutRef.current,
      });
    },
    [sendWs]
  );

  const declineDuelInvite = useCallback(
    (invite: DuelInvite) => {
      setIncomingDuel(null);
      sendWs({
        type: 'duel:decline',
        fromClientId: invite.fromClientId,
      });
    },
    [sendWs]
  );

  return {
    connected,
    clientId,
    onlineCount,
    onlinePlayers,
    friends,
    incomingDuel,
    duelStatusNotice,
    pingMs,
    openRooms,
    leaderboard,
    clans,
    tournament,
    chatMessages,
    createdRoomCode,
    roomError,
    matchmakingWaiting,
    activeRoom,
    voiceChannel,
    voiceParticipants,
    micMuted,
    micLevel,
    voiceError,
    combatHandlerRef,
    fetchServerState,
    fetchFriends,
    addFriend,
    removeFriend,
    sendDuelInvite,
    acceptDuelInvite,
    declineDuelInvite,
    clearDuelNotice: () => setDuelStatusNotice(null),
    createFriendRoom,
    joinFriendRoom,
    leaveRoom,
    queueMatchmaking,
    cancelMatchmaking,
    sendCombatSync,
    sendChatMessage,
    reportMatchResult,
    joinVoiceChannel,
    leaveVoiceChannel,
    toggleMicMute,
    setLeaderboard,
    setClans,
    setTournament,
  };
}
