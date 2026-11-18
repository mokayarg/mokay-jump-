import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'mokaya-state.json');

interface LeaderboardEntry {
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

interface Clan {
  tag: string;
  name: string;
  district: string;
  motto: string;
  points: number;
  members: string[];
}

interface TournamentMatch {
  id: string;
  round: 'Cuartos' | 'Semifinal' | 'Final';
  playerA: string;
  playerB: string;
  winner: string | null;
}

interface TournamentState {
  id: string;
  title: string;
  district: string;
  rewardName: string;
  endsAt: number;
  participants: string[];
  matches: TournamentMatch[];
}

interface ChatMessage {
  id: string;
  channel: string;
  sender: string;
  clanTag: string;
  text: string;
  timestamp: number;
}

interface PersistedState {
  leaderboard: LeaderboardEntry[];
  clans: Clan[];
  tournament: TournamentState;
  chatMessages: ChatMessage[];
  friends: Record<string, string[]>;
}

function createInitialState(): PersistedState {
  const now = Date.now();
  return {
    leaderboard: [
      {
        playerName: 'ValenFlow',
        elo: 1580,
        wins: 42,
        losses: 9,
        stylePoints: 720,
        styleRank: 'Leyenda Chispa Original',
        fighterId: 'bloom',
        petId: 'laughing-cat',
        clanTag: 'BEAT',
        updatedAt: now - 3600000,
      },
      {
        playerName: 'KiroChispa',
        elo: 1495,
        wins: 35,
        losses: 11,
        stylePoints: 610,
        styleRank: 'Icono de Mokaya',
        fighterId: 'mokay-fosforo',
        petId: 'sparky',
        clanTag: 'CHISPA',
        updatedAt: now - 7200000,
      },
      {
        playerName: 'NoraInk30',
        elo: 1430,
        wins: 29,
        losses: 10,
        stylePoints: 495,
        styleRank: 'Coleccionista Drop',
        fighterId: 'mokay-caja',
        petId: 'tintin',
        clanTag: 'TINTA',
        updatedAt: now - 5400000,
      },
      {
        playerName: 'DinoRex_AR',
        elo: 1360,
        wins: 24,
        losses: 12,
        stylePoints: 560,
        styleRank: 'Icono de Mokaya',
        fighterId: 'street-dino',
        petId: 'laughing-cat',
        clanTag: 'VIVA',
        updatedAt: now - 9000000,
      },
      {
        playerName: 'SombraPunk',
        elo: 1310,
        wins: 19,
        losses: 10,
        stylePoints: 430,
        styleRank: 'Coleccionista Drop',
        fighterId: 'molotov',
        petId: 'nubi',
        clanTag: 'CHISPA',
        updatedAt: now - 12000000,
      },
      {
        playerName: 'BirdySky',
        elo: 1275,
        wins: 15,
        losses: 8,
        stylePoints: 340,
        styleRank: 'Estilo Fresco',
        fighterId: 'birdy',
        petId: 'nubi',
        clanTag: 'NUBE',
        updatedAt: now - 15000000,
      },
    ],
    clans: [
      {
        tag: 'CHISPA',
        name: 'Guardianes de la Chispa',
        district: 'Plaza Infinita',
        motto: 'Pura técnica, cero excusas.',
        points: 2840,
        members: ['KiroChispa', 'SombraPunk', 'MokayerPro'],
      },
      {
        tag: 'BEAT',
        name: 'Rhythm Hood Crew',
        district: 'Rhythm Hood',
        motto: 'Cada combo sigue el compás.',
        points: 2610,
        members: ['ValenFlow', 'FlokoBeats'],
      },
      {
        tag: 'VIVA',
        name: 'Arena Viva Titans',
        district: 'Arena Viva',
        motto: 'Disciplina de torneo en cada ronda.',
        points: 2190,
        members: ['DinoRex_AR', 'MareaSurf'],
      },
      {
        tag: 'TINTA',
        name: 'Club Rubber-Hose',
        district: 'Tintópolis',
        motto: 'Blanco, negro y reflejos puros.',
        points: 1980,
        members: ['NoraInk30'],
      },
    ],
    tournament: {
      id: 'copa-rhythm-01',
      title: 'Copa Semanal · Rhythm Hood Drop',
      district: 'rhythm-hood',
      rewardName: 'Trofeo Bomber Dorada Artelia + Corona Chispa',
      endsAt: now + 4 * 24 * 60 * 60 * 1000,
      participants: ['ValenFlow', 'KiroChispa', 'NoraInk30', 'DinoRex_AR', 'SombraPunk', 'BirdySky'],
      matches: [
        { id: 'q1', round: 'Cuartos', playerA: 'ValenFlow', playerB: 'BirdySky', winner: 'ValenFlow' },
        { id: 'q2', round: 'Cuartos', playerA: 'DinoRex_AR', playerB: 'SombraPunk', winner: 'DinoRex_AR' },
        { id: 'q3', round: 'Cuartos', playerA: 'KiroChispa', playerB: 'NoraInk30', winner: 'KiroChispa' },
        { id: 'q4', round: 'Cuartos', playerA: 'Tú (Mokayer)', playerB: 'Bot Torneo', winner: null },
        { id: 's1', round: 'Semifinal', playerA: 'ValenFlow', playerB: 'DinoRex_AR', winner: null },
        { id: 's2', round: 'Semifinal', playerA: 'KiroChispa', playerB: 'Ganador Q4', winner: null },
        { id: 'f1', round: 'Final', playerA: 'Ganador S1', playerB: 'Ganador S2', winner: null },
      ],
    },
    chatMessages: [
      {
        id: 'm1',
        channel: 'global',
        sender: 'ValenFlow',
        clanTag: 'BEAT',
        text: '¿Quién se arma un 1v1 en Rhythm Hood? Sala rápida abierta.',
        timestamp: now - 420000,
      },
      {
        id: 'm2',
        channel: 'global',
        sender: 'KiroChispa',
        clanTag: 'CHISPA',
        text: 'Recuerden que la ropa solo desbloquea efectos visuales, ¡pura habilidad en torneo!',
        timestamp: now - 180000,
      },
    ],
    friends: {
      mokayerpro: ['ValenFlow', 'KiroChispa'],
    },
  };
}

function loadState(): PersistedState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      const initial = createInitialState();
      return {
        leaderboard: parsed.leaderboard ?? initial.leaderboard,
        clans: parsed.clans ?? initial.clans,
        tournament: parsed.tournament ?? initial.tournament,
        chatMessages: parsed.chatMessages ?? initial.chatMessages,
        friends: parsed.friends ?? initial.friends,
      };
    }
  } catch (err) {
    console.warn('Could not read persisted state, using fresh seed:', err);
  }
  return createInitialState();
}

function saveState(state: PersistedState) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.warn('Could not persist state to disk:', err);
  }
}

const db = loadState();

interface ClientSession {
  id: string;
  ws: WebSocket;
  playerName: string;
  clanTag: string;
  roomCode: string | null;
  voiceChannel: string | null;
  micActive: boolean;
  loadout: Record<string, unknown> | null;
}

interface MatchRoom {
  code: string;
  arenaId: string;
  hostId: string;
  guestId: string | null;
  isPublic: boolean;
  createdAt: number;
}

const clients = new Map<string, ClientSession>();
const rooms = new Map<string, MatchRoom>();
let matchmakingQueue: string[] = [];

function getOpenRoomsPayload() {
  const list: Array<{
    code: string;
    arenaId: string;
    hostName: string;
    hostPetId: string;
    hostAvatar: Record<string, unknown> | null;
    hostClothes: Record<string, string> | null;
    hostClanTag: string;
    createdAt: number;
  }> = [];
  for (const room of rooms.values()) {
    if (!room.guestId && room.isPublic) {
      const host = clients.get(room.hostId);
      if (host) {
        const petId =
          typeof host.loadout?.petId === 'string'
            ? host.loadout.petId
            : 'mokay-fosforo';
        const hostAvatar =
          host.loadout?.avatar && typeof host.loadout.avatar === 'object'
            ? (host.loadout.avatar as Record<string, unknown>)
            : null;
        const hostClothes =
          host.loadout?.clothes && typeof host.loadout.clothes === 'object'
            ? (host.loadout.clothes as Record<string, string>)
            : null;
        list.push({
          code: room.code,
          arenaId: room.arenaId,
          hostName: host.playerName,
          hostPetId: petId,
          hostAvatar,
          hostClothes,
          hostClanTag: host.clanTag,
          createdAt: room.createdAt,
        });
      }
    }
  }
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

function broadcastOpenRooms() {
  const openRooms = getOpenRoomsPayload();
  for (const client of clients.values()) {
    sendJson(client.ws, { type: 'rooms:list', rooms: openRooms });
  }
}

function randomRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 4; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(out) ? randomRoomCode() : out;
}

function sendJson(ws: WebSocket, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastGlobalPresence() {
  const onlinePlayers = Array.from(clients.values()).map((c) => ({
    id: c.id,
    playerName: c.playerName,
    clanTag: c.clanTag,
    petId: typeof c.loadout?.petId === 'string' ? c.loadout.petId : 'mokay-fosforo',
    roomCode: c.roomCode,
    voiceChannel: c.voiceChannel,
    micActive: c.micActive,
  }));

  for (const client of clients.values()) {
    sendJson(client.ws, {
      type: 'presence:update',
      onlineCount: clients.size,
      players: onlinePlayers,
    });
  }
}

function buildFriendsList(playerName: string) {
  const key = playerName.trim().toLowerCase();
  const names = db.friends[key] ?? [];
  return names.map((friendName) => {
    const fKey = friendName.toLowerCase();
    const live = Array.from(clients.values()).find(
      (c) => c.playerName.toLowerCase() === fKey
    );
    const lb = db.leaderboard.find((e) => e.playerName.toLowerCase() === fKey);
    const livePetId =
      typeof live?.loadout?.petId === 'string' ? live.loadout.petId : undefined;
    return {
      playerName: live?.playerName ?? lb?.playerName ?? friendName,
      online: Boolean(live),
      clientId: live?.id ?? null,
      inRoom: Boolean(live?.roomCode),
      clanTag: live?.clanTag ?? lb?.clanTag ?? 'CHISPA',
      petId: livePetId ?? lb?.petId ?? 'mokay-fosforo',
      elo: lb?.elo ?? 1200,
      wins: lb?.wins ?? 0,
    };
  });
}

function broadcastToRoom(roomCode: string, payload: unknown, excludeClientId?: string) {
  const room = rooms.get(roomCode);
  if (!room) return;
  for (const client of clients.values()) {
    if (client.roomCode === roomCode && client.id !== excludeClientId) {
      sendJson(client.ws, payload);
    }
  }
}

function broadcastVoiceChannel(channel: string) {
  const participants = Array.from(clients.values())
    .filter((c) => c.voiceChannel === channel)
    .map((c) => ({
      id: c.id,
      playerName: c.playerName,
      clanTag: c.clanTag,
      micActive: c.micActive,
    }));

  for (const client of clients.values()) {
    if (client.voiceChannel === channel) {
      sendJson(client.ws, {
        type: 'voice:participants',
        channel,
        participants,
      });
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, online: clients.size });
  });

  app.get('/api/state', (_req, res) => {
    const sortedLeaderboard = [...db.leaderboard].sort((a, b) => b.elo - a.elo).slice(0, 30);
    const sortedClans = [...db.clans].sort((a, b) => b.points - a.points);
    res.json({
      leaderboard: sortedLeaderboard,
      clans: sortedClans,
      tournament: db.tournament,
      chatMessages: db.chatMessages.slice(-40),
      onlineCount: clients.size,
    });
  });

  app.post('/api/profile/sync', (req, res) => {
    const { playerName, elo, wins, losses, stylePoints, styleRank, fighterId, petId, clanTag } = req.body ?? {};
    if (!playerName || typeof playerName !== 'string') {
      res.status(400).json({ error: 'playerName requerido' });
      return;
    }
    const cleanName = playerName.trim().slice(0, 20);
    const existingIdx = db.leaderboard.findIndex((p) => p.playerName.toLowerCase() === cleanName.toLowerCase());
    const entry: LeaderboardEntry = {
      playerName: cleanName,
      elo: typeof elo === 'number' ? elo : 1200,
      wins: typeof wins === 'number' ? wins : 0,
      losses: typeof losses === 'number' ? losses : 0,
      stylePoints: typeof stylePoints === 'number' ? stylePoints : 0,
      styleRank: typeof styleRank === 'string' ? styleRank : 'Novato del Barrio',
      fighterId: typeof fighterId === 'string' ? fighterId : 'mokay-fosforo',
      petId: typeof petId === 'string' ? petId : 'laughing-cat',
      clanTag: typeof clanTag === 'string' ? clanTag : 'CHISPA',
      updatedAt: Date.now(),
    };
    if (existingIdx >= 0) {
      db.leaderboard[existingIdx] = { ...db.leaderboard[existingIdx], ...entry };
    } else {
      db.leaderboard.push(entry);
    }
    saveState(db);
    res.json({ ok: true, entry });
  });

  app.post('/api/match/result', (req, res) => {
    const { playerName, won, isTournament, stylePoints, styleRank, fighterId, petId, clanTag } = req.body ?? {};
    if (!playerName) {
      res.status(400).json({ error: 'playerName requerido' });
      return;
    }
    const cleanName = String(playerName).trim().slice(0, 20);
    let entry = db.leaderboard.find((p) => p.playerName.toLowerCase() === cleanName.toLowerCase());
    if (!entry) {
      entry = {
        playerName: cleanName,
        elo: 1200,
        wins: 0,
        losses: 0,
        stylePoints: stylePoints ?? 100,
        styleRank: styleRank ?? 'Novato del Barrio',
        fighterId: fighterId ?? 'mokay-fosforo',
        petId: petId ?? 'laughing-cat',
        clanTag: clanTag ?? 'CHISPA',
        updatedAt: Date.now(),
      };
      db.leaderboard.push(entry);
    }

    const delta = won ? 24 : -14;
    entry.elo = Math.max(800, entry.elo + delta);
    entry.wins += won ? 1 : 0;
    entry.losses += won ? 0 : 1;
    entry.stylePoints = stylePoints ?? entry.stylePoints;
    entry.styleRank = styleRank ?? entry.styleRank;
    entry.fighterId = fighterId ?? entry.fighterId;
    entry.petId = petId ?? entry.petId;
    entry.clanTag = clanTag ?? entry.clanTag;
    entry.updatedAt = Date.now();

    if (won && entry.clanTag) {
      const clan = db.clans.find((c) => c.tag === entry!.clanTag);
      if (clan) {
        clan.points += isTournament ? 80 : 35;
      }
    }

    if (isTournament && won) {
      const q4 = db.tournament.matches.find((m) => m.id === 'q4');
      if (q4 && !q4.winner) {
        q4.playerA = cleanName;
        q4.winner = cleanName;
        const s2 = db.tournament.matches.find((m) => m.id === 's2');
        if (s2) s2.playerB = cleanName;
      } else {
        const s2 = db.tournament.matches.find((m) => m.id === 's2');
        if (s2 && !s2.winner) {
          s2.winner = cleanName;
          const f1 = db.tournament.matches.find((m) => m.id === 'f1');
          if (f1) f1.playerB = cleanName;
        }
      }
    }

    saveState(db);
    res.json({
      ok: true,
      entry,
      leaderboard: [...db.leaderboard].sort((a, b) => b.elo - a.elo).slice(0, 30),
      clans: [...db.clans].sort((a, b) => b.points - a.points),
      tournament: db.tournament,
    });
  });

  app.post('/api/clans', (req, res) => {
    const { tag, name, district, motto, playerName } = req.body ?? {};
    if (!tag || !name || !playerName) {
      res.status(400).json({ error: 'Completa tag, nombre y jugador.' });
      return;
    }
    const cleanTag = String(tag).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (cleanTag.length < 2) {
      res.status(400).json({ error: 'El tag debe tener al menos 2 caracteres.' });
      return;
    }
    if (db.clans.some((c) => c.tag === cleanTag)) {
      res.status(409).json({ error: 'Ese tag de clan ya existe.' });
      return;
    }
    const newClan: Clan = {
      tag: cleanTag,
      name: String(name).trim().slice(0, 28),
      district: String(district || 'Plaza Infinita'),
      motto: String(motto || 'Creatividad y respeto en la arena.').slice(0, 70),
      points: 100,
      members: [String(playerName).trim()],
    };
    db.clans.forEach((c) => {
      c.members = c.members.filter((m) => m !== playerName);
    });
    db.clans.push(newClan);
    saveState(db);
    res.json({ ok: true, clan: newClan, clans: [...db.clans].sort((a, b) => b.points - a.points) });
  });

  app.post('/api/clans/join', (req, res) => {
    const { tag, playerName } = req.body ?? {};
    const clan = db.clans.find((c) => c.tag === tag);
    if (!clan || !playerName) {
      res.status(404).json({ error: 'Clan no encontrado.' });
      return;
    }
    db.clans.forEach((c) => {
      c.members = c.members.filter((m) => m !== playerName);
    });
    if (!clan.members.includes(playerName)) {
      clan.members.push(playerName);
    }
    saveState(db);
    res.json({ ok: true, clan, clans: [...db.clans].sort((a, b) => b.points - a.points) });
  });

  app.post('/api/tournaments/join', (req, res) => {
    const { playerName } = req.body ?? {};
    if (!playerName) {
      res.status(400).json({ error: 'playerName requerido' });
      return;
    }
    if (!db.tournament.participants.includes(playerName)) {
      db.tournament.participants.push(playerName);
    }
    const q4 = db.tournament.matches.find((m) => m.id === 'q4');
    if (q4 && !q4.winner) {
      q4.playerA = playerName;
    }
    saveState(db);
    res.json({ ok: true, tournament: db.tournament });
  });

  app.get('/api/friends/:playerName', (req, res) => {
    const clean = String(req.params.playerName || '').trim().slice(0, 20);
    if (!clean) {
      res.status(400).json({ error: 'playerName requerido' });
      return;
    }
    res.json({ friends: buildFriendsList(clean) });
  });

  app.post('/api/friends/add', (req, res) => {
    const { playerName, friendName } = req.body ?? {};
    const me = String(playerName || '').trim().slice(0, 20);
    const target = String(friendName || '').trim().slice(0, 20);
    if (!me || !target) {
      res.status(400).json({ error: 'Escribe el nombre del jugador.' });
      return;
    }
    if (me.toLowerCase() === target.toLowerCase()) {
      res.status(400).json({ error: 'No puedes agregarte a ti mismo.' });
      return;
    }
    const meKey = me.toLowerCase();
    const targetKey = target.toLowerCase();
    const liveTarget = Array.from(clients.values()).find(
      (c) => c.playerName.toLowerCase() === targetKey
    );
    const lbTarget = db.leaderboard.find((e) => e.playerName.toLowerCase() === targetKey);
    const canonicalTarget = liveTarget?.playerName ?? lbTarget?.playerName ?? target;

    const myList = db.friends[meKey] ?? [];
    if (!myList.some((n) => n.toLowerCase() === targetKey)) {
      myList.push(canonicalTarget);
    }
    db.friends[meKey] = myList;

    const targetList = db.friends[targetKey] ?? [];
    if (!targetList.some((n) => n.toLowerCase() === meKey)) {
      targetList.push(me);
    }
    db.friends[targetKey] = targetList;

    saveState(db);
    res.json({ ok: true, friends: buildFriendsList(me) });
  });

  app.post('/api/friends/remove', (req, res) => {
    const { playerName, friendName } = req.body ?? {};
    const me = String(playerName || '').trim().slice(0, 20);
    const target = String(friendName || '').trim().slice(0, 20);
    if (!me || !target) {
      res.status(400).json({ error: 'Datos requeridos.' });
      return;
    }
    const meKey = me.toLowerCase();
    const targetKey = target.toLowerCase();
    db.friends[meKey] = (db.friends[meKey] ?? []).filter(
      (n) => n.toLowerCase() !== targetKey
    );
    saveState(db);
    res.json({ ok: true, friends: buildFriendsList(me) });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    try {
      const reqUrl = new URL(req.url || '/', 'http://localhost');
      if (reqUrl.pathname === '/ws') {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req);
        });
      } else if (reqUrl.pathname === '/vite-ws') {
        // Handled by Vite's attached wsServer upgrade listener
        return;
      } else {
        socket.destroy();
      }
    } catch {
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    const clientId = `p_${Math.random().toString(36).slice(2, 10)}`;
    const session: ClientSession = {
      id: clientId,
      ws,
      playerName: `Mokayer_${clientId.slice(2, 6)}`,
      clanTag: 'CHISPA',
      roomCode: null,
      voiceChannel: null,
      micActive: false,
      loadout: null,
    };
    clients.set(clientId, session);

    sendJson(ws, { type: 'session:init', clientId });
    sendJson(ws, { type: 'rooms:list', rooms: getOpenRoomsPayload() });
    broadcastGlobalPresence();

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        switch (msg.type) {
          case 'net:ping': {
            sendJson(ws, { type: 'net:pong', ts: msg.ts });
            break;
          }

          case 'auth:hello': {
            if (msg.playerName) session.playerName = String(msg.playerName).slice(0, 20);
            if (msg.clanTag) session.clanTag = String(msg.clanTag).slice(0, 6);
            if (msg.loadout) session.loadout = msg.loadout;
            broadcastGlobalPresence();
            broadcastOpenRooms();
            break;
          }

          case 'room:create': {
            if (session.roomCode) {
              const oldCode = session.roomCode;
              broadcastToRoom(oldCode, { type: 'room:opponent-left' }, clientId);
              const oldRoom = rooms.get(oldCode);
              if (oldRoom && oldRoom.hostId === clientId) rooms.delete(oldCode);
              session.roomCode = null;
            }
            const code = randomRoomCode();
            const isPublic = msg.isPublic !== false;
            const room: MatchRoom = {
              code,
              arenaId: msg.arenaId || 'rhythm-hood',
              hostId: clientId,
              guestId: null,
              isPublic,
              createdAt: Date.now(),
            };
            rooms.set(code, room);
            session.roomCode = code;
            if (msg.loadout) session.loadout = msg.loadout;
            sendJson(ws, { type: 'room:created', code, arenaId: room.arenaId, isPublic });
            broadcastGlobalPresence();
            broadcastOpenRooms();
            break;
          }

          case 'room:join': {
            const code = String(msg.code || '').toUpperCase().trim();
            const room = rooms.get(code);
            if (!room) {
              sendJson(ws, { type: 'room:error', error: 'Sala no encontrada o expirada.' });
              break;
            }
            if (room.guestId && room.guestId !== clientId && room.hostId !== clientId) {
              sendJson(ws, { type: 'room:error', error: 'La sala ya está llena (1 vs 1).' });
              break;
            }
            if (room.hostId === clientId) {
              sendJson(ws, { type: 'room:error', error: 'No puedes unirte a tu propia sala.' });
              break;
            }
            const host = clients.get(room.hostId);
            if (!host) {
              rooms.delete(code);
              sendJson(ws, { type: 'room:error', error: 'El anfitrión abandonó la sala.' });
              broadcastOpenRooms();
              break;
            }
            room.guestId = clientId;
            session.roomCode = code;
            if (msg.loadout) session.loadout = msg.loadout;

            sendJson(host.ws, {
              type: 'room:ready',
              code,
              role: 'host',
              arenaId: room.arenaId,
              opponentId: clientId,
              opponentName: session.playerName,
              opponentLoadout: session.loadout,
            });
            sendJson(ws, {
              type: 'room:ready',
              code,
              role: 'guest',
              arenaId: room.arenaId,
              opponentId: host.id,
              opponentName: host.playerName,
              opponentLoadout: host.loadout,
            });
            broadcastGlobalPresence();
            broadcastOpenRooms();
            break;
          }

          case 'room:leave': {
            if (session.roomCode) {
              const code = session.roomCode;
              broadcastToRoom(code, { type: 'room:opponent-left' }, clientId);
              const room = rooms.get(code);
              if (room) {
                if (room.hostId === clientId) rooms.delete(code);
                else if (room.guestId === clientId) room.guestId = null;
              }
              session.roomCode = null;
              broadcastGlobalPresence();
              broadcastOpenRooms();
            }
            break;
          }

          case 'matchmaking:queue': {
            matchmakingQueue = matchmakingQueue.filter((id) => id !== clientId && clients.has(id));
            if (msg.loadout) session.loadout = msg.loadout;
            if (matchmakingQueue.length > 0) {
              const opponentId = matchmakingQueue.shift()!;
              const opponent = clients.get(opponentId);
              if (opponent && opponent.id !== clientId) {
                const code = randomRoomCode();
                const arenaId = msg.arenaId || 'arena-viva';
                rooms.set(code, {
                  code,
                  arenaId,
                  hostId: opponent.id,
                  guestId: clientId,
                  isPublic: false,
                  createdAt: Date.now(),
                });
                opponent.roomCode = code;
                session.roomCode = code;
                sendJson(opponent.ws, {
                  type: 'room:ready',
                  code,
                  role: 'host',
                  arenaId,
                  opponentId: clientId,
                  opponentName: session.playerName,
                  opponentLoadout: session.loadout,
                });
                sendJson(ws, {
                  type: 'room:ready',
                  code,
                  role: 'guest',
                  arenaId,
                  opponentId: opponent.id,
                  opponentName: opponent.playerName,
                  opponentLoadout: opponent.loadout,
                });
                broadcastGlobalPresence();
                break;
              }
            }
            matchmakingQueue.push(clientId);
            sendJson(ws, { type: 'matchmaking:waiting' });
            break;
          }

          case 'matchmaking:cancel': {
            matchmakingQueue = matchmakingQueue.filter((id) => id !== clientId);
            break;
          }

          case 'duel:invite': {
            if (msg.loadout) session.loadout = msg.loadout;
            const targetName = String(msg.targetPlayerName || '').toLowerCase();
            const target =
              (msg.targetClientId ? clients.get(String(msg.targetClientId)) : undefined) ??
              Array.from(clients.values()).find(
                (c) => c.playerName.toLowerCase() === targetName && c.id !== clientId
              );
            if (!target) {
              sendJson(ws, {
                type: 'room:error',
                error: 'Tu amigo no está conectado en este momento.',
              });
              break;
            }
            if (target.id === clientId) {
              sendJson(ws, { type: 'room:error', error: 'No puedes retarte a ti mismo.' });
              break;
            }
            const arenaId = String(msg.arenaId || 'rhythm-hood');
            const fromPetId =
              typeof session.loadout?.petId === 'string'
                ? session.loadout.petId
                : 'mokay-fosforo';
            sendJson(target.ws, {
              type: 'duel:incoming',
              inviteId: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              fromClientId: clientId,
              fromName: session.playerName,
              fromClanTag: session.clanTag,
              fromPetId,
              arenaId,
            });
            sendJson(ws, {
              type: 'duel:invite-sent',
              targetName: target.playerName,
            });
            break;
          }

          case 'duel:accept': {
            if (msg.loadout) session.loadout = msg.loadout;
            const challenger = clients.get(String(msg.fromClientId || ''));
            if (!challenger) {
              sendJson(ws, {
                type: 'room:error',
                error: 'El amigo que envió el reto se desconectó.',
              });
              break;
            }
            // Clean up any previous room for either player
            for (const participant of [challenger, session]) {
              if (participant.roomCode) {
                const oldCode = participant.roomCode;
                const oldRoom = rooms.get(oldCode);
                if (oldRoom && oldRoom.hostId === participant.id) rooms.delete(oldCode);
                participant.roomCode = null;
              }
            }
            const code = randomRoomCode();
            const arenaId = String(msg.arenaId || 'rhythm-hood');
            rooms.set(code, {
              code,
              arenaId,
              hostId: challenger.id,
              guestId: clientId,
              isPublic: false,
              createdAt: Date.now(),
            });
            challenger.roomCode = code;
            session.roomCode = code;

            sendJson(challenger.ws, {
              type: 'room:ready',
              code,
              role: 'host',
              arenaId,
              opponentId: clientId,
              opponentName: session.playerName,
              opponentLoadout: session.loadout,
            });
            sendJson(ws, {
              type: 'room:ready',
              code,
              role: 'guest',
              arenaId,
              opponentId: challenger.id,
              opponentName: challenger.playerName,
              opponentLoadout: challenger.loadout,
            });
            broadcastGlobalPresence();
            broadcastOpenRooms();
            break;
          }

          case 'duel:decline': {
            const challenger = clients.get(String(msg.fromClientId || ''));
            if (challenger) {
              sendJson(challenger.ws, {
                type: 'duel:declined',
                byName: session.playerName,
              });
            }
            break;
          }

          case 'combat:sync': {
            if (session.roomCode) {
              broadcastToRoom(
                session.roomCode,
                {
                  type: 'combat:sync',
                  from: clientId,
                  payload: msg.payload,
                },
                clientId
              );
            }
            break;
          }

          case 'chat:send': {
            const text = String(msg.text || '').trim().slice(0, 220);
            if (!text) break;
            const channel = String(msg.channel || 'global');
            const chatMsg: ChatMessage = {
              id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              channel,
              sender: session.playerName,
              clanTag: session.clanTag,
              text,
              timestamp: Date.now(),
            };
            db.chatMessages.push(chatMsg);
            if (db.chatMessages.length > 100) {
              db.chatMessages = db.chatMessages.slice(-80);
            }
            saveState(db);
            for (const c of clients.values()) {
              sendJson(c.ws, { type: 'chat:message', message: chatMsg });
            }
            break;
          }

          case 'voice:join': {
            const channel = String(msg.channel || 'global');
            const prevChannel = session.voiceChannel;
            session.voiceChannel = channel;
            session.micActive = Boolean(msg.micActive);
            if (prevChannel && prevChannel !== channel) {
              broadcastVoiceChannel(prevChannel);
            }
            broadcastVoiceChannel(channel);
            // Notify existing peers in channel to initiate WebRTC offer
            for (const c of clients.values()) {
              if (c.voiceChannel === channel && c.id !== clientId) {
                sendJson(c.ws, {
                  type: 'rtc:peer-joined',
                  peerId: clientId,
                  playerName: session.playerName,
                });
              }
            }
            break;
          }

          case 'voice:leave': {
            const prevChannel = session.voiceChannel;
            session.voiceChannel = null;
            session.micActive = false;
            if (prevChannel) {
              for (const c of clients.values()) {
                if (c.voiceChannel === prevChannel) {
                  sendJson(c.ws, { type: 'rtc:peer-left', peerId: clientId });
                }
              }
              broadcastVoiceChannel(prevChannel);
            }
            break;
          }

          case 'voice:state': {
            session.micActive = Boolean(msg.micActive);
            if (session.voiceChannel) {
              broadcastVoiceChannel(session.voiceChannel);
            }
            break;
          }

          case 'rtc:signal': {
            const target = clients.get(msg.targetId);
            if (target) {
              sendJson(target.ws, {
                type: 'rtc:signal',
                fromId: clientId,
                fromName: session.playerName,
                signal: msg.signal,
              });
            }
            break;
          }
        }
      } catch (err) {
        console.error('WS message error:', err);
      }
    });

    ws.on('close', () => {
      matchmakingQueue = matchmakingQueue.filter((id) => id !== clientId);
      if (session.roomCode) {
        broadcastToRoom(session.roomCode, { type: 'room:opponent-left' }, clientId);
        const room = rooms.get(session.roomCode);
        if (room) {
          if (room.hostId === clientId) rooms.delete(session.roomCode);
          else if (room.guestId === clientId) room.guestId = null;
        }
      }
      if (session.voiceChannel) {
        const ch = session.voiceChannel;
        session.voiceChannel = null;
        for (const c of clients.values()) {
          if (c.voiceChannel === ch) {
            sendJson(c.ws, { type: 'rtc:peer-left', peerId: clientId });
          }
        }
        broadcastVoiceChannel(ch);
      }
      clients.delete(clientId);
      broadcastGlobalPresence();
      broadcastOpenRooms();
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        allowedHosts: true,
        ws: {
          server,
          path: '/vite-ws',
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Mokay Jump server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
