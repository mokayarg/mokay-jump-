import { useCallback, useEffect, useState } from 'react';
import {
  Download,
  Globe,
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
  PetId,
  PlayerLoadout,
  computeStylePoints,
  getStyleRank,
  normalizeLoadout,
} from './data/mokayaData';
import { useMokayaRealtime } from './hooks/useMokayaRealtime';
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
  const onlineFriendsCount = realtime.friends.filter((f) => f.online).length;

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

        {/* Incoming Friend Dual Race Invite Banner */}
        {realtime.incomingDuel && (
          <div className="absolute top-14 left-3 right-3 z-50 bg-zinc-950 text-white border-2 border-[#FF6A3D] rounded-2xl p-3 shadow-xl flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <MascotVectorPortrait
                petId={(realtime.incomingDuel.fromPetId as PetId) || 'mokay-fosforo'}
                size={38}
                className="bg-white/10 rounded-xl shrink-0"
              />
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-amber-300 uppercase flex items-center gap-1">
                  <Swords className="w-3 h-3" /> Reto de Carrera Dual
                </div>
                <div className="font-display font-bold text-xs truncate">
                  {realtime.incomingDuel.fromName} [{realtime.incomingDuel.fromClanTag}]
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => realtime.declineDuelInvite(realtime.incomingDuel!)}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 text-[11px] font-bold"
              >
                No
              </button>
              <button
                onClick={() => {
                  const inv = realtime.incomingDuel!;
                  setSelectedArenaId(inv.arenaId);
                  realtime.acceptDuelInvite(inv);
                  setActiveTab('jugar');
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
                {realtime.onlineCount}
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
              <button
                onClick={() => setShowPrivacyModal(true)}
                aria-label="Privacidad y Play Store"
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/70 shrink-0"
              >
                <ShieldCheck className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveTab('personajes')}
                className="flex items-center gap-2 text-right min-w-0 hover:opacity-80"
              >
                <div className="min-w-0">
                  <div className="font-display font-bold text-xs text-zinc-900 truncate">
                    {loadout.playerName}
                  </div>
                  <div className="text-[10px] font-semibold truncate" style={{ color: styleRank.color }}>
                    {styleRank.name} · {loadout.elo}
                  </div>
                </div>
              </button>
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
              connected={realtime.connected}
              onlineCount={realtime.onlineCount}
              pingMs={realtime.pingMs}
              friends={realtime.friends}
              duelStatusNotice={realtime.duelStatusNotice}
              onSendDuelInvite={(targetName, arena, targetClientId) => {
                realtime.sendDuelInvite(targetName, arena, targetClientId);
              }}
              openRooms={realtime.openRooms}
              createdRoomCode={realtime.createdRoomCode}
              roomError={realtime.roomError}
              matchmakingWaiting={realtime.matchmakingWaiting}
              activeRoom={realtime.activeRoom}
              combatHandlerRef={realtime.combatHandlerRef}
              onCreateRoom={realtime.createFriendRoom}
              onJoinRoom={realtime.joinFriendRoom}
              onLeaveRoom={realtime.leaveRoom}
              onQueueMatchmaking={realtime.queueMatchmaking}
              onCancelMatchmaking={realtime.cancelMatchmaking}
              onSendCombatSync={realtime.sendCombatSync}
              onReportMatchResult={realtime.reportMatchResult}
              voiceChannel={realtime.voiceChannel}
              micMuted={realtime.micMuted}
              micLevel={realtime.micLevel}
              onJoinVoice={realtime.joinVoiceChannel}
              onLeaveVoice={realtime.leaveVoiceChannel}
              onToggleMic={realtime.toggleMicMute}
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
              friends={realtime.friends}
              onlinePlayers={realtime.onlinePlayers}
              leaderboard={realtime.leaderboard}
              duelStatusNotice={realtime.duelStatusNotice}
              roomError={realtime.roomError}
              onAddFriend={realtime.addFriend}
              onRemoveFriend={realtime.removeFriend}
              onSendDuelInvite={(targetName, arena, targetClientId) => {
                realtime.sendDuelInvite(targetName, arena, targetClientId);
              }}
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
