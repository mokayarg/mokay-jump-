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

interface SocialHubProps {
  loadout: PlayerLoadout;
  onUpdateLoadout: (updater: (prev: PlayerLoadout) => PlayerLoadout) => void;
  selectedArenaId: string;
  clans: ClanInfo[];
  onSetClans: (clans: ClanInfo[]) => void;
  chatMessages: ChatMessage[];
  onSendChat: (channel: string, text: string) => void;
  onGoToQuickMatch: () => void;
  // Friends & Dual Races
  friends: FriendProfile[];
  onlinePlayers: OnlinePlayerSummary[];
  leaderboard: LeaderboardEntry[];
  duelStatusNotice: string | null;
  roomError: string | null;
  onAddFriend: (friendName: string) => Promise<{ ok: boolean; error?: string }>;
  onRemoveFriend: (friendName: string) => void;
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

  // Discover players online right now or on global leaderboard not yet in friends
  const discoveryCandidates = [
    ...onlinePlayers
      .filter((p) => p.playerName.toLowerCase() !== meLower && !friendNameSet.has(p.playerName.toLowerCase()))
      .map((p) => ({
        playerName: p.playerName,
        clanTag: p.clanTag,
        petId: (p.petId as PetId) || 'mokay-fosforo',
        online: true,
        clientId: p.id,
      })),
    ...leaderboard
      .filter(
        (lb) =>
          lb.playerName.toLowerCase() !== meLower &&
          !friendNameSet.has(lb.playerName.toLowerCase()) &&
          !onlinePlayers.some((op) => op.playerName.toLowerCase() === lb.playerName.toLowerCase())
      )
      .slice(0, 6)
      .map((lb) => ({
        playerName: lb.playerName,
        clanTag: lb.clanTag,
        petId: (lb.petId as PetId) || 'mokay-fosforo',
        online: false,
        clientId: null,
      })),
  ];

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
                        onClick={() => onRemoveFriend(friend.playerName)}
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

          {/* Discover Online / Leaderboard Players */}
          {discoveryCandidates.length > 0 && (
            <div className="mokaya-card rounded-2xl p-4 space-y-2.5">
              <h3 className="font-display font-bold text-sm text-zinc-900">
                Jugadores Activos para Agregar
              </h3>
              <div className="space-y-2">
                {discoveryCandidates.map((cand) => (
                  <div
                    key={cand.playerName}
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
                          {cand.online ? 'Conectado ahora' : 'Ranking Global'}
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
