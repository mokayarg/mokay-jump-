import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Download,
  Globe,
  LogOut,
  Rocket,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import {
  DEFAULT_LOADOUT,
  PetId,
  PlayerLoadout,
  computeStylePoints,
  getStyleRank,
  normalizeLoadout,
} from './data/mokayaData';
import { FriendProfile, RoomMatchInfo, useMokayaRealtime } from './hooks/useMokayaRealtime';
import { useFirebaseSocial } from './hooks/useFirebaseSocial';
import { useOnlineStatus, usePWAInstall } from './hooks/usePWAInstall';
import { MokayaJumpGame } from './components/MokayaJumpGame';
import { WardrobeStudio } from './components/WardrobeStudio';
import { WorldMapExplorer } from './components/WorldMapExplorer';
import { TournamentsView } from './components/TournamentsView';
import { SocialHub } from './components/SocialHub';
import { MascotVectorPortrait } from './components/VectorPortrait';

type NavTab = 'jugar' | 'personajes' | 'escenarios' | 'torneos' | 'social';

const STORAGE_KEY = 'mokaya_arena_loadout_v1';

function loadSavedLoadout(): PlayerLoadout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return normalizeLoadout(JSON.parse(raw));
    }
  } catch {
    // Ignore storage issues
  }
  return normalizeLoadout(null);
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('jugar');
  const [loadout, setLoadout] = useState<PlayerLoadout>(loadSavedLoadout);
  const [selectedArenaId, setSelectedArenaId] = useState<string>('rhythm-hood');
  const [tournamentMode, setTournamentMode] = useState(false);
  const [isPlayingRun, setIsPlayingRun] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const realtime = useMokayaRealtime(loadout);
  const handleSyncNameFromGoogle = useCallback((googleName: string) => {
    setLoadout((prev) =>
      prev.playerName === 'MokayerPro' ? { ...prev, playerName: googleName } : prev
    );
  }, []);
  const firebaseSocial = useFirebaseSocial(loadout, handleSyncNameFromGoogle);
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loadout));
    } catch {
      // Ignore storage quota issues
    }
  }, [loadout]);

  const handleGainPetXp = useCallback((xp: number, won: boolean) => {
    setLoadout((prev) => ({
      ...prev,
      petXp: prev.petXp + xp,
      wins: prev.wins + (won ? 1 : 0),
      losses: prev.losses + (won ? 0 : 1),
      elo: Math.max(800, prev.elo + (won ? 24 : -14)),
    }));
  }, []);

  // Build stable RoomMatchInfo from active Firestore 1v1 Dual Race
  const fbRace = firebaseSocial.activeRace;
  const fbUid = firebaseSocial.authUser?.uid ?? null;
  const firebaseRoomInfo: RoomMatchInfo | null = useMemo(() => {
    if (!fbRace || !fbUid) return null;
    const isHost = fbRace.hostUid === fbUid;
    const oppUid = isHost ? fbRace.guestUid : fbRace.hostUid;
    const oppName = isHost ? fbRace.guestName : fbRace.hostName;
    const oppPet = (isHost ? fbRace.guestPetId : fbRace.hostPetId) as PetId;
    return {
      code: fbRace.raceId,
      role: isHost ? 'host' : 'guest',
      arenaId: fbRace.arenaId,
      opponentId: oppUid,
      opponentName: oppName,
      opponentLoadout: {
        ...DEFAULT_LOADOUT,
        playerName: oppName,
        petId: oppPet,
      },
    };
  }, [
    fbRace?.raceId,
    fbRace?.hostUid,
    fbRace?.guestUid,
    fbRace?.hostName,
    fbRace?.guestName,
    fbRace?.hostPetId,
    fbRace?.guestPetId,
    fbRace?.arenaId,
    fbUid,
  ]);

  // Auto-open game tab when a Google 1v1 Dual Race starts
  useEffect(() => {
    if (fbRace && fbRace.status === 'active') {
      setSelectedArenaId(fbRace.arenaId);
      setActiveTab('jugar');
    }
  }, [fbRace?.raceId]);

  // Push real-time rival altitude & authoritative finish from Firestore dualRaces into game engine
  useEffect(() => {
    if (!fbRace || !fbUid || !realtime.combatHandlerRef.current) return;
    const isHost = fbRace.hostUid === fbUid;
    const rivalMeters = isHost ? fbRace.guestMeters : fbRace.hostMeters;
    const rivalX = isHost ? fbRace.guestX : fbRace.hostX;
    const rivalAlive = isHost ? fbRace.guestAlive : fbRace.hostAlive;
    const forcedWin = fbRace.status === 'finished' && fbRace.winnerUid === fbUid;
    const forcedLoss =
      fbRace.status === 'finished' && Boolean(fbRace.winnerUid) && fbRace.winnerUid !== fbUid;

    realtime.combatHandlerRef.current({
      meters: rivalMeters,
      x: rivalX,
      alive: rivalAlive,
      forcedWin,
      forcedLoss,
    });
  }, [
    fbRace?.hostMeters,
    fbRace?.hostX,
    fbRace?.hostAlive,
    fbRace?.guestMeters,
    fbRace?.guestX,
    fbRace?.guestAlive,
    fbRace?.status,
    fbRace?.winnerUid,
    fbUid,
    realtime.combatHandlerRef,
  ]);

  // Unified Friends list (Google Firestore friends prioritized + local/WS friends)
  const mergedFriends: FriendProfile[] = useMemo(() => {
    const map = new Map<string, FriendProfile>();
    for (const f of firebaseSocial.friends) {
      map.set(f.playerName.toLowerCase(), f);
    }
    for (const f of realtime.friends) {
      const k = f.playerName.toLowerCase();
      if (!map.has(k)) {
        map.set(k, f);
      }
    }
    return Array.from(map.values());
  }, [firebaseSocial.friends, realtime.friends]);

  const effectiveActiveRoom = firebaseRoomInfo ?? realtime.activeRoom;
  const effectiveOnlineCount = Math.max(
    realtime.onlineCount,
    firebaseSocial.publicProfiles.filter((p) => p.online).length || 1
  );
  const effectiveDuelNotice = firebaseSocial.outgoingNotice ?? realtime.duelStatusNotice;

  const handleUnifiedAddFriend = useCallback(
    async (friendName: string) => {
      if (firebaseSocial.isGoogleSignedIn) {
        const res = await firebaseSocial.addFriendBySearch(friendName);
        if (res.ok) return res;
        // Fallback to local WS/server friend if not found in Firestore yet
        const wsRes = await realtime.addFriend(friendName);
        return wsRes.ok ? wsRes : res;
      }
      return realtime.addFriend(friendName);
    },
    [firebaseSocial, realtime]
  );

  const handleUnifiedRemoveFriend = useCallback(
    (friendName: string, friendUid?: string | null) => {
      if (firebaseSocial.isGoogleSignedIn && friendUid) {
        void firebaseSocial.removeFirebaseFriend(friendUid);
      }
      void realtime.removeFriend(friendName);
    },
    [firebaseSocial, realtime]
  );

  const handleUnifiedSendDuelInvite = useCallback(
    (targetName: string, arenaId: string, targetClientId?: string | null) => {
      // If target is a Google-authenticated friend with UID, send invite via Firestore
      const fbFriend = firebaseSocial.friends.find(
        (f) =>
          f.uid === targetClientId || f.playerName.toLowerCase() === targetName.toLowerCase()
      );
      if (firebaseSocial.isGoogleSignedIn && fbFriend?.uid) {
        void firebaseSocial.sendFirebaseDuelInvite(fbFriend.uid, fbFriend.playerName, arenaId);
        return;
      }
      realtime.sendDuelInvite(targetName, arenaId, targetClientId);
    },
    [firebaseSocial, realtime]
  );

  const handleUnifiedSendCombatSync = useCallback(
    (payload: unknown) => {
      if (firebaseSocial.activeRace && payload && typeof payload === 'object') {
        const p = payload as { meters?: number; x?: number; alive?: boolean };
        firebaseSocial.updateDualRaceProgress(
          Number(p.meters || 0),
          Number(p.x || 220),
          Boolean(p.alive)
        );
        return;
      }
      realtime.sendCombatSync(payload);
    },
    [firebaseSocial, realtime]
  );

  const handleUnifiedLeaveRoom = useCallback(() => {
    if (firebaseSocial.activeRace) {
      void firebaseSocial.leaveFirebaseRace();
    }
    realtime.leaveRoom();
  }, [firebaseSocial, realtime]);

  const stylePts = computeStylePoints(loadout.clothes);
  const styleRank = getStyleRank(stylePts);

  const navItems: { id: NavTab; label: string; icon: typeof Rocket }[] = [
    { id: 'jugar', label: 'Jugar', icon: Rocket },
    { id: 'personajes', label: 'Personajes', icon: Sparkles },
    { id: 'escenarios', label: 'Escenarios', icon: Globe },
    { id: 'torneos', label: 'Torneos', icon: Trophy },
    { id: 'social', label: 'Amigos', icon: Users },
  ];

  const hideAppChrome = activeTab === 'jugar' && isPlayingRun;
  const onlineFriendsCount = mergedFriends.filter((f) => f.online).length;
  const incomingGoogleInvite = firebaseSocial.incomingInvites[0] ?? null;

  return (
    <div className="min-h-[100dvh] w-full bg-[#E5E0D5] flex items-center justify-center sm:p-3">
      {/* Android Mobile App Frame (Full-screen on mobile/Android, sleek device shell on desktop) */}
      <div className="relative w-full max-w-[460px] h-[100dvh] sm:h-[min(94dvh,860px)] bg-[#F7F5F0] text-zinc-900 flex flex-col overflow-hidden sm:rounded-[30px] sm:border-[3px] sm:border-zinc-900 sm:shadow-[0_24px_60px_rgba(24,24,27,0.22)]">
        {/* Offline Indicator */}
        {!isOnline && (
          <div className="bg-zinc-900 text-amber-300 px-3 py-1.5 text-[11px] font-bold flex items-center justify-center gap-1.5 shrink-0 z-30">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Sin conexión — Puedes seguir jugando en modo local</span>
          </div>
        )}

        {/* Incoming Friend Dual Race Invite Banner (Google Firestore or WS) */}
        {(incomingGoogleInvite || realtime.incomingDuel) && (
          <div className="absolute top-14 left-3 right-3 z-50 bg-zinc-950 text-white border-2 border-[#FF6A3D] rounded-2xl p-3 shadow-xl flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <MascotVectorPortrait
                petId={
                  ((incomingGoogleInvite?.fromPetId ??
                    realtime.incomingDuel?.fromPetId) as PetId) || 'mokay-fosforo'
                }
                size={38}
                className="bg-white/10 rounded-xl shrink-0"
              />
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-amber-300 uppercase flex items-center gap-1">
                  <Swords className="w-3 h-3" /> Reto 1 vs 1 Online
                </div>
                <div className="font-display font-bold text-xs truncate">
                  {incomingGoogleInvite?.fromName ?? realtime.incomingDuel?.fromName} [
                  {incomingGoogleInvite?.fromClanTag ?? realtime.incomingDuel?.fromClanTag}]
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  if (incomingGoogleInvite) {
                    void firebaseSocial.declineFirebaseDuelInvite(incomingGoogleInvite);
                  } else if (realtime.incomingDuel) {
                    realtime.declineDuelInvite(realtime.incomingDuel);
                  }
                }}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 text-[11px] font-bold"
              >
                No
              </button>
              <button
                onClick={() => {
                  if (incomingGoogleInvite) {
                    setSelectedArenaId(incomingGoogleInvite.arenaId);
                    void firebaseSocial.acceptFirebaseDuelInvite(incomingGoogleInvite);
                    setActiveTab('jugar');
                  } else if (realtime.incomingDuel) {
                    const inv = realtime.incomingDuel;
                    setSelectedArenaId(inv.arenaId);
                    realtime.acceptDuelInvite(inv);
                    setActiveTab('jugar');
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-[#FF6A3D] text-white text-[11px] font-extrabold"
              >
                Aceptar
              </button>
            </div>
          </div>
        )}

        {/* Compact Android Game App Header (hidden during active gameplay for full-screen focus) */}
        {!hideAppChrome && (
          <header className="h-13 px-3.5 bg-[#F7F5F0] border-b-2 border-zinc-900 flex items-center justify-between gap-2 shrink-0 z-20">
            <button
              onClick={() => setActiveTab('jugar')}
              className="flex items-center gap-1.5 text-left min-w-0"
            >
              <span className="font-display font-extrabold text-base tracking-tight text-zinc-900 whitespace-nowrap">
                MOKAY JUMP
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono-tabular font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {effectiveOnlineCount}
              </span>
            </button>

            <div className="flex items-center gap-1.5 min-w-0">
              {canInstall && (
                <button
                  onClick={() => promptInstall()}
                  className="px-2 py-1 rounded-lg bg-[#FF6A3D] text-white text-[10px] font-bold flex items-center gap-1 shrink-0"
                >
                  <Download className="w-3 h-3" /> Instalar
                </button>
              )}
              {!canInstall && !isInstalled && isIOS && (
                <button
                  onClick={() => setShowIOSGuide(true)}
                  className="px-2 py-1 rounded-lg bg-zinc-900 text-white text-[10px] font-bold flex items-center gap-1 shrink-0"
                >
                  <Download className="w-3 h-3" /> App
                </button>
              )}
              {firebaseSocial.isGoogleSignedIn ? (
                <button
                  onClick={() => setActiveTab('social')}
                  title="Cuenta Google conectada"
                  className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-white border border-zinc-300 hover:border-zinc-900 shrink-0"
                >
                  {firebaseSocial.authUser?.photoURL ? (
                    <img
                      src={firebaseSocial.authUser.photoURL}
                      alt={loadout.playerName}
                      className="w-5 h-5 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                      {loadout.playerName[0]?.toUpperCase()}
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-zinc-800 max-w-[68px] truncate">
                    {loadout.playerName}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => void firebaseSocial.loginWithGoogle()}
                  disabled={firebaseSocial.authBusy}
                  className="px-2.5 py-1 rounded-lg bg-white border border-zinc-900 text-zinc-900 text-[10px] font-extrabold flex items-center gap-1 shadow-[1px_1px_0_#18181B] shrink-0 disabled:opacity-60"
                >
                  <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>{firebaseSocial.authBusy ? '...' : 'Google'}</span>
                </button>
              )}
              <button
                onClick={() => setShowPrivacyModal(true)}
                aria-label="Privacidad y Play Store"
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/70 shrink-0"
              >
                <ShieldCheck className="w-4 h-4" />
              </button>
              {!firebaseSocial.isGoogleSignedIn && (
                <button
                  onClick={() => setActiveTab('personajes')}
                  className="hidden xs:flex items-center gap-1.5 text-right min-w-0 hover:opacity-80"
                >
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold truncate" style={{ color: styleRank.color }}>
                      {loadout.elo}
                    </div>
                  </div>
                </button>
              )}
              {firebaseSocial.isGoogleSignedIn && (
                <button
                  onClick={() => void firebaseSocial.logoutGoogle()}
                  aria-label="Cerrar sesión Google"
                  title="Cerrar sesión"
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </header>
        )}

        {/* Active In-Game Screen / Individual Menu View */}
        <main
          className={`flex-1 min-h-0 ${
            activeTab === 'jugar'
              ? 'overflow-hidden flex flex-col'
              : 'overflow-y-auto p-3.5 space-y-4'
          }`}
        >
          {activeTab === 'jugar' && (
            <MokayaJumpGame
              loadout={loadout}
              selectedArenaId={selectedArenaId}
              onSelectArena={setSelectedArenaId}
              tournamentMode={tournamentMode}
              onExitTournamentMode={() => setTournamentMode(false)}
              onGainPetXp={handleGainPetXp}
              onPlayingChange={setIsPlayingRun}
              onOpenCharacters={() => setActiveTab('personajes')}
              onOpenStages={() => setActiveTab('escenarios')}
              connected={realtime.connected || firebaseSocial.isGoogleSignedIn}
              onlineCount={effectiveOnlineCount}
              pingMs={realtime.pingMs}
              friends={mergedFriends}
              duelStatusNotice={effectiveDuelNotice}
              onSendDuelInvite={handleUnifiedSendDuelInvite}
              openRooms={realtime.openRooms}
              createdRoomCode={realtime.createdRoomCode}
              roomError={realtime.roomError}
              matchmakingWaiting={realtime.matchmakingWaiting}
              activeRoom={effectiveActiveRoom}
              combatHandlerRef={realtime.combatHandlerRef}
              onCreateRoom={realtime.createFriendRoom}
              onJoinRoom={realtime.joinFriendRoom}
              onLeaveRoom={handleUnifiedLeaveRoom}
              onQueueMatchmaking={realtime.queueMatchmaking}
              onCancelMatchmaking={realtime.cancelMatchmaking}
              onSendCombatSync={handleUnifiedSendCombatSync}
              onReportMatchResult={realtime.reportMatchResult}
              voiceChannel={realtime.voiceChannel}
              micMuted={realtime.micMuted}
              micLevel={realtime.micLevel}
              onJoinVoice={realtime.joinVoiceChannel}
              onLeaveVoice={realtime.leaveVoiceChannel}
              onToggleMic={realtime.toggleMicMute}
              isGoogleSignedIn={firebaseSocial.isGoogleSignedIn}
              authBusy={firebaseSocial.authBusy}
              onLoginGoogle={() => void firebaseSocial.loginWithGoogle()}
              onOpenFriendsTab={() => setActiveTab('social')}
            />
          )}

          {activeTab === 'personajes' && (
            <WardrobeStudio
              loadout={loadout}
              onUpdateLoadout={setLoadout}
              onGoToArena={() => setActiveTab('jugar')}
            />
          )}

          {activeTab === 'escenarios' && (
            <WorldMapExplorer
              selectedArenaId={selectedArenaId}
              onSelectArenaAndFight={(arenaId) => {
                setSelectedArenaId(arenaId);
                setActiveTab('jugar');
              }}
            />
          )}

          {activeTab === 'torneos' && (
            <TournamentsView
              loadout={loadout}
              leaderboard={realtime.leaderboard}
              tournament={realtime.tournament}
              onRefreshState={realtime.fetchServerState}
              onSetTournament={realtime.setTournament}
              onStartTournamentMatch={(arenaId) => {
                setSelectedArenaId(arenaId);
                setTournamentMode(true);
                setActiveTab('jugar');
              }}
            />
          )}

          {activeTab === 'social' && (
            <SocialHub
              loadout={loadout}
              onUpdateLoadout={setLoadout}
              selectedArenaId={selectedArenaId}
              clans={realtime.clans}
              onSetClans={realtime.setClans}
              chatMessages={realtime.chatMessages}
              onSendChat={realtime.sendChatMessage}
              onGoToQuickMatch={() => setActiveTab('jugar')}
              isGoogleSignedIn={firebaseSocial.isGoogleSignedIn}
              authBusy={firebaseSocial.authBusy}
              authError={firebaseSocial.authError}
              googleDisplayName={firebaseSocial.authUser?.displayName ?? null}
              googlePhotoURL={firebaseSocial.authUser?.photoURL ?? null}
              onLoginGoogle={() => void firebaseSocial.loginWithGoogle()}
              onLogoutGoogle={() => void firebaseSocial.logoutGoogle()}
              googleDiscoveryPlayers={firebaseSocial.discoveryPlayers}
              friends={mergedFriends}
              onlinePlayers={realtime.onlinePlayers}
              leaderboard={realtime.leaderboard}
              duelStatusNotice={effectiveDuelNotice}
              roomError={realtime.roomError}
              onAddFriend={handleUnifiedAddFriend}
              onRemoveFriend={handleUnifiedRemoveFriend}
              onSendDuelInvite={handleUnifiedSendDuelInvite}
              voiceChannel={realtime.voiceChannel}
              voiceParticipants={realtime.voiceParticipants}
              micMuted={realtime.micMuted}
              micLevel={realtime.micLevel}
              voiceError={realtime.voiceError}
              onJoinVoice={realtime.joinVoiceChannel}
              onLeaveVoice={realtime.leaveVoiceChannel}
              onToggleMic={realtime.toggleMicMute}
            />
          )}
        </main>

        {/* Native Android Bottom Navigation Bar (5 individual game menus, hidden while actively jumping) */}
        {!hideAppChrome && (
          <nav
            aria-label="Menús del juego"
            className="h-16 bg-white border-t-2 border-zinc-900 grid grid-cols-5 shrink-0 z-20"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-colors ${
                    active
                      ? 'text-[#FF6A3D] bg-orange-50 border-t-2 border-[#FF6A3D] -mt-[2px]'
                      : 'text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="truncate max-w-full px-1">{item.label}</span>
                  {item.id === 'social' && onlineFriendsCount > 0 && (
                    <span className="absolute top-1.5 right-3.5 w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </button>
              );
            })}
          </nav>
        )}

        {/* iOS Add to Home Screen Modal */}
        {showIOSGuide && (
          <div
            className="absolute inset-0 z-50 bg-zinc-950/80 flex items-center justify-center p-4"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="bg-white border-2 border-zinc-900 rounded-2xl p-4 w-full space-y-3 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display font-extrabold text-base">Instalar Mokay Jump</h2>
                <button onClick={() => setShowIOSGuide(false)} aria-label="Cerrar">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-zinc-600">
                En Safari iOS, toca el botón <strong>Compartir</strong> y elige{' '}
                <strong>Agregar a inicio</strong> para jugar en pantalla completa.
              </p>
            </div>
          </div>
        )}

        {/* Play Store Privacy & Permissions Disclosure Modal */}
        {showPrivacyModal && (
          <div
            className="absolute inset-0 z-50 bg-zinc-950/80 flex items-center justify-center p-4"
            onClick={() => setShowPrivacyModal(false)}
          >
            <div
              className="bg-white border-2 border-zinc-900 rounded-2xl p-4 w-full space-y-3 text-xs max-h-[85%] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <h2 className="font-display font-extrabold text-base flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Mokay Jump · Privacidad & Play Store
                </h2>
                <button onClick={() => setShowPrivacyModal(false)} aria-label="Cerrar">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 text-zinc-700 leading-relaxed">
                <p>
                  <strong>Datos de jugador:</strong> Guardamos tu apodo, estilo equipado, amigos,
                  clan, victorias y récord ELO para el ranking global y carreras duales 1 vs 1.
                </p>
                <p>
                  <strong>Audio en vivo (WebRTC):</strong> El permiso de micrófono solo se solicita
                  cuando presionas &quot;Entrar a Voz&quot;. No grabamos ni almacenamos audio.
                </p>
                <p>
                  <strong>Juego limpio:</strong> Las prendas y rangos de estilo en Mokay Jump son
                  100% visuales y nunca otorgan ventaja competitiva en torneos ni carreras duales.
                </p>
                <p>
                  <strong>Android TWA / Google Play:</strong> Incluye manifiesto standalone en
                  orientación vertical, iconos adaptativos y plantilla Digital Asset Links en{' '}
                  <code className="font-mono-tabular text-[11px]">/.well-known/assetlinks.json</code>.
                </p>
              </div>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="mokaya-btn w-full bg-zinc-900 text-white py-2.5 rounded-xl font-bold"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
