import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Plus,
  Send,
  Swords,
  UserMinus,
  UserPlus,
  Users,
  Volume2,
} from 'lucide-react';
import { ARENA_STAGES, PetId, PlayerLoadout } from '../data/mokayaData';
import {
  ChatMessage,
  ClanInfo,
  FriendProfile,
  LeaderboardEntry,
  OnlinePlayerSummary,
  VoiceParticipant,
} from '../hooks/useMokayaRealtime';
import { MascotVectorPortrait } from './VectorPortrait';

import { FirebasePublicProfile } from '../hooks/useFirebaseSocial';

interface SocialHubProps {
  loadout: PlayerLoadout;
  onUpdateLoadout: (updater: (prev: PlayerLoadout) => PlayerLoadout) => void;
  selectedArenaId: string;
  clans: ClanInfo[];
  onSetClans: (clans: ClanInfo[]) => void;
  chatMessages: ChatMessage[];
  onSendChat: (channel: string, text: string) => void;
  onGoToQuickMatch: () => void;
  // Google Auth & Firebase Friends
  isGoogleSignedIn: boolean;
  authBusy: boolean;
  authError: string | null;
  googleDisplayName: string | null;
  googlePhotoURL: string | null;
  onLoginGoogle: () => void;
  onLogoutGoogle: () => void;
  googleDiscoveryPlayers: FirebasePublicProfile[];
  // Friends & Dual Races
  friends: FriendProfile[];
  onlinePlayers: OnlinePlayerSummary[];
  leaderboard: LeaderboardEntry[];
  duelStatusNotice: string | null;
  roomError: string | null;
  onAddFriend: (friendName: string) => Promise<{ ok: boolean; error?: string }>;
  onRemoveFriend: (friendName: string, friendUid?: string | null) => void;
  onSendDuelInvite: (targetPlayerName: string, arenaId: string, targetClientId?: string | null) => void;
  // Voice
  voiceChannel: string | null;
  voiceParticipants: VoiceParticipant[];
  micMuted: boolean;
  micLevel: number;
  voiceError: string | null;
  onJoinVoice: (channel: string) => void;
  onLeaveVoice: () => void;
  onToggleMic: () => void;
}

export const SocialHub: React.FC<SocialHubProps> = ({
  loadout,
  onUpdateLoadout,
  selectedArenaId,
  clans,
  onSetClans,
  chatMessages,
  onSendChat,
  onGoToQuickMatch,
  isGoogleSignedIn,
  authBusy,
  authError,
  googleDisplayName,
  googlePhotoURL,
  onLoginGoogle,
  onLogoutGoogle,
  googleDiscoveryPlayers,
  friends,
  onlinePlayers,
  leaderboard,
  duelStatusNotice,
  roomError,
  onAddFriend,
  onRemoveFriend,
  onSendDuelInvite,
  voiceChannel,
  voiceParticipants,
  micMuted,
  micLevel,
  voiceError,
  onJoinVoice,
  onLeaveVoice,
  onToggleMic,
}) => {
  const [socialSection, setSocialSection] = useState<'amigos' | 'clanes'>('amigos');
  const [friendNameInput, setFriendNameInput] = useState('');
  const [friendFeedback, setFriendFeedback] = useState<string | null>(null);

  const [chatTab, setChatTab] = useState<'global' | 'clan'>('global');
  const [chatInput, setChatInput] = useState('');

  const [showCreateClan, setShowCreateClan] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [newName, setNewName] = useState('');
  const [newDistrict, setNewDistrict] = useState('Rhythm Hood');
  const [newMotto, setNewMotto] = useState('');
  const [clanError, setClanError] = useState<string | null>(null);

  const activeChannelName = chatTab === 'global' ? 'global' : `clan-${loadout.clanTag}`;
  const filteredMessages = chatMessages.filter(
    (m) => m.channel === activeChannelName || (chatTab === 'global' && m.channel === 'global')
  );

  const myClan = clans.find((c) => c.tag === loadout.clanTag) ?? clans[0];
  const clanVoiceId = `clan-${loadout.clanTag}`;
  const isConnectedToClanVoice = voiceChannel === clanVoiceId;

  const friendNameSet = new Set(friends.map((f) => f.playerName.toLowerCase()));
  const meLower = loadout.playerName.toLowerCase();

  // Discover players from Google accounts, online WS, or leaderboard not yet in friends
  const seenNames = new Set<string>([meLower, ...friendNameSet]);
  const discoveryCandidates: {
    key: string;
    playerName: string;
    clanTag: string;
    petId: PetId;
    online: boolean;
    clientId: string | null;
    photoURL?: string;
    isGoogle?: boolean;
  }[] = [];

  for (const gp of googleDiscoveryPlayers) {
    const low = gp.displayName.toLowerCase();
    if (!seenNames.has(low)) {
      seenNames.add(low);
      discoveryCandidates.push({
        key: gp.uid,
        playerName: gp.displayName,
        clanTag: gp.clanTag,
        petId: (gp.petId as PetId) || 'mokay-fosforo',
        online: gp.online,
        clientId: gp.uid,
        photoURL: gp.photoURL,
        isGoogle: true,
      });
    }
  }

  for (const op of onlinePlayers) {
    const low = op.playerName.toLowerCase();
    if (!seenNames.has(low)) {
      seenNames.add(low);
      discoveryCandidates.push({
        key: `ws_${op.id}`,
        playerName: op.playerName,
        clanTag: op.clanTag,
        petId: (op.petId as PetId) || 'mokay-fosforo',
        online: true,
        clientId: op.id,
      });
    }
  }

  for (const lb of leaderboard.slice(0, 6)) {
    const low = lb.playerName.toLowerCase();
    if (!seenNames.has(low)) {
      seenNames.add(low);
      discoveryCandidates.push({
        key: `lb_${lb.playerName}`,
        playerName: lb.playerName,
        clanTag: lb.clanTag,
        petId: (lb.petId as PetId) || 'mokay-fosforo',
        online: false,
        clientId: null,
      });
    }
  }

  const handleAddFriendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendNameInput.trim()) return;
    setFriendFeedback(null);
    const res = await onAddFriend(friendNameInput.trim());
    if (res.ok) {
      setFriendNameInput('');
      setFriendFeedback('¡Amigo agregado a tu lista!');
    } else {
      setFriendFeedback(res.error ?? 'No se pudo agregar.');
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(activeChannelName, chatInput.trim());
    setChatInput('');
  };

  const handleJoinClan = async (tag: string) => {
    setClanError(null);
    const res = await fetch('/api/clans/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag, playerName: loadout.playerName }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.clans) onSetClans(data.clans);
      onUpdateLoadout((prev) => ({ ...prev, clanTag: tag }));
    }
  };

  const handleCreateClan = async (e: React.FormEvent) => {
    e.preventDefault();
    setClanError(null);
    const res = await fetch('/api/clans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag: newTag,
        name: newName,
        district: newDistrict,
        motto: newMotto,
        playerName: loadout.playerName,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setClanError(data.error || 'No se pudo crear el clan.');
      return;
    }
    if (data.clans) onSetClans(data.clans);
    onUpdateLoadout((prev) => ({ ...prev, clanTag: data.clan.tag }));
    setShowCreateClan(false);
    setNewTag('');
    setNewName('');
    setNewMotto('');
  };

  return (
    <div className="space-y-4">
      {/* Header + Sub-Tab Switcher */}
      <div className="mokaya-card rounded-2xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="font-display font-extrabold text-xl text-zinc-900">
              Amigos, Clanes & Voz
            </h1>
            <p className="text-xs text-zinc-600 mt-0.5">
              Agrega amigos para carreras duales: el que llegue más alto gana.
            </p>
          </div>
          <button
            onClick={onGoToQuickMatch}
            className="mokaya-btn bg-[#FF6A3D] text-white px-3 py-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shrink-0"
          >
            <Swords className="w-3.5 h-3.5" /> Salas
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-100 rounded-xl border border-zinc-200">
          <button
            onClick={() => setSocialSection('amigos')}
            className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${
              socialSection === 'amigos' ? 'bg-zinc-900 text-white' : 'text-zinc-600'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Amigos ({friends.length})
          </button>
          <button
            onClick={() => setSocialSection('clanes')}
            className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${
              socialSection === 'clanes' ? 'bg-zinc-900 text-white' : 'text-zinc-600'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Clanes & Voz
          </button>
        </div>
      </div>

      {duelStatusNotice && (
        <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border-2 border-emerald-300 rounded-xl px-3 py-2">
          {duelStatusNotice}
        </div>
      )}
      {roomError && (
        <div className="text-xs font-semibold text-rose-700 bg-rose-50 border-2 border-rose-300 rounded-xl px-3 py-2">
          {roomError}
        </div>
      )}

      {socialSection === 'amigos' && (
        <div className="space-y-4">
          {/* Google Account Sign-In Card */}
          <div className="mokaya-card rounded-2xl p-4 space-y-2.5 bg-zinc-950 text-white">
            {isGoogleSignedIn ? (
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  {googlePhotoURL ? (
                    <img
                      src={googlePhotoURL}
                      alt={googleDisplayName || 'Google'}
                      className="w-9 h-9 rounded-full border-2 border-emerald-400 shrink-0 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-emerald-500 text-zinc-950 font-extrabold flex items-center justify-center text-sm shrink-0">
                      {(googleDisplayName || loadout.playerName)[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                      Cuenta Google Conectada
                    </div>
                    <div className="font-display font-bold text-sm truncate">
                      {googleDisplayName || loadout.playerName}
                    </div>
                  </div>
                </div>
                <button
                  onClick={onLogoutGoogle}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-bold shrink-0"
                >
                  Salir
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div>
                  <div className="text-[11px] font-bold text-amber-300 uppercase">
                    Cuenta Google · 1 vs 1 Online
                  </div>
                  <p className="text-xs text-zinc-300 mt-0.5 leading-snug">
                    Entra con tu cuenta Google para guardar tus amigos y retarlos a carreras 1 vs 1
                    desde cualquier celular: el que sube más gana, el que cae pierde.
                  </p>
                </div>
                <button
                  onClick={onLoginGoogle}
                  disabled={authBusy}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-display font-extrabold text-xs flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
                  <span>{authBusy ? 'Conectando...' : 'Entrar con Google'}</span>
                </button>
              </div>
            )}
            {authError && <p className="text-[11px] font-semibold text-rose-400">{authError}</p>}
          </div>

          {/* Add Friend Form */}
          <div className="mokaya-card rounded-2xl p-4 space-y-3">
            <h2 className="font-display font-bold text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#FF6A3D]" /> Conectar con Amigos
            </h2>
            <form onSubmit={handleAddFriendSubmit} className="flex items-center gap-2">
              <input
                type="text"
                maxLength={20}
                value={friendNameInput}
                onChange={(e) => setFriendNameInput(e.target.value)}
                placeholder="Nombre de jugador (ej. ValenFlow)"
                className="flex-1 px-3 py-2 text-xs bg-zinc-50 border-2 border-zinc-900 rounded-xl focus:outline-none"
              />
              <button
                type="submit"
                className="mokaya-btn bg-zinc-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold shrink-0"
              >
                Agregar
              </button>
            </form>
            {friendFeedback && (
              <p className="text-xs font-semibold text-emerald-700">{friendFeedback}</p>
            )}

            {/* Friends List */}
            <div className="space-y-2 pt-1">
              {friends.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-4">
                  Aún no agregas amigos. Escribe su apodo o agrégalos desde abajo.
                </p>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend.playerName}
                    className="p-2.5 rounded-xl border-2 border-zinc-200 bg-white flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <MascotVectorPortrait
                          petId={(friend.petId as PetId) || 'mokay-fosforo'}
                          size={38}
                          className="bg-zinc-100 rounded-lg border border-zinc-200"
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                            friend.online ? 'bg-emerald-500' : 'bg-zinc-300'
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-display font-bold text-xs text-zinc-900 truncate">
                          {friend.playerName}{' '}
                          <span className="font-mono-tabular text-[10px] text-[#8B7CE8]">
                            [{friend.clanTag}]
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {friend.online
                            ? friend.inRoom
                              ? 'En carrera ahora'
                              : 'En línea · Listo para carrera'
                            : 'Desconectado'}{' '}
                          · ELO {friend.elo}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() =>
                          onSendDuelInvite(friend.playerName, selectedArenaId, friend.clientId)
                        }
                        disabled={!friend.online}
                        className="mokaya-btn bg-[#FF6A3D] text-white px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 disabled:opacity-40"
                      >
                        <Swords className="w-3 h-3" /> Carrera
                      </button>
                      <button
                        onClick={() => onRemoveFriend(friend.playerName, friend.clientId)}
                        aria-label={`Eliminar a ${friend.playerName}`}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Discover Online / Google / Leaderboard Players */}
          {discoveryCandidates.length > 0 && (
            <div className="mokaya-card rounded-2xl p-4 space-y-2.5">
              <h3 className="font-display font-bold text-sm text-zinc-900">
                Jugadores Activos para Agregar
              </h3>
              <div className="space-y-2">
                {discoveryCandidates.map((cand) => (
                  <div
                    key={cand.key}
                    className="flex items-center justify-between gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MascotVectorPortrait
                        petId={cand.petId}
                        size={30}
                        className="bg-white rounded-lg border border-zinc-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-zinc-900 truncate">
                          {cand.playerName} <span className="text-[10px] text-zinc-500">[{cand.clanTag}]</span>
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {cand.online
                            ? cand.isGoogle
                              ? 'Google · En línea ahora'
                              : 'Conectado ahora'
                            : cand.isGoogle
                            ? 'Cuenta Google'
                            : 'Ranking Global'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onAddFriend(cand.playerName)}
                      className="mokaya-btn bg-white text-zinc-900 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3 h-3" /> Añadir
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {socialSection === 'clanes' && (
      <div className="space-y-4">
        {/* Clans Directory + Create Clan */}
        <div className="space-y-4">
          <div className="mokaya-card rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display font-bold text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-[#8B7CE8]" /> Clanes Activos
              </h2>
              <button
                onClick={() => setShowCreateClan((v) => !v)}
                className="mokaya-btn bg-zinc-900 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Crear Clan
              </button>
            </div>

            {showCreateClan && (
              <form
                onSubmit={handleCreateClan}
                className="bg-zinc-50 border-2 border-zinc-900 rounded-xl p-4 space-y-3"
              >
                <div className="grid grid-cols-1 gap-2.5">
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="Tag (ej. FLOW)"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value.toUpperCase())}
                    className="px-3 py-2 text-xs font-mono-tabular font-bold uppercase bg-white border-2 border-zinc-900 rounded-xl"
                  />
                  <input
                    type="text"
                    maxLength={28}
                    required
                    placeholder="Nombre del clan"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="sm:col-span-2 px-3 py-2 text-xs font-semibold bg-white border-2 border-zinc-900 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <select
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    className="px-3 py-2 text-xs font-semibold bg-white border-2 border-zinc-900 rounded-xl"
                  >
                    {ARENA_STAGES.map((s) => (
                      <option key={s.id} value={s.name}>
                        Distrito base: {s.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    maxLength={60}
                    placeholder="Lema del clan"
                    value={newMotto}
                    onChange={(e) => setNewMotto(e.target.value)}
                    className="px-3 py-2 text-xs bg-white border-2 border-zinc-900 rounded-xl"
                  />
                </div>
                {clanError && <p className="text-xs font-semibold text-rose-600">{clanError}</p>}
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="mokaya-btn bg-[#8B7CE8] text-white px-4 py-2 rounded-xl text-xs font-bold"
                  >
                    Guardar Clan
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateClan(false)}
                    className="text-xs font-semibold text-zinc-600 hover:underline px-2"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {clans.map((clan) => {
                const isMember = loadout.clanTag === clan.tag;
                return (
                  <div
                    key={clan.tag}
                    className={`p-3.5 rounded-xl border-2 flex items-center justify-between gap-3 ${
                      isMember ? 'border-zinc-900 bg-violet-50' : 'border-zinc-200 bg-white'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-tabular font-extrabold text-xs text-[#FF6A3D]">
                          [{clan.tag}]
                        </span>
                        <span className="font-display font-bold text-base text-zinc-900 truncate">
                          {clan.name}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 truncate">{clan.motto}</p>
                      <div className="text-[11px] text-zinc-500">
                        {clan.district} · {clan.members.length} miembros ·{' '}
                        <span className="font-mono-tabular font-bold text-zinc-800">
                          {clan.points} pts
                        </span>
                      </div>
                    </div>

                    {isMember ? (
                      <span className="text-xs font-bold text-violet-700 shrink-0">Tu Clan</span>
                    ) : (
                      <button
                        onClick={() => handleJoinClan(clan.tag)}
                        className="mokaya-btn bg-white text-zinc-900 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0"
                      >
                        Unirse
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Real-Time Voice Room + Live Text Chat */}
        <div className="space-y-4">
          {/* Voice Room Card */}
          <div className="mokaya-card rounded-2xl p-4 sm:p-5 space-y-3 bg-zinc-950 text-white">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs text-zinc-400">Canal de Voz WebRTC</div>
                <h2 className="font-display font-bold text-lg flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  Voz del Clan [{myClan?.tag ?? loadout.clanTag}]
                </h2>
              </div>

              {isConnectedToClanVoice ? (
                <button
                  onClick={onLeaveVoice}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold flex items-center gap-1.5"
                >
                  <PhoneOff className="w-3.5 h-3.5" /> Desconectar
                </button>
              ) : (
                <button
                  onClick={() => onJoinVoice(clanVoiceId)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-extrabold flex items-center gap-1.5"
                >
                  <PhoneCall className="w-3.5 h-3.5" /> Entrar a Voz
                </button>
              )}
            </div>

            {voiceError && <p className="text-xs text-amber-300">{voiceError}</p>}

            {isConnectedToClanVoice ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                  <button
                    onClick={onToggleMic}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                      micMuted ? 'bg-rose-600 text-white' : 'bg-white text-zinc-900'
                    }`}
                  >
                    {micMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    {micMuted ? 'Silenciado' : 'Mic Activo'}
                  </button>
                  <div className="flex-1 space-y-1">
                    <div className="text-[11px] text-zinc-400">Nivel de entrada en vivo</div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 transition-all duration-75"
                        style={{ width: `${Math.round(micLevel * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs text-zinc-400">
                    Conectados ({voiceParticipants.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {voiceParticipants.map((vp) => (
                      <div
                        key={vp.id}
                        className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-xs flex items-center gap-1.5"
                      >
                        {vp.micActive ? (
                          <Mic className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <MicOff className="w-3 h-3 text-zinc-500" />
                        )}
                        <span className="font-semibold">{vp.playerName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-400">
                Conéctate para hablar en tiempo real con tu crew mientras buscas partidas o entrenas en la arena.
              </p>
            )}
          </div>

          {/* Live Text Chat */}
          <div className="mokaya-card rounded-2xl overflow-hidden flex flex-col h-[360px]">
            <div className="px-4 py-3 border-b-2 border-zinc-900 flex items-center justify-between bg-white">
              <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-lg border border-zinc-200">
                <button
                  onClick={() => setChatTab('global')}
                  className={`px-3 py-1 text-xs font-bold rounded-md ${
                    chatTab === 'global' ? 'bg-zinc-900 text-white' : 'text-zinc-600'
                  }`}
                >
                  Chat Global
                </button>
                <button
                  onClick={() => setChatTab('clan')}
                  className={`px-3 py-1 text-xs font-bold rounded-md ${
                    chatTab === 'clan' ? 'bg-zinc-900 text-white' : 'text-zinc-600'
                  }`}
                >
                  Clan [{loadout.clanTag}]
                </button>
              </div>
              <span className="text-xs text-zinc-500">En vivo</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-zinc-50">
              {filteredMessages.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-8">
                  Aún no hay mensajes en este canal. Saluda a tu crew.
                </p>
              ) : (
                filteredMessages.map((msg) => (
                  <div key={msg.id} className="text-xs leading-relaxed">
                    <span className="font-mono-tabular font-bold text-[#8B7CE8] mr-1">
                      [{msg.clanTag}]
                    </span>
                    <span className="font-bold text-zinc-900 mr-1.5">{msg.sender}:</span>
                    <span className="text-zinc-700">{msg.text}</span>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={handleSendChat}
              className="p-2.5 bg-white border-t-2 border-zinc-900 flex items-center gap-2"
            >
              <input
                type="text"
                maxLength={200}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Escribir en ${chatTab === 'global' ? 'Global' : `Clan ${loadout.clanTag}`}...`}
                className="flex-1 px-3 py-2 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-none focus:border-zinc-900"
              />
              <button
                type="submit"
                className="mokaya-btn bg-zinc-900 text-white p-2 rounded-xl"
                aria-label="Enviar mensaje"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
