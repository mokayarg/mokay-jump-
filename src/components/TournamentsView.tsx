import React, { useState } from 'react';
import { Award, Crown, ShieldCheck, Swords, Trophy } from 'lucide-react';
import {
  ARENA_STAGES,
  PETS,
  PetId,
  PlayerLoadout,
  computeStylePoints,
  getStyleRank,
} from '../data/mokayaData';
import { MascotVectorPortrait } from './VectorPortrait';
import { LeaderboardEntry, TournamentInfo } from '../hooks/useMokayaRealtime';

interface TournamentsViewProps {
  loadout: PlayerLoadout;
  leaderboard: LeaderboardEntry[];
  tournament: TournamentInfo | null;
  onStartTournamentMatch: (arenaId: string) => void;
  onRefreshState: () => void;
  onSetTournament: (t: TournamentInfo) => void;
}

export const TournamentsView: React.FC<TournamentsViewProps> = ({
  loadout,
  leaderboard,
  tournament,
  onStartTournamentMatch,
  onRefreshState,
  onSetTournament,
}) => {
  const [joining, setJoining] = useState(false);

  const isRegistered = Boolean(tournament?.participants.includes(loadout.playerName));
  const stylePts = computeStylePoints(loadout.clothes);
  const styleRank = getStyleRank(stylePts);

  const handleJoinTournament = async () => {
    setJoining(true);
    try {
      await fetch('/api/profile/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: loadout.playerName,
          elo: loadout.elo,
          wins: loadout.wins,
          losses: loadout.losses,
          stylePoints: stylePts,
          styleRank: styleRank.name,
          fighterId: loadout.petId,
          petId: loadout.petId,
          clanTag: loadout.clanTag,
        }),
      });
      const res = await fetch('/api/tournaments/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: loadout.playerName }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.tournament) onSetTournament(data.tournament);
      }
      onRefreshState();
    } finally {
      setJoining(false);
    }
  };

  const daysLeft = tournament
    ? Math.max(1, Math.ceil((tournament.endsAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : 4;
  const tourneyArena = ARENA_STAGES.find((a) => a.id === tournament?.district) ?? ARENA_STAGES[0];

  return (
    <div className="space-y-4 pb-3">
      {/* Weekly Tournament Card */}
      <section className="mokaya-card rounded-2xl overflow-hidden">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#FF6A3D]">
            <span className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4" /> Torneo Semanal
            </span>
            <span className="text-zinc-500">Quedan {daysLeft} días</span>
          </div>
          <h1 className="font-display font-extrabold text-xl text-zinc-900 leading-tight">
            {tournament?.title ?? 'Copa Semanal · Rhythm Hood Drop'}
          </h1>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Compite en duelos 1 vs 1 con física justa de torneo. Todos los personajes saltan con las mismas estadísticas base.
          </p>

          <div className="bg-amber-50 border-2 border-zinc-900 rounded-xl p-3 space-y-0.5">
            <div className="text-[11px] font-bold text-zinc-700 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              Recompensa Exclusiva (Cosmética)
            </div>
            <div className="font-display font-bold text-xs text-zinc-900">
              {tournament?.rewardName ?? 'Trofeo Bomber Dorada Artelia + Corona Chispa'}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
            {!isRegistered ? (
              <button
                onClick={handleJoinTournament}
                disabled={joining}
                className="mokaya-btn flex-1 bg-[#FF6A3D] text-white px-4 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {joining ? 'Inscribiendo...' : 'Inscribirse al Torneo'}
              </button>
            ) : (
              <button
                onClick={() => onStartTournamentMatch(tourneyArena.id)}
                className="mokaya-btn flex-1 bg-zinc-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Swords className="w-4 h-4 text-[#FF6A3D]" /> Jugar Ronda
              </button>
            )}
            <span className="text-xs font-medium text-zinc-600 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              {tournament?.participants.length ?? 6}
            </span>
          </div>
        </div>

        {/* Bracket */}
        <div className="bg-zinc-950 text-white p-3.5 space-y-2 border-t-2 border-zinc-900">
          <div className="flex items-center justify-between">
            <span className="font-display font-bold text-xs">Llave · {tourneyArena.name}</span>
          </div>
          <div className="space-y-1.5">
            {(tournament?.matches ?? []).map((m) => (
              <div
                key={m.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 flex items-center justify-between text-[11px] gap-2"
              >
                <span className="text-zinc-400 font-semibold w-14 shrink-0 truncate">{m.round}</span>
                <div className="flex-1 truncate font-medium">
                  <span className={m.winner === m.playerA ? 'text-amber-300 font-bold' : ''}>
                    {m.playerA}
                  </span>{' '}
                  <span className="text-zinc-500">vs</span>{' '}
                  <span className={m.winner === m.playerB ? 'text-amber-300 font-bold' : ''}>
                    {m.playerB}
                  </span>
                </div>
                <span className="font-mono-tabular text-[10px] text-emerald-400 shrink-0">
                  {m.winner ? `✓ ${m.winner}` : 'Pendiente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Global Ranking Leaderboard (Android Card List) */}
      <section className="mokaya-card rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b-2 border-zinc-900 flex items-center justify-between gap-2 bg-white">
          <div>
            <h2 className="font-display font-extrabold text-base flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-500" />
              Ranking Global
            </h2>
            <p className="text-[11px] text-zinc-500">Ordenado por ELO competitivo</p>
          </div>
          <button
            onClick={onRefreshState}
            className="text-xs font-bold underline text-zinc-700 hover:text-zinc-900"
          >
            Actualizar
          </button>
        </div>

        <div className="divide-y divide-zinc-200">
          {leaderboard.map((row, index) => {
            const pet =
              PETS.find((p) => p.id === row.petId || p.id === row.fighterId) ?? PETS[0];
            const isMe = row.playerName.toLowerCase() === loadout.playerName.toLowerCase();
            return (
              <div
                key={row.playerName}
                className={`px-3.5 py-2.5 flex items-center justify-between gap-2.5 ${
                  isMe ? 'bg-orange-50/80' : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono-tabular font-extrabold text-xs text-zinc-500 w-5 shrink-0">
                    #{index + 1}
                  </span>
                  <MascotVectorPortrait
                    petId={pet.id as PetId}
                    size={32}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-display font-bold text-xs text-zinc-900 truncate">
                      {row.playerName}
                      {isMe && <span className="text-[#FF6A3D] ml-1">(Tú)</span>}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate">
                      [{row.clanTag || 'MOKAY'}] · {row.styleRank}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono-tabular font-extrabold text-xs text-zinc-900">
                    {row.elo} ELO
                  </div>
                  <div className="font-mono-tabular text-[10px] text-zinc-500">
                    {row.wins}V / {row.losses}D
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
