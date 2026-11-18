import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ARENA_STAGES,
  JUMP_ABILITIES,
  JUMP_BIOMES,
  JumpBiome,
  LEVEL_METERS,
  PETS,
  PetId,
  PlayerLoadout,
  VISUAL_SKILLS,
  computeStylePoints,
  getPetStage,
  getStyleRank,
} from '../data/mokayaData';
import {
  CollectibleCanvasKind,
  drawCollectibleIcon,
  drawMokayaJumper,
  getCachedBiomeImage,
  preloadMokayaSprites,
} from '../engine/fighterRenderer';
import { soundFx } from '../engine/soundFx';
import { FriendProfile, OpenRoomSummary, RoomMatchInfo } from '../hooks/useMokayaRealtime';
import { MascotVectorPortrait } from './VectorPortrait';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Compass,
  Copy,
  MapPin,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  X,
  Zap,
} from 'lucide-react';

interface MokayaJumpGameProps {
  loadout: PlayerLoadout;
  selectedArenaId: string;
  onSelectArena: (id: string) => void;
  tournamentMode: boolean;
  onExitTournamentMode: () => void;
  onGainPetXp: (xp: number, won: boolean) => void;
  onPlayingChange?: (playing: boolean) => void;
  onOpenCharacters?: () => void;
  onOpenStages?: () => void;
  connected: boolean;
  onlineCount: number;
  pingMs: number | null;
  friends: FriendProfile[];
  duelStatusNotice: string | null;
  onSendDuelInvite: (targetPlayerName: string, arenaId: string, targetClientId?: string | null) => void;
  openRooms: OpenRoomSummary[];
  createdRoomCode: string | null;
  roomError: string | null;
  matchmakingWaiting: boolean;
  activeRoom: RoomMatchInfo | null;
  combatHandlerRef: React.MutableRefObject<((payload: any) => void) | null>;
  onCreateRoom: (arenaId: string, isPublic: boolean) => void;
  onJoinRoom: (code: string) => void;
  onLeaveRoom: () => void;
  onQueueMatchmaking: (arenaId: string) => void;
  onCancelMatchmaking: () => void;
  onSendCombatSync: (payload: unknown) => void;
  onReportMatchResult: (
    won: boolean,
    isTournament: boolean,
    stylePoints: number,
    styleRank: string
  ) => void;
  voiceChannel: string | null;
  micMuted: boolean;
  micLevel: number;
  onJoinVoice: (channel: string) => void;
  onLeaveVoice: () => void;
  onToggleMic: () => void;
  // Google Account Sync
  isGoogleSignedIn?: boolean;
  authBusy?: boolean;
  onLoginGoogle?: () => void;
  onOpenFriendsTab?: () => void;
}

type GamePhase = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
type PlatformKind = 'solid' | 'moving' | 'fragile' | 'vanish';
type PowerUpKind = CollectibleCanvasKind;

interface Platform {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: PlatformKind;
  vx: number;
  hasSpring: boolean;
  springBounceAnim: number;
  broken: boolean;
  vanishAlpha: number;
  biomeIndex: number;
}

interface Collectible {
  id: number;
  x: number;
  y: number;
  kind: PowerUpKind;
  collected: boolean;
  bobOffset: number;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  vx: number;
  r: number;
  kind: 'drone' | 'static';
  alive: boolean;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

interface RivalState {
  meters: number;
  x: number;
  alive: boolean;
  petId: PetId;
  name: string;
}

const GAME_W = 440;
const GAME_H = 720;
const GRAVITY = 1700;
const BASE_JUMP_VY = -805;
const SPRING_JUMP_VY = -1280;
const BOOTS_JUMP_VY = -1045;
const JETPACK_VY = -1150;
const MOVE_ACCEL = 3050;
const MAX_VX = 420;
const BEST_METERS_KEY = 'mokaya_jump_best_meters_v1';

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getBiomeForMeters(
  meters: number,
  startBiomeIdx: number
): { biome: JumpBiome; index: number; cycle: number; levelNum: number; levelProgress: number } {
  const step = Math.floor(meters / LEVEL_METERS);
  const index = (startBiomeIdx + step) % JUMP_BIOMES.length;
  const cycle = Math.floor((startBiomeIdx + step) / JUMP_BIOMES.length) + 1;
  const levelNum = step + 1;
  const levelProgress = (meters % LEVEL_METERS) / LEVEL_METERS;
  return { biome: JUMP_BIOMES[index], index, cycle, levelNum, levelProgress };
}

export const MokayaJumpGame: React.FC<MokayaJumpGameProps> = ({
  loadout,
  selectedArenaId,
  onSelectArena,
  tournamentMode,
  onExitTournamentMode,
  onGainPetXp,
  onPlayingChange,
  onOpenCharacters,
  onOpenStages,
  connected,
  onlineCount,
  pingMs,
  friends,
  duelStatusNotice,
  onSendDuelInvite,
  openRooms,
  createdRoomCode,
  roomError,
  matchmakingWaiting,
  activeRoom,
  combatHandlerRef,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onQueueMatchmaking,
  onCancelMatchmaking,
  onSendCombatSync,
  onReportMatchResult,
  voiceChannel,
  micMuted,
  micLevel,
  onJoinVoice,
  onLeaveVoice,
  onToggleMic,
  isGoogleSignedIn = false,
  authBusy = false,
  onLoginGoogle,
  onOpenFriendsTab,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<GamePhase>('TITLE_MENU');
  const [muted, setMuted] = useState(false);
  const [tiltEnabled, setTiltEnabled] = useState(false);
  const [showOnlineSheet, setShowOnlineSheet] = useState(false);
  const [showAbilitiesSheet, setShowAbilitiesSheet] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isPublicRoom, setIsPublicRoom] = useState(true);

  const [bestMeters, setBestMeters] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(BEST_METERS_KEY) || '0') || 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    onPlayingChange?.(phase === 'PLAYING' || phase === 'PAUSED');
  }, [phase, onPlayingChange]);

  const [hud, setHud] = useState({
    meters: 0,
    score: 0,
    sparks: 0,
    combo: 1,
    biomeName: JUMP_BIOMES[0].name,
    biomeAccent: JUMP_BIOMES[0].accentColor,
    levelNum: 1,
    levelProgress: 0,
    jetpackSec: 0,
    bootsSec: 0,
    doubleJumps: 0,
    magnetSec: 0,
    shieldActive: false,
    laserSec: 0,
    shadesSec: 0,
    boomboxSec: 0,
    cycle: 1,
    rivalMeters: 0,
    rivalAlive: true,
    duelResult: null as null | 'win' | 'loss' | 'waiting',
  });

  const selectedChar = PETS.find((p) => p.id === loadout.petId) ?? PETS[0];
  const charStage = getPetStage(selectedChar, loadout.petXp);
  const stylePts = computeStylePoints(loadout.clothes);
  const styleRank = getStyleRank(stylePts);
  const visualSkill = VISUAL_SKILLS.find((v) => v.id === loadout.visualSkillId) ?? VISUAL_SKILLS[0];
  const activeStageMeta = JUMP_BIOMES.find((b) => b.id === selectedArenaId) ?? JUMP_BIOMES[0];

  const simRef = useRef({
    phase: 'TITLE_MENU' as GamePhase,
    rng: createRng(Date.now()),
    startBiomeIdx: 0,
    nextId: 1,
    player: {
      x: GAME_W / 2,
      y: GAME_H - 90,
      vx: 0,
      vy: BASE_JUMP_VY,
      facing: 1 as 1 | -1,
      scaleX: 1,
      scaleY: 1,
      tiltRad: 0,
      cryText: '',
      cryTimer: 0,
    },
    cameraY: 0,
    highestWorldY: GAME_H - 90,
    meters: 0,
    score: 0,
    sparks: 0,
    combo: 1,
    comboTimer: 0,
    biomeIndex: 0,
    prevBiomeIndex: 0,
    biomeFade: 1,
    biomeBannerText: '',
    biomeBannerTimer: 0,
    cycle: 1,
    levelNum: 1,
    // Abilities
    jetpackTimer: 0,
    bootsTimer: 0,
    doubleJumps: 0,
    magnetTimer: 0,
    shieldActive: false,
    laserTimer: 0,
    laserAutoCooldown: 0,
    shadesTimer: 0,
    boomboxTimer: 0,
    sonicRingTimer: 0,
    shootCooldown: 0,
    // World entities
    platforms: [] as Platform[],
    collectibles: [] as Collectible[],
    enemies: [] as Enemy[],
    projectiles: [] as Projectile[],
    particles: [] as Particle[],
    floatTexts: [] as FloatingText[],
    ambientParticles: Array.from({ length: 26 }, (_, i) => ({
      x: (i * 73) % GAME_W,
      y: (i * 119) % GAME_H,
      speed: 18 + (i % 5) * 10,
      size: 2 + (i % 4),
    })),
    highestGeneratedY: GAME_H - 60,
    lastEnemyY: GAME_H,
    nextBreatherMeters: 450,
    // Inputs
    leftHeld: false,
    rightHeld: false,
    dragTargetX: null as number | null,
    tiltVx: 0,
    // Multiplayer rival
    rival: null as RivalState | null,
    duelResult: null as null | 'win' | 'loss' | 'waiting',
    syncAccum: 0,
    reportedEnd: false,
  });

  useEffect(() => {
    preloadMokayaSprites();
  }, []);

  const spawnBurst = (x: number, y: number, color: string, count = 12, speed = 220) => {
    const s = simRef.current;
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const spd = speed * (0.4 + Math.random() * 0.7);
      s.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 40,
        size: 3 + Math.random() * 4,
        color,
        life: 0.45 + Math.random() * 0.25,
        maxLife: 0.7,
      });
    }
  };

  const addFloatText = (x: number, y: number, text: string, color = '#FFFFFF') => {
    simRef.current.floatTexts.push({ x, y, text, color, life: 1.05 });
  };

  // Smooth, progressive, non-frustrating level & platform generator
  const generatePlatformsUpTo = useCallback((targetWorldY: number) => {
    const s = simRef.current;
    const rng = s.rng;

    while (s.highestGeneratedY > targetWorldY) {
      const metersHere = Math.max(0, Math.round((GAME_H - 90 - s.highestGeneratedY) / 14));
      // Smooth non-linear curve: gentle early 0-900m, rich mid 900-3600m, capped fair mastery 3600m+
      const rawProgress = Math.min(1, metersHere / 3600);
      const difficulty = Math.pow(rawProgress, 0.85);
      const { index: biomeIdx } = getBiomeForMeters(metersHere, s.startBiomeIdx);

      // Guaranteed Breather Skyway every ~450m so long runs stay rewarding and never exhausting
      if (metersHere >= s.nextBreatherMeters) {
        s.nextBreatherMeters += 450;
        const restY = s.highestGeneratedY - 64;
        const leftX = 36 + rng() * 60;
        const rightX = GAME_W - 140 - rng() * 40;
        s.platforms.push(
          {
            id: s.nextId++,
            x: leftX,
            y: restY,
            w: 102,
            h: 16,
            kind: 'solid',
            vx: 0,
            hasSpring: true,
            springBounceAnim: 0,
            broken: false,
            vanishAlpha: 1,
            biomeIndex: biomeIdx,
          },
          {
            id: s.nextId++,
            x: rightX,
            y: restY - 12,
            w: 98,
            h: 16,
            kind: 'solid',
            vx: 0,
            hasSpring: false,
            springBounceAnim: 0,
            broken: false,
            vanishAlpha: 1,
            biomeIndex: biomeIdx,
          }
        );
        const abilityPool: PowerUpKind[] = [
          'boots',
          'shield',
          'jetpack',
          'magnet',
          'laser',
          'shades',
          'boombox',
        ];
        s.collectibles.push({
          id: s.nextId++,
          x: rightX + 49,
          y: restY - 38,
          kind: abilityPool[Math.floor(rng() * abilityPool.length)],
          collected: false,
          bobOffset: rng() * Math.PI * 2,
        });
        s.highestGeneratedY = restY - 12;
        continue;
      }

      // Guaranteed reachable vertical step (max 114px well inside base jump apex ~190px)
      const minStep = 52 + difficulty * 20;
      const maxStep = 82 + difficulty * 32;
      const stepY = minStep + rng() * (maxStep - minStep);
      const newY = s.highestGeneratedY - stepY;

      // Fair platform widths (never smaller than 68px)
      const platW = Math.max(68, Math.round(104 - difficulty * 32));
      const newX = 16 + rng() * (GAME_W - platW - 32);

      // Progressive platform types
      const roll = rng();
      let kind: PlatformKind = 'solid';
      if (metersHere > 160 && roll < 0.08 + difficulty * 0.22) {
        kind = 'moving';
      } else if (metersHere > 260 && roll < 0.17 + difficulty * 0.16) {
        kind = 'fragile';
      } else if (metersHere > 950 && roll < 0.24 + difficulty * 0.16) {
        kind = 'vanish';
      }

      const hasSpring = kind !== 'fragile' && rng() < (metersHere < 300 ? 0.16 : 0.12);
      const vx =
        kind === 'moving' ? (rng() < 0.5 ? -1 : 1) * (55 + difficulty * 105) : 0;

      s.platforms.push({
        id: s.nextId++,
        x: newX,
        y: newY,
        w: platW,
        h: 16,
        kind,
        vx,
        hasSpring,
        springBounceAnim: 0,
        broken: false,
        vanishAlpha: 1,
        biomeIndex: biomeIdx,
      });

      // Fragile platforms ALWAYS get a solid reachable sibling platform so there are zero impossible gaps
      if (kind === 'fragile') {
        const altW = Math.max(72, Math.round(92 - difficulty * 16));
        const onRight = newX < GAME_W * 0.45;
        const altX = onRight
          ? Math.min(GAME_W - altW - 14, newX + platW + 28 + rng() * 54)
          : Math.max(14, newX - altW - 28 - rng() * 54);
        s.platforms.push({
          id: s.nextId++,
          x: altX,
          y: newY - (rng() * 14 - 7),
          w: altW,
          h: 16,
          kind: 'solid',
          vx: 0,
          hasSpring: false,
          springBounceAnim: 0,
          broken: false,
          vanishAlpha: 1,
          biomeIndex: biomeIdx,
        });
      }

      // Spawn Streetwear Collectibles & Golden Chispas!
      const itemRoll = rng();
      if (!hasSpring && kind !== 'fragile') {
        if (itemRoll < 0.32) {
          s.collectibles.push({
            id: s.nextId++,
            x: newX + platW / 2,
            y: newY - 24,
            kind: 'spark',
            collected: false,
            bobOffset: rng() * Math.PI * 2,
          });
        } else if (itemRoll < 0.46) {
          const abilityPool: PowerUpKind[] = [
            'boots',
            'shield',
            'boots',
            'shield',
            'jetpack',
            'magnet',
            'laser',
            'shades',
            'boombox',
          ];
          const abKind = abilityPool[Math.floor(rng() * abilityPool.length)];
          s.collectibles.push({
            id: s.nextId++,
            x: newX + platW / 2,
            y: newY - 28,
            kind: abKind,
            collected: false,
            bobOffset: rng() * Math.PI * 2,
          });
        }
      }

      // Progressive enemies: only after 320m AND strictly spaced vertically (>= 260px)
      const verticalGapFromLastEnemy = s.lastEnemyY - newY;
      if (
        metersHere > 320 &&
        verticalGapFromLastEnemy >= 260 &&
        rng() < 0.08 + difficulty * 0.11
      ) {
        const eKind = metersHere < 700 || rng() < 0.65 ? 'drone' : 'static';
        s.enemies.push({
          id: s.nextId++,
          x: 42 + rng() * (GAME_W - 84),
          y: newY - 40,
          vx: eKind === 'drone' ? (rng() < 0.5 ? -1 : 1) * (48 + difficulty * 82) : 0,
          r: 19,
          kind: eKind,
          alive: true,
        });
        s.lastEnemyY = newY;
      }

      s.highestGeneratedY = newY;
    }
  }, []);

  const startNewRun = useCallback(
    (seedStr?: string) => {
      const s = simRef.current;
      const startIdx = Math.max(
        0,
        JUMP_BIOMES.findIndex((b) => b.id === selectedArenaId)
      );
      const seed = seedStr
        ? hashSeed(seedStr)
        : (Date.now() ^ Math.floor(Math.random() * 999999)) >>> 0;
      s.rng = createRng(seed);
      s.startBiomeIdx = startIdx;
      s.nextId = 1;
      s.cameraY = 0;
      s.highestWorldY = GAME_H - 90;
      s.meters = 0;
      s.score = 0;
      s.sparks = 0;
      s.combo = 1;
      s.comboTimer = 0;
      s.biomeIndex = startIdx;
      s.prevBiomeIndex = startIdx;
      s.biomeFade = 1;
      s.biomeBannerText = `NIVEL 1 · ${JUMP_BIOMES[startIdx].name}`;
      s.biomeBannerTimer = 2.4;
      s.cycle = 1;
      s.levelNum = 1;

      s.jetpackTimer = 0;
      s.bootsTimer = 0;
      s.doubleJumps = 0;
      s.magnetTimer = 0;
      s.shieldActive = false;
      s.laserTimer = 0;
      s.laserAutoCooldown = 0;
      s.shadesTimer = 0;
      s.boomboxTimer = 0;
      s.sonicRingTimer = 0;
      s.shootCooldown = 0;

      s.player = {
        x: GAME_W / 2,
        y: GAME_H - 90,
        vx: 0,
        vy: BASE_JUMP_VY,
        facing: 1,
        scaleX: 1,
        scaleY: 1,
        tiltRad: 0,
        cryText: selectedChar.cry,
        cryTimer: 1.0,
      };

      s.platforms = [
        {
          id: s.nextId++,
          x: 20,
          y: GAME_H - 52,
          w: GAME_W - 40,
          h: 18,
          kind: 'solid',
          vx: 0,
          hasSpring: false,
          springBounceAnim: 0,
          broken: false,
          vanishAlpha: 1,
          biomeIndex: startIdx,
        },
      ];
      s.collectibles = [];
      s.enemies = [];
      s.projectiles = [];
      s.particles = [];
      s.floatTexts = [];
      s.highestGeneratedY = GAME_H - 52;
      s.lastEnemyY = GAME_H - 52;
      s.nextBreatherMeters = 450;
      s.duelResult = null;
      s.reportedEnd = false;

      if (activeRoom) {
        s.rival = {
          meters: 0,
          x: GAME_W / 2,
          alive: true,
          petId: (activeRoom.opponentLoadout?.petId as PetId) || 'street-dino',
          name: activeRoom.opponentName || 'Rival',
        };
      } else {
        s.rival = null;
      }

      generatePlatformsUpTo(-GAME_H * 1.4);

      setShowOnlineSheet(false);
      setShowAbilitiesSheet(false);
      s.phase = 'PLAYING';
      setPhase('PLAYING');
      soundFx.playJump();
    },
    [activeRoom, generatePlatformsUpTo, selectedArenaId, selectedChar.cry]
  );

  const startedRoomCodeRef = useRef<string | null>(null);
  const activeRoomRef = useRef<RoomMatchInfo | null>(activeRoom);
  activeRoomRef.current = activeRoom;
  const onSendCombatSyncRef = useRef(onSendCombatSync);
  onSendCombatSyncRef.current = onSendCombatSync;

  useEffect(() => {
    const code = activeRoom?.code ?? null;
    if (code && startedRoomCodeRef.current !== code) {
      startedRoomCodeRef.current = code;
      startNewRun(code);
    } else if (!code) {
      startedRoomCodeRef.current = null;
    }
  }, [activeRoom?.code, startNewRun]);

  useEffect(() => {
    combatHandlerRef.current = (payload: any) => {
      if (!payload || typeof payload !== 'object') return;
      const s = simRef.current;
      if (!s.rival) return;
      if (typeof payload.meters === 'number') s.rival.meters = payload.meters;
      if (typeof payload.x === 'number') s.rival.x = payload.x;
      if (typeof payload.alive === 'boolean') s.rival.alive = payload.alive;

      const rivalPeak = s.rival.meters;

      // Authoritative finish from Firestore race winner (e.g. rival forfeited or fell behind)
      if (payload.forcedWin && s.duelResult !== 'win') {
        s.duelResult = 'win';
        if (!s.reportedEnd) {
          s.reportedEnd = true;
          soundFx.playKO(true);
          addFloatText(s.player.x, s.player.y - 80, '¡GANASTE LA CARRERA!', '#4ADE80');
          const gainedXp = 35 + Math.min(40, Math.floor(s.meters / 30));
          onGainPetXp(gainedXp, true);
          onReportMatchResult(true, tournamentMode, stylePts, styleRank.name);
        }
        return;
      }
      if (payload.forcedLoss && s.duelResult !== 'loss') {
        s.duelResult = 'loss';
        if (!s.reportedEnd) {
          s.reportedEnd = true;
          const gainedXp = 15 + Math.min(55, Math.floor(s.meters / 35) + Math.floor(s.sparks / 4));
          soundFx.playKO(false);
          onGainPetXp(gainedXp, false);
          onReportMatchResult(false, tournamentMode, stylePts, styleRank.name);
        }
        return;
      }

      // Dual Race: highest altitude wins, falling below loses!
      if (s.phase === 'PLAYING' && (!s.duelResult || s.duelResult === 'waiting')) {
        if (!s.rival.alive && s.meters > rivalPeak) {
          s.duelResult = 'win';
          s.reportedEnd = true;
          soundFx.playKO(true);
          addFloatText(s.player.x, s.player.y - 80, '¡GANASTE LA CARRERA!', '#4ADE80');
          const gainedXp = 35 + Math.min(40, Math.floor(s.meters / 30));
          onGainPetXp(gainedXp, true);
          onReportMatchResult(true, tournamentMode, stylePts, styleRank.name);
        }
      } else if (s.phase === 'GAME_OVER' && s.duelResult === 'waiting') {
        if (!s.rival.alive) {
          const won = s.meters >= rivalPeak;
          s.duelResult = won ? 'win' : 'loss';
          if (!s.reportedEnd) {
            s.reportedEnd = true;
            const gainedXp = 15 + Math.min(55, Math.floor(s.meters / 35) + Math.floor(s.sparks / 4));
            soundFx.playKO(won);
            onGainPetXp(won ? gainedXp + 20 : gainedXp, won);
            onReportMatchResult(won, tournamentMode, stylePts, styleRank.name);
          }
        } else if (rivalPeak > s.meters) {
          s.duelResult = 'loss';
          if (!s.reportedEnd) {
            s.reportedEnd = true;
            const gainedXp = 15 + Math.min(55, Math.floor(s.meters / 35) + Math.floor(s.sparks / 4));
            soundFx.playKO(false);
            onGainPetXp(gainedXp, false);
            onReportMatchResult(false, tournamentMode, stylePts, styleRank.name);
          }
        }
      }
    };
    return () => {
      combatHandlerRef.current = null;
    };
  }, [combatHandlerRef, onGainPetXp, onReportMatchResult, stylePts, styleRank.name, tournamentMode]);

  const fireShotOrDoubleJump = useCallback(() => {
    const s = simRef.current;
    if (s.phase !== 'PLAYING') return;

    if (s.doubleJumps > 0 && s.player.vy > 30) {
      s.doubleJumps -= 1;
      s.player.vy = BOOTS_JUMP_VY;
      s.player.scaleX = 0.84;
      s.player.scaleY = 1.22;
      spawnBurst(s.player.x, s.player.y, '#FACC15', 14, 230);
      addFloatText(s.player.x, s.player.y - 60, 'TURBO SALTO!', '#FACC15');
      soundFx.playSpring();
      return;
    }

    if (s.shootCooldown > 0) return;
    s.shootCooldown = s.laserTimer > 0 ? 0.14 : 0.24;

    const color = s.laserTimer > 0 ? '#EC4899' : visualSkill.accentColor;
    const topY = s.player.y - 68;

    if (s.laserTimer > 0) {
      for (const vx of [-150, 0, 150]) {
        s.projectiles.push({ x: s.player.x, y: topY, vx, vy: -960, color, life: 1.2 });
      }
    } else {
      s.projectiles.push({ x: s.player.x, y: topY, vx: 0, vy: -880, color, life: 1.1 });
    }
    soundFx.playShoot();
  }, [visualSkill.accentColor]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const s = simRef.current;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        s.leftHeld = true;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        s.rightHeld = true;
      } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (s.phase === 'TITLE_MENU' || s.phase === 'GAME_OVER') {
          startNewRun();
        } else if (s.phase === 'PLAYING') {
          fireShotOrDoubleJump();
        }
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (s.phase === 'PLAYING') {
          s.phase = 'PAUSED';
          setPhase('PAUSED');
        } else if (s.phase === 'PAUSED') {
          s.phase = 'PLAYING';
          setPhase('PLAYING');
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const s = simRef.current;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') s.leftHeld = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') s.rightHeld = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [fireShotOrDoubleJump, startNewRun]);

  useEffect(() => {
    if (!tiltEnabled) {
      simRef.current.tiltVx = 0;
      return;
    }
    const onOrient = (e: DeviceOrientationEvent) => {
      if (typeof e.gamma === 'number') {
        const clamped = Math.max(-28, Math.min(28, e.gamma));
        simRef.current.tiltVx = (clamped / 28) * MAX_VX * 1.18;
      }
    };
    window.addEventListener('deviceorientation', onOrient);
    return () => window.removeEventListener('deviceorientation', onOrient);
  }, [tiltEnabled]);

  // Main 60fps Loop & Canvas Renderer
  useEffect(() => {
    let raf = 0;
    let lastTime = performance.now();
    let hudSyncAccum = 0;

    const finishRun = () => {
      const s = simRef.current;
      s.phase = 'GAME_OVER';
      setPhase('GAME_OVER');
      soundFx.playKO(false);

      const finalMeters = s.meters;
      setBestMeters((prev) => {
        const next = Math.max(prev, finalMeters);
        try {
          localStorage.setItem(BEST_METERS_KEY, String(next));
        } catch {
          // ignore
        }
        return next;
      });

      if (!s.reportedEnd) {
        const gainedXp = 15 + Math.min(55, Math.floor(finalMeters / 35) + Math.floor(s.sparks / 4));
        if (activeRoomRef.current && s.rival) {
          onSendCombatSyncRef.current({ meters: finalMeters, x: s.player.x, alive: false });
          if (!s.rival.alive) {
            const won = finalMeters >= s.rival.meters;
            s.duelResult = won ? 'win' : 'loss';
            s.reportedEnd = true;
            onGainPetXp(won ? gainedXp + 20 : gainedXp, won);
            onReportMatchResult(won, tournamentMode, stylePts, styleRank.name);
          } else if (s.rival.meters > finalMeters) {
            s.duelResult = 'loss';
            s.reportedEnd = true;
            onGainPetXp(gainedXp, false);
            onReportMatchResult(false, tournamentMode, stylePts, styleRank.name);
          } else {
            // Player fell while still leading — wait for rival's final altitude!
            s.duelResult = 'waiting';
          }
        } else {
          s.reportedEnd = true;
          const won = finalMeters >= LEVEL_METERS;
          onGainPetXp(gainedXp, won);
          if (tournamentMode && finalMeters >= LEVEL_METERS) {
            onReportMatchResult(true, true, stylePts, styleRank.name);
          }
        }
      } else if (activeRoomRef.current && s.rival) {
        onSendCombatSyncRef.current({ meters: finalMeters, x: s.player.x, alive: false });
      }
    };

    const step = (now: number) => {
      const dt = Math.min(0.035, (now - lastTime) / 1000);
      lastTime = now;
      const tSec = now / 1000;
      const s = simRef.current;

      if (s.phase === 'PLAYING') {
        const p = s.player;

        if (p.cryTimer > 0) p.cryTimer = Math.max(0, p.cryTimer - dt);
        if (s.comboTimer > 0) {
          s.comboTimer -= dt;
          if (s.comboTimer <= 0) s.combo = 1;
        }
        if (s.shootCooldown > 0) s.shootCooldown -= dt;
        if (s.biomeBannerTimer > 0) s.biomeBannerTimer -= dt;
        if (s.biomeFade < 1) s.biomeFade = Math.min(1, s.biomeFade + dt * 1.1);
        if (s.sonicRingTimer > 0) s.sonicRingTimer = Math.max(0, s.sonicRingTimer - dt);

        // Turbo de Zapatillas gives +20% air agility
        const speedMult = s.bootsTimer > 0 ? 1.2 : 1;

        if (s.dragTargetX !== null) {
          const dx = s.dragTargetX - p.x;
          p.vx = Math.max(-MAX_VX * 1.25 * speedMult, Math.min(MAX_VX * 1.25 * speedMult, dx * 9.5));
          if (Math.abs(dx) > 4) p.facing = dx > 0 ? 1 : -1;
        } else if (tiltEnabled && Math.abs(s.tiltVx) > 20) {
          p.vx = s.tiltVx * speedMult;
          p.facing = p.vx > 0 ? 1 : -1;
        } else {
          if (s.leftHeld && !s.rightHeld) {
            p.vx = Math.max(-MAX_VX * speedMult, p.vx - MOVE_ACCEL * speedMult * dt);
            p.facing = -1;
          } else if (s.rightHeld && !s.leftHeld) {
            p.vx = Math.min(MAX_VX * speedMult, p.vx + MOVE_ACCEL * speedMult * dt);
            p.facing = 1;
          } else {
            p.vx *= Math.pow(0.0015, dt);
            if (Math.abs(p.vx) < 8) p.vx = 0;
          }
        }

        p.x += p.vx * dt;
        if (p.x < -22) p.x = GAME_W + 20;
        if (p.x > GAME_W + 22) p.x = -20;

        // Ability Timers & Gravity
        if (s.jetpackTimer > 0) {
          s.jetpackTimer = Math.max(0, s.jetpackTimer - dt);
          p.vy = JETPACK_VY;
          if (Math.random() < 0.65) {
            s.particles.push({
              x: p.x + (Math.random() - 0.5) * 16,
              y: p.y + 8,
              vx: (Math.random() - 0.5) * 70,
              vy: 220 + Math.random() * 140,
              size: 4 + Math.random() * 4,
              color: Math.random() < 0.5 ? '#FF6A3D' : '#FDE047',
              life: 0.35,
              maxLife: 0.35,
            });
          }
        } else {
          // Gafas Flow reduces falling gravity by 35% for forgiving landings
          const gMult = s.shadesTimer > 0 && p.vy > 0 ? 0.65 : 1;
          p.vy += GRAVITY * gMult * dt;
        }

        if (s.bootsTimer > 0) s.bootsTimer = Math.max(0, s.bootsTimer - dt);
        if (s.magnetTimer > 0) s.magnetTimer = Math.max(0, s.magnetTimer - dt);
        if (s.shadesTimer > 0) s.shadesTimer = Math.max(0, s.shadesTimer - dt);
        if (s.boomboxTimer > 0) s.boomboxTimer = Math.max(0, s.boomboxTimer - dt);

        if (s.laserTimer > 0) {
          s.laserTimer = Math.max(0, s.laserTimer - dt);
          s.laserAutoCooldown -= dt;
          if (s.laserAutoCooldown <= 0) {
            s.laserAutoCooldown = 0.22;
            for (const vx of [-95, 0, 95]) {
              s.projectiles.push({
                x: p.x,
                y: p.y - 68,
                vx,
                vy: -980,
                color: '#EC4899',
                life: 1.0,
              });
            }
          }
        }

        const prevY = p.y;
        p.y += p.vy * dt;

        p.scaleX += (1 - p.scaleX) * Math.min(1, dt * 11);
        p.scaleY += (1 - p.scaleY) * Math.min(1, dt * 11);
        p.tiltRad = Math.max(-0.22, Math.min(0.22, p.vx * 0.00045));

        // Platform Movement & Landing
        for (const plat of s.platforms) {
          if (plat.springBounceAnim > 0) {
            plat.springBounceAnim = Math.max(0, plat.springBounceAnim - dt * 3);
          }
          if (plat.kind === 'moving' && !plat.broken) {
            plat.x += plat.vx * dt;
            if (plat.x < 10) {
              plat.x = 10;
              plat.vx = Math.abs(plat.vx);
            } else if (plat.x + plat.w > GAME_W - 10) {
              plat.x = GAME_W - 10 - plat.w;
              plat.vx = -Math.abs(plat.vx);
            }
          }

          if (plat.broken) {
            plat.vanishAlpha = Math.max(0, plat.vanishAlpha - dt * 3.2);
            continue;
          }

          if (p.vy > 0 && s.jetpackTimer <= 0) {
            const footHalfW = 24; // forgiving mobile landing width
            const withinX = p.x + footHalfW > plat.x && p.x - footHalfW < plat.x + plat.w;
            const crossedTop = prevY <= plat.y + 10 && p.y >= plat.y;
            if (withinX && crossedTop) {
              if (plat.kind === 'fragile') {
                plat.broken = true;
                spawnBurst(plat.x + plat.w / 2, plat.y, '#FDE047', 8, 160);
                soundFx.playBreak();
                p.vy = BASE_JUMP_VY * 0.9;
                p.y = plat.y;
                p.scaleX = 1.2;
                p.scaleY = 0.82;
              } else {
                p.y = plat.y;
                if (plat.hasSpring) {
                  p.vy = SPRING_JUMP_VY;
                  plat.springBounceAnim = 1;
                  p.scaleX = 0.78;
                  p.scaleY = 1.28;
                  spawnBurst(plat.x + plat.w / 2, plat.y, '#FF6A3D', 14, 260);
                  addFloatText(p.x, p.y - 72, '¡BOING!', '#FACC15');
                  soundFx.playSpring();
                } else {
                  p.vy = s.bootsTimer > 0 ? BOOTS_JUMP_VY : BASE_JUMP_VY;
                  p.scaleX = 1.22;
                  p.scaleY = 0.8;
                  spawnBurst(
                    p.x,
                    plat.y,
                    s.bootsTimer > 0 ? '#FACC15' : visualSkill.accentColor,
                    6,
                    120
                  );
                  soundFx.playJump();
                }
                if (plat.kind === 'vanish') {
                  plat.broken = true;
                }
              }
            }
          }
        }

        // Collectibles & Magnet Pull
        const scoreMult = s.boomboxTimer > 0 ? 2 : 1;
        for (const item of s.collectibles) {
          if (item.collected) continue;
          const distX = p.x - item.x;
          const distY = p.y - 36 - item.y;
          const dist = Math.hypot(distX, distY);

          if (s.magnetTimer > 0 && dist < 235) {
            const pull = 560 * dt;
            item.x += (distX / Math.max(1, dist)) * pull;
            item.y += (distY / Math.max(1, dist)) * pull;
          }

          if (dist < 40) {
            item.collected = true;
            if (item.kind === 'spark') {
              s.sparks += scoreMult;
              s.combo = Math.min(5, s.combo + 1);
              s.comboTimer = 3.4;
              const pts = 30 * s.combo * scoreMult;
              s.score += pts;
              spawnBurst(item.x, item.y, '#FACC15', 8, 170);
              addFloatText(
                item.x,
                item.y - 12,
                `+${pts}${s.combo > 1 ? ` x${s.combo}` : ''}`,
                '#FACC15'
              );
              soundFx.playPickup(s.combo);
            } else if (item.kind === 'boots') {
              s.bootsTimer = 14;
              s.doubleJumps = Math.min(3, s.doubleJumps + 2);
              s.score += 100 * scoreMult;
              p.cryText = '¡TURBO ZAPAS!';
              p.cryTimer = 1.2;
              spawnBurst(item.x, item.y, '#FACC15', 16, 250);
              addFloatText(item.x, item.y - 16, 'TURBO DE ZAPATILLAS!', '#FACC15');
              soundFx.playPickup(4);
            } else if (item.kind === 'shield') {
              s.shieldActive = true;
              s.score += 100 * scoreMult;
              p.cryText = '¡HOODIE ON!';
              p.cryTimer = 1.2;
              spawnBurst(item.x, item.y, '#2DD4BF', 16, 250);
              addFloatText(item.x, item.y - 16, 'ESCUDO DE HOODIE!', '#2DD4BF');
              soundFx.playPickup(4);
            } else if (item.kind === 'jetpack') {
              s.jetpackTimer = 4.0;
              s.score += 130 * scoreMult;
              p.cryText = '¡COHETE!';
              p.cryTimer = 1.2;
              spawnBurst(item.x, item.y, '#FF6A3D', 18, 280);
              addFloatText(item.x, item.y - 16, 'MOCHILA COHETE!', '#FF6A3D');
              soundFx.playJetpack();
            } else if (item.kind === 'magnet') {
              s.magnetTimer = 14;
              s.score += 100 * scoreMult;
              p.cryText = '¡IMÁN!';
              p.cryTimer = 1.0;
              spawnBurst(item.x, item.y, '#A855F7', 14, 230);
              addFloatText(item.x, item.y - 16, 'GORRA IMÁN!', '#C084FC');
              soundFx.playPickup(4);
            } else if (item.kind === 'laser') {
              s.laserTimer = 11;
              s.score += 110 * scoreMult;
              p.cryText = '¡SPRAY x3!';
              p.cryTimer = 1.0;
              spawnBurst(item.x, item.y, '#EC4899', 14, 240);
              addFloatText(item.x, item.y - 16, 'SPRAY LÁSER x3!', '#F472B6');
              soundFx.playSpecial();
            } else if (item.kind === 'shades') {
              s.shadesTimer = 12;
              s.score += 100 * scoreMult;
              p.cryText = '¡FLOW!';
              p.cryTimer = 1.0;
              spawnBurst(item.x, item.y, '#38BDF8', 14, 230);
              addFloatText(item.x, item.y - 16, 'GAFAS FLOW (-GRAVEDAD)!', '#38BDF8');
              soundFx.playPickup(5);
            } else if (item.kind === 'boombox') {
              s.boomboxTimer = 14;
              s.sonicRingTimer = 0.55;
              s.score += 140 * scoreMult;
              p.cryText = '¡BOOM x2!';
              p.cryTimer = 1.2;
              spawnBurst(item.x, item.y, '#F43F5E', 20, 290);
              addFloatText(item.x, item.y - 16, 'BOOMBOX x2 + ONDA!', '#F43F5E');
              // Clear enemies currently in view
              for (const en of s.enemies) {
                if (en.alive && en.y > s.cameraY - 40 && en.y < s.cameraY + GAME_H + 40) {
                  en.alive = false;
                  s.score += 150;
                  spawnBurst(en.x, en.y, '#F43F5E', 12, 220);
                }
              }
              soundFx.playSpecial();
            }
          }
        }

        // Enemies (Gafas Flow slows drones down by 35%)
        const enemySpeedScale = s.shadesTimer > 0 ? 0.65 : 1;
        for (const en of s.enemies) {
          if (!en.alive) continue;
          if (en.kind === 'drone') {
            en.x += en.vx * enemySpeedScale * dt;
            if (en.x < 28) {
              en.x = 28;
              en.vx = Math.abs(en.vx);
            } else if (en.x > GAME_W - 28) {
              en.x = GAME_W - 28;
              en.vx = -Math.abs(en.vx);
            }
          }

          const d = Math.hypot(p.x - en.x, p.y - 34 - en.y);
          if (d < en.r + 20) {
            if (s.jetpackTimer > 0) {
              en.alive = false;
              s.score += 150 * scoreMult;
              spawnBurst(en.x, en.y, '#FF6A3D', 14, 240);
              soundFx.playHit(true);
            } else if (p.vy > 0 && p.y - 14 < en.y) {
              en.alive = false;
              p.vy = BASE_JUMP_VY * 1.15;
              s.score += 180 * scoreMult;
              spawnBurst(en.x, en.y, '#FACC15', 14, 250);
              addFloatText(en.x, en.y - 16, '+180 ¡APLASTADO!', '#FACC15');
              soundFx.playHit(false);
            } else if (s.shieldActive) {
              s.shieldActive = false;
              en.alive = false;
              p.vy = BASE_JUMP_VY;
              spawnBurst(p.x, p.y - 30, '#2DD4BF', 18, 270);
              addFloatText(p.x, p.y - 60, '¡HOODIE PROTEGE!', '#2DD4BF');
              soundFx.playBlock();
            } else {
              spawnBurst(p.x, p.y - 30, '#EF4444', 18, 260);
              finishRun();
              break;
            }
          }
        }

        // Projectiles
        for (const proj of s.projectiles) {
          proj.x += proj.vx * dt;
          proj.y += proj.vy * dt;
          proj.life -= dt;
          for (const en of s.enemies) {
            if (!en.alive) continue;
            if (Math.hypot(proj.x - en.x, proj.y - en.y) < en.r + 10) {
              en.alive = false;
              proj.life = 0;
              s.score += 150 * scoreMult;
              spawnBurst(en.x, en.y, proj.color, 14, 250);
              addFloatText(en.x, en.y - 12, `+${150 * scoreMult}!`, proj.color);
              soundFx.playHit(false);
            }
          }
        }
        s.projectiles = s.projectiles.filter((pr) => pr.life > 0);

        // Camera Upward Climb
        const targetCamY = p.y - GAME_H * 0.42;
        if (targetCamY < s.cameraY) {
          s.cameraY += (targetCamY - s.cameraY) * Math.min(1, dt * 12);
        }

        if (p.y < s.highestWorldY) {
          const gained = s.highestWorldY - p.y;
          s.highestWorldY = p.y;
          s.meters = Math.round((GAME_H - 90 - s.highestWorldY) / 14);
          s.score += Math.round(gained * 0.14 * scoreMult);

          const { biome, index, cycle, levelNum } = getBiomeForMeters(
            s.meters,
            s.startBiomeIdx
          );
          if (index !== s.biomeIndex || levelNum !== s.levelNum) {
            s.prevBiomeIndex = s.biomeIndex;
            s.biomeIndex = index;
            s.cycle = cycle;
            s.levelNum = levelNum;
            s.score += 300;
            addFloatText(p.x, p.y - 68, `${biome.name}`, biome.accentColor);
            soundFx.playZoneUp();
          }

          // Check if player just climbed past a fallen rival in a Dual Race
          if (
            activeRoomRef.current &&
            s.rival &&
            !s.rival.alive &&
            !s.duelResult &&
            s.meters > s.rival.meters
          ) {
            s.duelResult = 'win';
            s.reportedEnd = true;
            soundFx.playKO(true);
            addFloatText(p.x, p.y - 90, '¡SUPERASTE AL RIVAL!', '#4ADE80');
            const gainedXp = 35 + Math.min(40, Math.floor(s.meters / 30));
            onGainPetXp(gainedXp, true);
            onReportMatchResult(true, tournamentMode, stylePts, styleRank.name);
          }
        }

        generatePlatformsUpTo(s.cameraY - GAME_H * 1.25);
        const pruneBelow = s.cameraY + GAME_H + 140;
        s.platforms = s.platforms.filter((pl) => pl.y < pruneBelow);
        s.collectibles = s.collectibles.filter((c) => !c.collected && c.y < pruneBelow);
        s.enemies = s.enemies.filter((e) => e.alive && e.y < pruneBelow);

        // Fall check
        if (p.y - 75 > s.cameraY + GAME_H) {
          if (s.shieldActive) {
            s.shieldActive = false;
            p.vy = SPRING_JUMP_VY;
            p.y = s.cameraY + GAME_H - 20;
            spawnBurst(p.x, p.y, '#2DD4BF', 18, 280);
            addFloatText(p.x, p.y - 50, '¡RESCATE HOODIE!', '#2DD4BF');
            soundFx.playSpring();
          } else {
            finishRun();
          }
        }

        if (activeRoomRef.current) {
          s.syncAccum += dt;
          if (s.syncAccum >= 0.05) {
            s.syncAccum = 0;
            onSendCombatSyncRef.current({ meters: s.meters, x: p.x, alive: true });
          }
        }
      }

      for (const pt of s.particles) {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vy += 400 * dt;
        pt.life -= dt;
      }
      s.particles = s.particles.filter((pt) => pt.life > 0);
      for (const ft of s.floatTexts) {
        ft.y -= 36 * dt;
        ft.life -= dt;
      }
      s.floatTexts = s.floatTexts.filter((ft) => ft.life > 0);

      for (const ap of s.ambientParticles) {
        ap.y += ap.speed * dt;
        if (ap.y > GAME_H) {
          ap.y = -8;
          ap.x = (ap.x + 97) % GAME_W;
        }
      }

      // -------------------- RENDERING --------------------
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const curBiome = JUMP_BIOMES[s.biomeIndex] ?? JUMP_BIOMES[0];
          const nextBiomeIdx = (s.biomeIndex + 1) % JUMP_BIOMES.length;
          const nextBiome = JUMP_BIOMES[nextBiomeIdx];
          const levelProgress = (s.meters % LEVEL_METERS) / LEVEL_METERS;
          // Continuous, subtle altitude-driven crossfade over the final 200m of each 900m stage
          const rawBlend = Math.max(0, Math.min(1, (levelProgress - 0.78) / 0.22));
          const smoothBlend = rawBlend * rawBlend * (3 - 2 * rawBlend);

          ctx.clearRect(0, 0, GAME_W, GAME_H);

          const drawBiomeBg = (biome: JumpBiome, alpha: number) => {
            if (alpha <= 0.01) return;
            ctx.save();
            ctx.globalAlpha = alpha;
            const skyGrad = ctx.createLinearGradient(0, 0, 0, GAME_H);
            skyGrad.addColorStop(0, biome.skyTop);
            skyGrad.addColorStop(1, biome.skyBottom);
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, GAME_W, GAME_H);

            const bgImg = getCachedBiomeImage(biome.imageUrl);
            if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
              // Slight scale buffer + seamless cosine ping-pong vertical & gentle horizontal drift
              const drawW = GAME_W * 1.07;
              const aspectH = drawW * (bgImg.naturalHeight / bgImg.naturalWidth);
              const extraY = Math.max(32, aspectH - GAME_H);
              const verticalWave = 0.5 - 0.5 * Math.cos(-s.cameraY * 0.00055 + tSec * 0.11);
              const swayX = Math.sin(tSec * 0.22 + -s.cameraY * 0.0009) * 12 - 14;
              const drawY = -extraY * verticalWave;
              ctx.drawImage(bgImg, swayX, drawY, drawW, aspectH);

              // Soft drifting atmospheric veil so foreground platforms stay crisp and calm
              const mistY = (Math.sin(tSec * 0.35) * 0.5 + 0.5) * GAME_H * 0.35;
              const mistGrad = ctx.createLinearGradient(0, mistY, 0, mistY + GAME_H * 0.55);
              mistGrad.addColorStop(0, 'rgba(14, 12, 28, 0.16)');
              mistGrad.addColorStop(0.5, 'rgba(24, 20, 44, 0.28)');
              mistGrad.addColorStop(1, 'rgba(14, 12, 28, 0.20)');
              ctx.fillStyle = biome.isMonochrome ? 'rgba(15, 15, 18, 0.24)' : mistGrad;
              ctx.fillRect(0, 0, GAME_W, GAME_H);
            }
            ctx.restore();
          };

          drawBiomeBg(curBiome, 1);
          if (smoothBlend > 0.01 && nextBiomeIdx !== s.biomeIndex) {
            drawBiomeBg(nextBiome, smoothBlend);
          }

          ctx.save();
          for (const ap of s.ambientParticles) {
            ctx.fillStyle =
              curBiome.particleKind === 'bubbles'
                ? 'rgba(165, 243, 252, 0.4)'
                : curBiome.particleKind === 'stars'
                ? 'rgba(253, 224, 71, 0.45)'
                : curBiome.particleKind === 'ink'
                ? 'rgba(255, 255, 255, 0.3)'
                : 'rgba(255, 194, 77, 0.38)';
            ctx.beginPath();
            ctx.arc(ap.x + Math.sin(tSec * 1.4 + ap.y * 0.03) * 6, ap.y, ap.size, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

          if (s.phase === 'TITLE_MENU') {
            // Showcase bouncing Mokaya character over the starting district
            const bounce = Math.abs(Math.sin(tSec * 2.6));
            drawMokayaJumper(ctx, loadout.petId, {
              x: GAME_W / 2,
              y: GAME_H * 0.62 - bounce * 56,
              facing: Math.sin(tSec * 1.2) >= 0 ? 1 : -1,
              scaleX: 1.16,
              scaleY: 1.16,
              stageLevel: charStage.level,
              visualSkillId: loadout.visualSkillId,
              timeSec: tSec,
              cryText: selectedChar.cry,
            });
          } else {
            ctx.save();
            ctx.translate(0, -s.cameraY);

            // Platforms
            for (const plat of s.platforms) {
              if (plat.vanishAlpha <= 0.02) continue;
              if (plat.y < s.cameraY - 40 || plat.y > s.cameraY + GAME_H + 40) continue;

              const pBiome = JUMP_BIOMES[plat.biomeIndex] ?? curBiome;
              ctx.save();
              ctx.globalAlpha = plat.vanishAlpha;

              ctx.beginPath();
              ctx.roundRect(plat.x, plat.y, plat.w, plat.h, 7);

              if (plat.kind === 'fragile') {
                ctx.fillStyle = '#FDE68A';
                ctx.fill();
                ctx.strokeStyle = '#18181B';
                ctx.lineWidth = 2.4;
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(plat.x + plat.w * 0.42, plat.y);
                ctx.lineTo(plat.x + plat.w * 0.52, plat.y + 8);
                ctx.lineTo(plat.x + plat.w * 0.46, plat.y + plat.h);
                ctx.stroke();
              } else {
                ctx.fillStyle = plat.kind === 'moving' ? '#0F172A' : pBiome.platformColor;
                ctx.fill();
                ctx.strokeStyle = '#18181B';
                ctx.lineWidth = 2.5;
                ctx.stroke();

                ctx.fillStyle = plat.kind === 'moving' ? '#38BDF8' : pBiome.platformRim;
                ctx.beginPath();
                ctx.roundRect(plat.x + 2, plat.y + 2, plat.w - 4, 5, 3);
                ctx.fill();

                if (plat.kind === 'vanish') {
                  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
                  ctx.setLineDash([4, 4]);
                  ctx.strokeRect(plat.x + 3, plat.y + 3, plat.w - 6, plat.h - 6);
                  ctx.setLineDash([]);
                }
              }

              if (plat.hasSpring && !plat.broken) {
                const sx = plat.x + plat.w / 2;
                const sh = 10 + plat.springBounceAnim * 10;
                ctx.fillStyle = '#FF6A3D';
                ctx.strokeStyle = '#18181B';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(sx - 13, plat.y - sh, 26, sh, 4);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#FACC15';
                ctx.fillRect(sx - 10, plat.y - sh + 2, 20, 3);
              }
              ctx.restore();
            }

            // Custom 2D Vector Collectibles
            for (const item of s.collectibles) {
              if (item.collected) continue;
              if (item.y < s.cameraY - 40 || item.y > s.cameraY + GAME_H + 40) continue;
              const bobY = item.y + Math.sin(tSec * 5 + item.bobOffset) * 5;
              drawCollectibleIcon(ctx, item.kind, item.x, bobY, tSec);
            }

            // Enemies
            for (const en of s.enemies) {
              if (!en.alive) continue;
              if (en.y < s.cameraY - 50 || en.y > s.cameraY + GAME_H + 50) continue;

              ctx.save();
              ctx.translate(en.x, en.y);
              ctx.fillStyle = en.kind === 'drone' ? '#7C3AED' : '#EF4444';
              ctx.strokeStyle = '#18181B';
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.arc(0, 0, en.r, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();

              ctx.fillStyle = '#FFFFFF';
              ctx.beginPath();
              ctx.arc(-6, -2, 4.5, 0, Math.PI * 2);
              ctx.arc(6, -2, 4.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#18181B';
              ctx.beginPath();
              ctx.arc(-6, -2, 2, 0, Math.PI * 2);
              ctx.arc(6, -2, 2, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }

            // Boombox Sonic Shockwave Ring
            if (s.sonicRingTimer > 0) {
              ctx.save();
              const prog = 1 - s.sonicRingTimer / 0.55;
              ctx.strokeStyle = '#F43F5E';
              ctx.lineWidth = 4 * (1 - prog);
              ctx.globalAlpha = 1 - prog;
              ctx.beginPath();
              ctx.arc(s.player.x, s.player.y - 36, 30 + prog * 260, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
            }

            // Projectiles
            for (const pr of s.projectiles) {
              ctx.save();
              ctx.fillStyle = pr.color;
              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(pr.x, pr.y, 6, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
              ctx.restore();
            }

            // Online Rival Ghost
            if (s.rival && s.rival.alive) {
              const rivalWorldY = GAME_H - 90 - s.rival.meters * 14;
              if (rivalWorldY > s.cameraY - 40 && rivalWorldY < s.cameraY + GAME_H + 40) {
                ctx.save();
                ctx.globalAlpha = 0.45;
                drawMokayaJumper(ctx, s.rival.petId, {
                  x: s.rival.x,
                  y: rivalWorldY,
                  facing: 1,
                  timeSec: tSec,
                  cryText: s.rival.name,
                });
                ctx.restore();
              }
            }

            // Player's Original Mokaya Character with Visually Represented Abilities
            drawMokayaJumper(ctx, loadout.petId, {
              x: s.player.x,
              y: s.player.y,
              facing: s.player.facing,
              scaleX: s.player.scaleX,
              scaleY: s.player.scaleY,
              tiltRad: s.player.tiltRad,
              stageLevel: charStage.level,
              visualSkillId: loadout.visualSkillId,
              timeSec: tSec,
              jetpackActive: s.jetpackTimer > 0,
              shieldActive: s.shieldActive,
              magnetActive: s.magnetTimer > 0,
              bootsActive: s.bootsTimer > 0,
              laserActive: s.laserTimer > 0,
              shadesActive: s.shadesTimer > 0,
              boomboxActive: s.boomboxTimer > 0,
              cryText: s.player.cryTimer > 0 ? s.player.cryText : undefined,
            });

            // Particles & Float Texts
            for (const pt of s.particles) {
              ctx.save();
              ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
              ctx.fillStyle = pt.color;
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }

            for (const ft of s.floatTexts) {
              ctx.save();
              ctx.globalAlpha = Math.min(1, ft.life * 1.4);
              ctx.font = '800 13px "Bricolage Grotesque", sans-serif';
              ctx.textAlign = 'center';
              ctx.strokeStyle = '#18181B';
              ctx.lineWidth = 3.5;
              ctx.strokeText(ft.text, ft.x, ft.y);
              ctx.fillStyle = ft.color;
              ctx.fillText(ft.text, ft.x, ft.y);
              ctx.restore();
            }

            ctx.restore();
          }
        }
      }

      hudSyncAccum += dt;
      if (hudSyncAccum >= 0.08) {
        hudSyncAccum = 0;
        const info = getBiomeForMeters(s.meters, s.startBiomeIdx);
        setHud({
          meters: s.meters,
          score: s.score,
          sparks: s.sparks,
          combo: s.combo,
          biomeName: info.biome.name,
          biomeAccent: info.biome.accentColor,
          levelNum: info.levelNum,
          levelProgress: info.levelProgress,
          jetpackSec: Math.ceil(s.jetpackTimer),
          bootsSec: Math.ceil(s.bootsTimer),
          doubleJumps: s.doubleJumps,
          magnetSec: Math.ceil(s.magnetTimer),
          shieldActive: s.shieldActive,
          laserSec: Math.ceil(s.laserTimer),
          shadesSec: Math.ceil(s.shadesTimer),
          boomboxSec: Math.ceil(s.boomboxTimer),
          cycle: info.cycle,
          rivalMeters: s.rival?.meters ?? 0,
          rivalAlive: s.rival?.alive ?? true,
          duelResult: s.duelResult,
        });
      }

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [
    charStage.level,
    generatePlatformsUpTo,
    loadout.petId,
    loadout.visualSkillId,
    onGainPetXp,
    onReportMatchResult,
    selectedChar.cry,
    stylePts,
    styleRank.name,
    tiltEnabled,
    tournamentMode,
    visualSkill.accentColor,
  ]);

  const pointerDownPosRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const mapPointerToCanvasX = (clientX: number): number => {
    const canvas = canvasRef.current;
    if (!canvas) return GAME_W / 2;
    const rect = canvas.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * GAME_W;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = simRef.current;
    if (s.phase !== 'PLAYING') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    s.dragTargetX = mapPointerToCanvasX(e.clientX);
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY, time: performance.now() };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = simRef.current;
    if (s.phase !== 'PLAYING' || s.dragTargetX === null) return;
    s.dragTargetX = mapPointerToCanvasX(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = simRef.current;
    s.dragTargetX = null;
    if (pointerDownPosRef.current) {
      const dist = Math.hypot(
        e.clientX - pointerDownPosRef.current.x,
        e.clientY - pointerDownPosRef.current.y
      );
      const elapsed = performance.now() - pointerDownPosRef.current.time;
      if (dist < 14 && elapsed < 260) {
        fireShotOrDoubleJump();
      }
    }
    pointerDownPosRef.current = null;
  };

  const handleCopyCode = () => {
    if (!createdRoomCode) return;
    navigator.clipboard?.writeText(createdRoomCode).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  const isActiveGame = phase === 'PLAYING' || phase === 'PAUSED';

  return (
    <div className="relative h-full flex flex-col bg-zinc-950 text-white select-none overflow-hidden">
      {/* Slim In-Game Top Arcade HUD */}
      {isActiveGame && (
        <div className="px-3 py-2 bg-zinc-950/95 border-b border-zinc-800 space-y-1.5 shrink-0 z-10">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <MascotVectorPortrait
                petId={loadout.petId}
                stageLevel={charStage.level}
                size={32}
                className="bg-white/10 rounded-lg shrink-0"
              />
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-zinc-300 truncate">
                  Nv.{hud.levelNum} · {hud.biomeName}
                </div>
                <div className="font-mono-tabular font-extrabold text-sm leading-tight">
                  {hud.meters}m <span className="text-zinc-400 text-[11px] font-normal">/ {bestMeters}m</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <div className="text-[10px] text-amber-300 font-bold">
                  Chispas {hud.sparks} {hud.combo > 1 ? `· x${hud.combo}` : ''}
                </div>
                <div className="font-mono-tabular font-bold text-xs">{hud.score.toLocaleString()} pts</div>
              </div>

              <button
                onClick={() => {
                  const next = !muted;
                  setMuted(next);
                  soundFx.muted = next;
                }}
                aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
                className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center"
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                onClick={() => {
                  const next = phase === 'PLAYING' ? 'PAUSED' : 'PLAYING';
                  simRef.current.phase = next;
                  setPhase(next);
                }}
                aria-label={phase === 'PLAYING' ? 'Pausar' : 'Reanudar'}
                className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center"
              >
                {phase === 'PLAYING' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 900m Stage Level Progress Bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-150"
                style={{
                  width: `${Math.round(hud.levelProgress * 100)}%`,
                  backgroundColor: hud.biomeAccent,
                }}
              />
            </div>
            <span className="text-[10px] font-mono-tabular text-zinc-400">
              {hud.meters % LEVEL_METERS}/{LEVEL_METERS}m
            </span>
          </div>

          {/* Active Visual Abilities Bar */}
          {(hud.bootsSec > 0 ||
            hud.shieldActive ||
            hud.jetpackSec > 0 ||
            hud.magnetSec > 0 ||
            hud.laserSec > 0 ||
            hud.shadesSec > 0 ||
            hud.boomboxSec > 0) && (
            <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold">
              {hud.bootsSec > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-amber-400 text-zinc-950">
                  Zapas {hud.bootsSec}s · {hud.doubleJumps}⬆
                </span>
              )}
              {hud.shieldActive && (
                <span className="px-2 py-0.5 rounded-md bg-teal-400 text-zinc-950">
                  Hoodie Escudo
                </span>
              )}
              {hud.jetpackSec > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-orange-500 text-white">
                  Cohete {hud.jetpackSec}s
                </span>
              )}
              {hud.magnetSec > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-purple-500 text-white">
                  Imán {hud.magnetSec}s
                </span>
              )}
              {hud.laserSec > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-pink-500 text-white">
                  Spray x3 {hud.laserSec}s
                </span>
              )}
              {hud.shadesSec > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-sky-400 text-zinc-950">
                  Gafas {hud.shadesSec}s
                </span>
              )}
              {hud.boomboxSec > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-rose-500 text-white">
                  Boombox x2 {hud.boomboxSec}s
                </span>
              )}
            </div>
          )}

          {activeRoom && (
            <div className="bg-zinc-900 rounded-lg px-2.5 py-1 flex items-center justify-between text-[11px] border border-zinc-800">
              <span>
                1 vs 1 vs <strong className="text-amber-300">{activeRoom.opponentName}</strong>
                {hud.duelResult === 'win' && (
                  <span className="ml-1.5 text-emerald-400 font-extrabold">· ¡GANASTE!</span>
                )}
              </span>
              <span className="font-mono-tabular">
                {hud.rivalMeters}m {hud.rivalAlive ? '▲' : '(Cayó)'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main Playable Canvas Area */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center bg-zinc-950 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={GAME_W}
          height={GAME_H}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-full object-contain touch-control cursor-crosshair"
        />

        {/* ANDROID IN-GAME LOBBY / TITLE MENU */}
        {phase === 'TITLE_MENU' && (
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/75 via-zinc-950/25 to-zinc-950/92 flex flex-col justify-between p-4">
            {/* Top Lobby Quick Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="px-3 py-1.5 rounded-xl bg-zinc-950/85 border border-white/15 text-xs font-mono-tabular font-bold">
                Récord: <span className="text-amber-300">{bestMeters}m</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowAbilitiesSheet(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-zinc-950/85 border border-white/15 text-xs font-bold flex items-center gap-1 hover:bg-zinc-800"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-300" />
                  <span>Poderes</span>
                </button>
                <button
                  onClick={() => setTiltEnabled((v) => !v)}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 ${
                    tiltEnabled
                      ? 'bg-[#FF6A3D] border-zinc-900 text-white'
                      : 'bg-zinc-950/85 border-white/15 text-zinc-200'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>{tiltEnabled ? 'Giro ON' : 'Giro'}</span>
                </button>
              </div>
            </div>

            {/* Center Title */}
            <div className="text-center space-y-1 pointer-events-none">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                {tournamentMode ? 'Torneo Semanal Activo' : 'Streetwear Arcade · Carrera Vertical'}
              </div>
              <h1 className="font-display font-extrabold text-4xl tracking-tight drop-shadow-[0_3px_10px_rgba(0,0,0,0.85)]">
                MOKAY JUMP
              </h1>
              <p className="text-xs text-zinc-200 drop-shadow">
                {selectedChar.name} · {activeStageMeta.name}
              </p>
            </div>

            {/* Bottom Lobby Action Dock */}
            <div className="space-y-2.5">
              {/* Quick Selector Pills for Character & Stage */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onOpenCharacters}
                  className="bg-zinc-950/88 border border-white/20 rounded-xl p-2 flex items-center gap-2 text-left hover:border-amber-300 transition-colors"
                >
                  <MascotVectorPortrait
                    petId={loadout.petId}
                    stageLevel={charStage.level}
                    size={34}
                    className="bg-white/10 rounded-lg shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-[10px] text-zinc-400">Personaje</div>
                    <div className="font-display font-bold text-xs truncate">{selectedChar.name}</div>
                  </div>
                </button>

                <button
                  onClick={onOpenStages}
                  className="bg-zinc-950/88 border border-white/20 rounded-xl p-2 flex items-center gap-2 text-left hover:border-amber-300 transition-colors"
                >
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-white/20"
                    style={{ backgroundColor: activeStageMeta.accentColor }}
                  >
                    <MapPin className="w-4 h-4 text-zinc-950" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10px] text-zinc-400">Escenario</div>
                    <div className="font-display font-bold text-xs truncate">{activeStageMeta.name}</div>
                  </div>
                </button>
              </div>

              {/* Primary Play Button + Dual Race Online Button */}
              <button
                onClick={() => startNewRun()}
                className="mokaya-btn w-full bg-[#FF6A3D] hover:bg-[#ff5a28] text-white py-3.5 px-6 rounded-2xl font-display font-extrabold text-lg flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" /> EMPEZAR ASCENSO
              </button>

              <button
                onClick={() => setShowOnlineSheet(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-900/95 border border-white/20 text-xs font-bold flex items-center justify-center gap-2 hover:bg-zinc-800"
              >
                <Swords className="w-4 h-4 text-amber-300" />
                <span>Carrera Dual 1 vs 1 & Amigos ({onlineCount} en línea)</span>
              </button>
            </div>
          </div>
        )}

        {/* PAUSED OVERLAY */}
        {phase === 'PAUSED' && (
          <div className="absolute inset-0 bg-zinc-950/82 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-4">
            <h2 className="font-display font-extrabold text-3xl">Pausa</h2>
            <div className="flex flex-col w-full max-w-[240px] gap-2.5">
              <button
                onClick={() => {
                  simRef.current.phase = 'PLAYING';
                  setPhase('PLAYING');
                }}
                className="mokaya-btn bg-[#FF6A3D] text-white py-3 rounded-xl font-bold text-sm"
              >
                Continuar Ascenso
              </button>
              <button
                onClick={() => startNewRun()}
                className="mokaya-btn bg-zinc-800 text-white py-2.5 rounded-xl font-bold text-sm"
              >
                Reiniciar Partida
              </button>
              <button
                onClick={() => {
                  simRef.current.phase = 'TITLE_MENU';
                  setPhase('TITLE_MENU');
                  if (activeRoom) onLeaveRoom();
                }}
                className="py-2 text-xs font-semibold text-zinc-300 hover:text-white"
              >
                Volver al Menú Principal
              </button>
            </div>
          </div>
        )}

        {/* GAME OVER OVERLAY */}
        {phase === 'GAME_OVER' && (
          <div className="absolute inset-0 bg-zinc-950/86 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="text-xs font-bold text-amber-300">
              {hud.duelResult === 'win'
                ? '¡GANASTE LA CARRERA DUAL!'
                : hud.duelResult === 'loss'
                ? `DERROTA EN CARRERA DUAL · RIVAL ${hud.rivalMeters}M`
                : hud.duelResult === 'waiting'
                ? `MARCA REGISTRADA · ESPERANDO A ${activeRoom?.opponentName?.toUpperCase() ?? 'RIVAL'} (${hud.rivalMeters}M)`
                : `NIVEL ${hud.levelNum} · ${hud.biomeName.toUpperCase()}`}
            </div>
            <h2 className="font-display font-extrabold text-4xl">{hud.meters} Metros</h2>
            {activeRoom && (
              <p className="text-xs text-zinc-300 max-w-xs">
                {hud.duelResult === 'waiting'
                  ? 'El que llegue más alto gana. Esperando a que tu amigo termine su ascenso...'
                  : `Tú: ${hud.meters}m vs ${activeRoom.opponentName}: ${hud.rivalMeters}m`}
              </p>
            )}
            <div className="grid grid-cols-3 gap-2 w-full max-w-xs text-center bg-zinc-900 border border-zinc-700 rounded-xl p-3">
              <div>
                <div className="text-[10px] text-zinc-400">Puntos</div>
                <div className="font-mono-tabular font-bold text-sm">{hud.score}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-400">Chispas</div>
                <div className="font-mono-tabular font-bold text-sm text-amber-300">{hud.sparks}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-400">Récord</div>
                <div className="font-mono-tabular font-bold text-sm text-emerald-400">{bestMeters}m</div>
              </div>
            </div>

            <div className="flex flex-col w-full max-w-xs gap-2.5 pt-1">
              {activeRoom && activeRoom.code.startsWith('race_') ? (
                <button
                  onClick={() => {
                    onSendDuelInvite(
                      activeRoom.opponentName,
                      selectedArenaId,
                      activeRoom.opponentId
                    );
                    simRef.current.phase = 'TITLE_MENU';
                    setPhase('TITLE_MENU');
                    onLeaveRoom();
                  }}
                  className="mokaya-btn bg-[#FF6A3D] text-white py-3.5 px-6 rounded-xl font-display font-extrabold text-base flex items-center justify-center gap-2"
                >
                  <Swords className="w-4 h-4" /> Retar Revancha 1 vs 1
                </button>
              ) : (
                <button
                  onClick={() => startNewRun(activeRoom?.code)}
                  className="mokaya-btn bg-[#FF6A3D] text-white py-3.5 px-6 rounded-xl font-display font-extrabold text-base flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Jugar de Nuevo
                </button>
              )}
              <button
                onClick={() => {
                  simRef.current.phase = 'TITLE_MENU';
                  setPhase('TITLE_MENU');
                  if (tournamentMode) onExitTournamentMode();
                  if (activeRoom) onLeaveRoom();
                }}
                className="py-2.5 rounded-xl bg-zinc-800 text-zinc-200 text-xs font-bold hover:bg-zinc-700"
              >
                Menú del Juego
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Android Bottom Ergonomic Thumb Controls (Active during gameplay) */}
      {isActiveGame && (
        <div className="px-3 py-2 bg-zinc-950 border-t border-zinc-800 grid grid-cols-4 gap-2 shrink-0">
          <button
            onPointerDown={() => {
              simRef.current.leftHeld = true;
            }}
            onPointerUp={() => {
              simRef.current.leftHeld = false;
            }}
            onPointerLeave={() => {
              simRef.current.leftHeld = false;
            }}
            onPointerCancel={() => {
              simRef.current.leftHeld = false;
            }}
            className="mokaya-btn touch-control bg-zinc-800 text-white h-12 rounded-xl flex items-center justify-center font-bold"
            aria-label="Mover a la izquierda"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            onClick={fireShotOrDoubleJump}
            className="mokaya-btn touch-control col-span-2 bg-[#FF6A3D] text-white h-12 rounded-xl flex items-center justify-center gap-1.5 text-xs font-extrabold"
          >
            <Zap className="w-4 h-4" />
            {hud.doubleJumps > 0 ? `Doble Salto (${hud.doubleJumps})` : 'Disparar Chispa'}
          </button>

          <button
            onPointerDown={() => {
              simRef.current.rightHeld = true;
            }}
            onPointerUp={() => {
              simRef.current.rightHeld = false;
            }}
            onPointerLeave={() => {
              simRef.current.rightHeld = false;
            }}
            onPointerCancel={() => {
              simRef.current.rightHeld = false;
            }}
            className="mokaya-btn touch-control bg-zinc-800 text-white h-12 rounded-xl flex items-center justify-center font-bold"
            aria-label="Mover a la derecha"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* IN-GAME MODAL 1: COLLECTIBLE ABILITIES GUIDE */}
      {showAbilitiesSheet && (
        <div
          className="absolute inset-0 z-40 bg-zinc-950/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-3"
          onClick={() => setShowAbilitiesSheet(false)}
        >
          <div
            className="bg-white text-zinc-900 border-2 border-zinc-900 rounded-2xl w-full max-h-[85%] overflow-y-auto p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
              <h2 className="font-display font-extrabold text-base flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#FF6A3D]" />
                Coleccionables & Poderes en Escena
              </h2>
              <button
                onClick={() => setShowAbilitiesSheet(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {JUMP_ABILITIES.map((ab) => (
                <div
                  key={ab.id}
                  className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-start gap-2.5"
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-zinc-900 mt-1 shrink-0"
                    style={{ backgroundColor: ab.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display font-bold text-xs text-zinc-900">{ab.name}</span>
                      <span className="text-[10px] font-mono-tabular font-bold text-zinc-600">
                        {ab.durationText}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 mt-0.5 leading-snug">{ab.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* IN-GAME MODAL 2: 1V1 ONLINE MULTIPLAYER & VOICE ROOM */}
      {showOnlineSheet && (
        <div
          className="absolute inset-0 z-40 bg-zinc-950/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-3"
          onClick={() => setShowOnlineSheet(false)}
        >
          <div
            className="bg-white text-zinc-900 border-2 border-zinc-900 rounded-2xl w-full max-h-[88%] overflow-y-auto p-4 space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
              <div>
                <h2 className="font-display font-extrabold text-base flex items-center gap-1.5">
                  <Swords className="w-4 h-4 text-[#FF6A3D]" />
                  Carrera Dual · El que llegue más alto gana
                </h2>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                  <Wifi className={`w-3 h-3 ${connected ? 'text-emerald-600' : 'text-zinc-400'}`} />
                  <span>{connected ? 'Conectado' : 'Reconectando'}</span>
                  <span>·</span>
                  <span>{onlineCount} en línea</span>
                  {pingMs !== null && <span>· {pingMs}ms</span>}
                </div>
              </div>
              <button
                onClick={() => setShowOnlineSheet(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Google Account Banner for 1v1 Friends */}
            {!isGoogleSignedIn && onLoginGoogle && (
              <div className="bg-zinc-950 text-white rounded-xl p-3 space-y-2">
                <div className="text-[11px] font-bold text-amber-300">
                  Conecta tu cuenta Google para jugar 1 vs 1 con amigos
                </div>
                <button
                  onClick={onLoginGoogle}
                  disabled={authBusy}
                  className="w-full py-2 px-3 rounded-lg bg-white text-zinc-900 text-xs font-extrabold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true">
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

            {/* Direct Friend Dual Race Challenges */}
            {friends.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-zinc-700 flex items-center justify-between">
                  <span>Retar a un amigo 1 vs 1</span>
                  <span className="text-[10px] text-zinc-500">
                    {friends.filter((f) => f.online).length} en línea
                  </span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {friends.map((friend) => (
                    <div
                      key={friend.playerName}
                      className="flex items-center justify-between gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-1.5 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            friend.online ? 'bg-emerald-500' : 'bg-zinc-300'
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="font-bold truncate">
                            {friend.playerName}{' '}
                            <span className="text-[10px] text-zinc-500">[{friend.clanTag}]</span>
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            {friend.online ? 'En línea ahora' : 'Desconectado'} · ELO {friend.elo}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          onSendDuelInvite(friend.playerName, selectedArenaId, friend.clientId)
                        }
                        disabled={!friend.online}
                        className="mokaya-btn bg-[#FF6A3D] text-white px-2.5 py-1 rounded-lg text-[11px] font-bold disabled:opacity-40 shrink-0"
                      >
                        Retar 1 vs 1
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              isGoogleSignedIn &&
              onOpenFriendsTab && (
                <button
                  onClick={() => {
                    setShowOnlineSheet(false);
                    onOpenFriendsTab();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-zinc-100 border border-zinc-300 text-xs font-bold text-zinc-800 hover:bg-zinc-200"
                >
                  + Agregar amigos con cuenta Google
                </button>
              )
            )}

            {/* Voice Quick Toggle */}
            <div className="flex items-center justify-between bg-zinc-950 text-white rounded-xl p-2.5 text-xs">
              <span className="font-semibold">Chat de Voz WebRTC</span>
              {voiceChannel ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={onToggleMic}
                    className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 ${
                      micMuted ? 'bg-zinc-700' : 'bg-emerald-500 text-zinc-950'
                    }`}
                  >
                    {micMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                    {micMuted ? 'Mute' : `${Math.round(micLevel * 100)}%`}
                  </button>
                  <button
                    onClick={onLeaveVoice}
                    className="px-2 py-1 rounded-lg bg-rose-600 font-bold"
                  >
                    Salir
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onJoinVoice(activeRoom ? `sala-${activeRoom.code}` : 'arena-global')}
                  className="px-3 py-1 rounded-lg bg-emerald-500 text-zinc-950 font-bold flex items-center gap-1"
                >
                  <Mic className="w-3 h-3" /> Conectar Voz
                </button>
              )}
            </div>

            {duelStatusNotice && (
              <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                {duelStatusNotice}
              </div>
            )}

            {roomError && (
              <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {roomError}
              </div>
            )}

            {/* Starting District Picker for 1v1 */}
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-zinc-700">Escenario inicial del duelo</div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {JUMP_BIOMES.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => onSelectArena(b.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border ${
                      selectedArenaId === b.id
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Matchmaking & Friend Rooms */}
            <div className="space-y-2.5">
              {matchmakingWaiting ? (
                <button
                  onClick={onCancelMatchmaking}
                  className="mokaya-btn w-full bg-amber-400 text-zinc-900 py-2.5 rounded-xl text-xs font-bold"
                >
                  Buscando rival... (Cancelar)
                </button>
              ) : (
                <button
                  onClick={() => onQueueMatchmaking(selectedArenaId)}
                  disabled={!connected}
                  className="mokaya-btn w-full bg-[#FF6A3D] text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Trophy className="w-3.5 h-3.5" /> Matchmaking 1 vs 1 Automático
                </button>
              )}

              {createdRoomCode ? (
                <div className="flex items-center justify-between bg-zinc-100 border-2 border-zinc-900 rounded-xl px-3 py-2 text-xs">
                  <span>
                    Código de sala: <strong className="font-mono-tabular text-sm">{createdRoomCode}</strong>
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="px-2.5 py-1 rounded-lg bg-white border border-zinc-300 font-bold flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> {copiedCode ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPublicRoom((v) => !v)}
                    className="px-3 py-2 text-xs font-bold rounded-xl bg-zinc-100 border border-zinc-300"
                  >
                    {isPublicRoom ? 'Pública' : 'Privada'}
                  </button>
                  <button
                    onClick={() => onCreateRoom(selectedArenaId, isPublicRoom)}
                    disabled={!connected}
                    className="mokaya-btn flex-1 bg-[#8B7CE8] text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Users className="w-3.5 h-3.5" /> Crear Sala con Amigos
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="CÓDIGO SALA"
                  className="flex-1 px-3 py-2 text-xs font-mono-tabular font-bold uppercase bg-zinc-50 border-2 border-zinc-900 rounded-xl focus:outline-none"
                />
                <button
                  onClick={() => joinCodeInput.trim() && onJoinRoom(joinCodeInput)}
                  disabled={!connected || !joinCodeInput.trim()}
                  className="mokaya-btn bg-zinc-900 text-white px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  Unirse
                </button>
              </div>
            </div>

            {openRooms.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-zinc-200">
                <div className="text-xs font-bold text-zinc-700">Salas Abiertas</div>
                {openRooms.map((room) => {
                  const stageName =
                    ARENA_STAGES.find((a) => a.id === room.arenaId)?.name ?? room.arenaId;
                  return (
                    <div
                      key={room.code}
                      className="flex items-center justify-between gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold truncate">{room.hostName}</div>
                        <div className="text-[11px] text-zinc-500">
                          {stageName} · [{room.code}]
                        </div>
                      </div>
                      <button
                        onClick={() => onJoinRoom(room.code)}
                        className="mokaya-btn bg-white px-3 py-1.5 rounded-lg text-xs font-bold shrink-0"
                      >
                        Jugar
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
