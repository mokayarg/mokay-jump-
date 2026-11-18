import {
  JUMP_BIOMES,
  PETS,
  PetId,
  VISUAL_SKILLS,
  VisualSkillId,
} from '../data/mokayaData';
import type { PetCompanion } from '../data/mokayaData';

const INK = '#18181B';

const characterImageCache = new Map<PetId, HTMLImageElement>();
const biomeImageCache = new Map<string, HTMLImageElement>();

export function preloadMokayaSprites() {
  if (typeof Image === 'undefined') return;
  for (const pet of PETS) {
    if (!characterImageCache.has(pet.id)) {
      const img = new Image();
      img.decoding = 'async';
      img.src = pet.imageUrl;
      characterImageCache.set(pet.id, img);
    }
  }
  for (const biome of JUMP_BIOMES) {
    if (!biomeImageCache.has(biome.imageUrl)) {
      const img = new Image();
      img.decoding = 'async';
      img.src = biome.imageUrl;
      biomeImageCache.set(biome.imageUrl, img);
    }
  }
}

export function getCachedCharacterImage(petId: PetId): HTMLImageElement | undefined {
  if (!characterImageCache.has(petId)) {
    preloadMokayaSprites();
  }
  return characterImageCache.get(petId);
}

export function getCachedBiomeImage(url: string): HTMLImageElement | undefined {
  if (!biomeImageCache.has(url)) {
    preloadMokayaSprites();
  }
  return biomeImageCache.get(url);
}

function getPetOrDefault(petId: PetId): PetCompanion {
  return PETS.find((p) => p.id === petId) ?? PETS[0];
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function drawCrown(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  fill = '#FACC15'
) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy);
  ctx.lineTo(cx - w * 0.62, cy - h * 0.78);
  ctx.lineTo(cx - w * 0.25, cy - h * 0.36);
  ctx.lineTo(cx, cy - h);
  ctx.lineTo(cx + w * 0.25, cy - h * 0.36);
  ctx.lineTo(cx + w * 0.62, cy - h * 0.78);
  ctx.lineTo(cx + w / 2, cy);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export interface MascotDrawOptions {
  x: number;
  y: number;
  facing: 1 | -1;
  scale?: number;
  stageLevel?: 1 | 2 | 3;
  timeSec?: number;
  cryText?: string;
  cheering?: boolean;
}

export function drawVectorMascot(
  ctx: CanvasRenderingContext2D,
  petId: PetId,
  opts: MascotDrawOptions
) {
  const pet = getPetOrDefault(petId);
  const img = getCachedCharacterImage(pet.id);
  const sc = opts.scale ?? 1;
  const stageLevel = opts.stageLevel ?? 1;
  const t = opts.timeSec ?? 0;

  const isMiniSpirit = pet.id === 'sparky' || pet.id === 'nubi';
  const maxH = isMiniSpirit ? 66 : 86;
  const maxW = isMiniSpirit ? 64 : 74;
  const bottomY = 26;

  let drawW = 54;
  let drawH = maxH;
  const ready = Boolean(img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
  if (ready && img) {
    const fit = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
    drawW = img.naturalWidth * fit;
    drawH = img.naturalHeight * fit;
  }

  ctx.save();
  ctx.translate(opts.x, opts.y);

  // Subtle ground hover shadow
  ctx.save();
  ctx.fillStyle = 'rgba(10, 10, 14, 0.24)';
  ctx.beginPath();
  ctx.ellipse(0, (bottomY + 4) * sc, Math.max(18, drawW * 0.36) * sc, 5.5 * sc, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (stageLevel >= 2) {
    ctx.save();
    const auraCenterY = (bottomY - drawH * 0.5) * sc;
    const auraR = Math.max(drawW, drawH) * 0.54 * sc;
    const glow = ctx.createRadialGradient(0, auraCenterY, 4, 0, auraCenterY, auraR * 1.15);
    glow.addColorStop(0, `${pet.primaryColor}38`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, auraCenterY, auraR * 1.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = pet.secondaryColor;
    ctx.lineWidth = 2.2;
    ctx.setLineDash([5, 4]);
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(0, auraCenterY, auraR, t * 2.2, t * 2.2 + Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const cheerOffset = opts.cheering ? -Math.abs(Math.sin(t * 9)) * 7 : 0;
  const breathY = 1 + Math.sin(t * 4.2) * 0.016;
  const breathX = 1 - Math.sin(t * 4.2) * 0.012;
  const flipX = opts.facing * pet.naturalFacing < 0 ? -1 : 1;

  ctx.save();
  ctx.translate(0, cheerOffset * sc);

  if (ready && img) {
    ctx.save();
    ctx.scale(flipX * sc * breathX, sc * breathY);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, -drawW / 2, bottomY - drawH, drawW, drawH);
    ctx.restore();
  }

  if (stageLevel === 3) {
    ctx.save();
    ctx.scale(sc, sc);
    drawCrown(ctx, 0, bottomY - drawH - 2, 18, 12, '#FACC15');
    ctx.restore();
  }
  ctx.restore();

  if (opts.cryText) {
    ctx.save();
    ctx.font = '800 11px "Bricolage Grotesque", sans-serif';
    const textW = ctx.measureText(opts.cryText).width + 14;
    const crownPad = stageLevel === 3 ? 16 : 6;
    const bubbleY = (bottomY - drawH - crownPad - 12 + cheerOffset) * sc;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    roundRectPath(ctx, -textW / 2, bubbleY - 10, textW, 20, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(opts.cryText, 0, bubbleY);
    ctx.restore();
  }

  ctx.restore();
}

export interface JumperDrawOptions {
  x: number;
  y: number; // bottom feet Y coordinate
  facing: 1 | -1;
  scaleX?: number;
  scaleY?: number;
  tiltRad?: number;
  stageLevel?: 1 | 2 | 3;
  visualSkillId?: VisualSkillId;
  timeSec: number;
  jetpackActive?: boolean;
  shieldActive?: boolean;
  magnetActive?: boolean;
  bootsActive?: boolean;
  laserActive?: boolean;
  shadesActive?: boolean;
  boomboxActive?: boolean;
  cryText?: string;
}

/**
 * Draws the player's chosen 100% original Mokaya character inside the vertical
 * Mokay Jump engine, complete with squash/stretch, tilt, and visually represented
 * temporary streetwear abilities.
 */
export function drawMokayaJumper(
  ctx: CanvasRenderingContext2D,
  petId: PetId,
  opts: JumperDrawOptions
) {
  const pet = getPetOrDefault(petId);
  const img = getCachedCharacterImage(pet.id);
  const skill = VISUAL_SKILLS.find((s) => s.id === opts.visualSkillId) ?? VISUAL_SKILLS[0];
  const t = opts.timeSec;
  const stageLevel = opts.stageLevel ?? 1;

  const isMini = pet.id === 'sparky' || pet.id === 'nubi';
  const maxH = isMini ? 68 : 88;
  const maxW = isMini ? 68 : 78;

  let drawW = 58;
  let drawH = maxH;
  const ready = Boolean(img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
  if (ready && img) {
    const fit = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
    drawW = img.naturalWidth * fit;
    drawH = img.naturalHeight * fit;
  }

  const sx = opts.scaleX ?? 1;
  const sy = opts.scaleY ?? 1;
  const centerY = -drawH * 0.5;

  ctx.save();
  ctx.translate(opts.x, opts.y);

  // Boombox x2 Pulsing Equalizer Soundwave Rings
  if (opts.boomboxActive) {
    ctx.save();
    for (let i = 0; i < 2; i++) {
      const phase = ((t * 2.4 + i * 0.5) % 1);
      const rad = 28 + phase * 34;
      ctx.strokeStyle = i === 0 ? '#F43F5E' : '#FACC15';
      ctx.lineWidth = 2.6;
      ctx.globalAlpha = (1 - phase) * 0.85;
      ctx.beginPath();
      ctx.ellipse(0, centerY + 12, rad, rad * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Gorra Imán Pulse Rings
  if (opts.magnetActive) {
    ctx.save();
    const r1 = 36 + ((t * 48) % 24);
    ctx.strokeStyle = '#A855F7';
    ctx.lineWidth = 2.4;
    ctx.globalAlpha = Math.max(0, 1 - (r1 - 36) / 24) * 0.85;
    ctx.beginPath();
    ctx.arc(0, centerY, r1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Gafas Flow Slow-Fall Cyan Wind Streaks
  if (opts.shadesActive) {
    ctx.save();
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.78;
    for (const wx of [-26, 26]) {
      const wy = centerY + ((t * 60 + Math.abs(wx)) % 36) - 18;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx, wy + 14);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Stage 2+ / Visual Skill / Active Power Halo behind character
  if (stageLevel >= 2 || opts.jetpackActive || opts.bootsActive || opts.boomboxActive) {
    ctx.save();
    const glowColor = opts.jetpackActive
      ? '#FF6A3D'
      : opts.bootsActive
      ? '#FACC15'
      : opts.boomboxActive
      ? '#F43F5E'
      : skill.accentColor;
    const rad = Math.max(drawW, drawH) * 0.68;
    const grad = ctx.createRadialGradient(0, centerY, 4, 0, centerY, rad);
    grad.addColorStop(0, `${glowColor}58`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, centerY, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Mochila Cohete Thruster Exhaust Cone
  if (opts.jetpackActive) {
    ctx.save();
    const flicker = Math.sin(t * 42) * 8;
    ctx.fillStyle = '#FF6A3D';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-16, -6);
    ctx.lineTo(-6, 30 + flicker);
    ctx.lineTo(0, 16);
    ctx.lineTo(8, 34 - flicker * 0.6);
    ctx.lineTo(16, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FDE047';
    ctx.beginPath();
    ctx.moveTo(-9, -4);
    ctx.lineTo(0, 22 + flicker * 0.5);
    ctx.lineTo(9, -4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Character Body (100% Original Mokaya Artwork with squash/stretch & direction)
  const flipX = opts.facing * pet.naturalFacing < 0 ? -1 : 1;
  ctx.save();
  ctx.rotate(opts.tiltRad ?? 0);
  ctx.scale(flipX * sx, sy);

  if (ready && img) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.38)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.drawImage(img, -drawW / 2, -drawH, drawW, drawH);
    ctx.shadowColor = 'transparent';
  } else {
    ctx.fillStyle = pet.primaryColor;
    ctx.beginPath();
    ctx.arc(0, centerY, 22, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Turbo de Zapatillas: Winged Chunky Turbo Sneakers + Speed Chevrons near feet
  if (opts.bootsActive && !opts.jetpackActive) {
    ctx.save();
    ctx.rotate(opts.tiltRad ?? 0);
    for (const dir of [-1, 1]) {
      const sxFoot = dir * 14;
      const bob = Math.sin(t * 22 + dir) * 2.5;
      // Glowing chunky sneaker sole
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      roundRectPath(ctx, sxFoot - 9, -8 + bob, 18, 9, 4);
      ctx.fill();
      ctx.stroke();
      // White midsole stripe
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(sxFoot - 6, -3 + bob, 12, 2.5);
      // Little turbo wing
      ctx.fillStyle = '#FF6A3D';
      ctx.beginPath();
      ctx.moveTo(sxFoot + dir * 7, -6 + bob);
      ctx.lineTo(sxFoot + dir * 18, -12 + bob);
      ctx.lineTo(sxFoot + dir * 13, -3 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // Stage 3 Golden Crown
  if (stageLevel === 3) {
    ctx.save();
    ctx.rotate(opts.tiltRad ?? 0);
    drawCrown(ctx, 0, -drawH * sy - 2, 18, 12, '#FACC15');
    ctx.restore();
  }

  // Escudo de Hoodie: Energy Hoodie Hood + Drawstrings + Protective Teal Dome
  if (opts.shieldActive) {
    ctx.save();
    const shieldR = Math.max(drawW, drawH) * 0.64;
    const pulse = 1 + Math.sin(t * 6) * 0.03;

    // Outer translucent teal hoodie energy dome
    ctx.strokeStyle = '#2DD4BF';
    ctx.fillStyle = 'rgba(45, 212, 191, 0.17)';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(0, centerY, shieldR * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Stylized Hoodie Hood Silhouette Arc over upper dome + Drawstrings
    ctx.strokeStyle = '#99F6E4';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, centerY - 4, shieldR * 0.88 * pulse, -2.55, -0.59);
    ctx.stroke();

    // Glowing hoodie drawstrings at front bottom of dome
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-7, centerY + shieldR * 0.48);
    ctx.lineTo(-9, centerY + shieldR * 0.78);
    ctx.moveTo(7, centerY + shieldR * 0.48);
    ctx.lineTo(9, centerY + shieldR * 0.78);
    ctx.stroke();
    ctx.restore();
  }

  // Gafas Flow: Holographic Cyan Visor Badge floating by brow
  if (opts.shadesActive) {
    ctx.save();
    const visorY = -drawH * sy * 0.66;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.78)';
    ctx.strokeStyle = '#18181B';
    ctx.lineWidth = 2;
    roundRectPath(ctx, -18, visorY - 5, 16, 10, 3);
    ctx.fill();
    ctx.stroke();
    roundRectPath(ctx, 2, visorY - 5, 16, 10, 3);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-2, visorY);
    ctx.lineTo(2, visorY);
    ctx.stroke();
    ctx.restore();
  }

  // Spray Láser: Orbiting Neon Nozzle Indicator above head
  if (opts.laserActive) {
    ctx.save();
    const orbY = -drawH * sy - (stageLevel === 3 ? 20 : 10);
    ctx.fillStyle = '#EC4899';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, orbY, 6 + Math.sin(t * 14) * 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Callout Speech Bubble on powerup / big bounce
  if (opts.cryText) {
    ctx.save();
    ctx.font = '800 11px "Bricolage Grotesque", sans-serif';
    const textW = ctx.measureText(opts.cryText).width + 14;
    const bubbleY = -drawH * sy - (stageLevel === 3 ? 28 : 16);
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    roundRectPath(ctx, -textW / 2, bubbleY - 10, textW, 20, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(opts.cryText, 0, bubbleY);
    ctx.restore();
  }

  ctx.restore();
}

export type CollectibleCanvasKind =
  | 'spark'
  | 'boots'
  | 'shield'
  | 'jetpack'
  | 'magnet'
  | 'laser'
  | 'shades'
  | 'boombox';

/**
 * Draws crisp custom 2D vector streetwear collectibles on the game canvas
 * (never relies on inconsistent system emojis).
 */
export function drawCollectibleIcon(
  ctx: CanvasRenderingContext2D,
  kind: CollectibleCanvasKind,
  x: number,
  y: number,
  tSec: number
) {
  ctx.save();
  ctx.translate(x, y);

  if (kind === 'spark') {
    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, 11.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FF6A3D';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  const palette: Record<Exclude<CollectibleCanvasKind, 'spark'>, string> = {
    boots: '#FACC15',
    shield: '#2DD4BF',
    jetpack: '#FF6A3D',
    magnet: '#A855F7',
    laser: '#EC4899',
    shades: '#38BDF8',
    boombox: '#F43F5E',
  };
  const bg = palette[kind];

  // Outer glowing aura
  ctx.fillStyle = `${bg}44`;
  ctx.beginPath();
  ctx.arc(0, 0, 22 + Math.sin(tSec * 7) * 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Badge Frame
  ctx.fillStyle = '#18181B';
  ctx.strokeStyle = bg;
  ctx.lineWidth = 2.4;
  roundRectPath(ctx, -16, -16, 32, 32, 9);
  ctx.fill();
  ctx.stroke();

  // Inner Vector Streetwear Icon
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.8;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (kind === 'boots') {
    // Chunky Sneaker Silhouette + Wing
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.moveTo(-9, 6);
    ctx.lineTo(10, 6);
    ctx.lineTo(10, 1);
    ctx.lineTo(3, -1);
    ctx.lineTo(0, -7);
    ctx.lineTo(-9, -7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-8, 4, 17, 2.5);
  } else if (kind === 'shield') {
    // Escudo de Hoodie (Hoodie silhouette inside shield outline)
    ctx.fillStyle = '#2DD4BF';
    ctx.beginPath();
    ctx.moveTo(-9, -2);
    ctx.quadraticCurveTo(0, -13, 9, -2);
    ctx.lineTo(10, 7);
    ctx.lineTo(5, 7);
    ctx.lineTo(5, 3);
    ctx.lineTo(-5, 3);
    ctx.lineTo(-5, 7);
    ctx.lineTo(-10, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Drawstrings
    ctx.beginPath();
    ctx.moveTo(-2.5, 0);
    ctx.lineTo(-2.5, 6);
    ctx.moveTo(2.5, 0);
    ctx.lineTo(2.5, 6);
    ctx.stroke();
  } else if (kind === 'jetpack') {
    // Rocket Backpack
    ctx.fillStyle = '#FF6A3D';
    roundRectPath(ctx, -7, -9, 14, 15, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FDE047';
    ctx.beginPath();
    ctx.moveTo(-4, 6);
    ctx.lineTo(0, 12);
    ctx.lineTo(4, 6);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'magnet') {
    // U-Magnet
    ctx.strokeStyle = '#C084FC';
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.arc(0, -2, 7.5, Math.PI, 0, false);
    ctx.lineTo(7.5, 7);
    ctx.moveTo(-7.5, -2);
    ctx.lineTo(-7.5, 7);
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-9.5, 4, 4, 4);
    ctx.fillRect(5.5, 4, 4, 4);
  } else if (kind === 'laser') {
    // Spray Can
    ctx.fillStyle = '#EC4899';
    roundRectPath(ctx, -6, -4, 12, 13, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-3, -9, 6, 4);
    ctx.fillStyle = '#FDE047';
    ctx.beginPath();
    ctx.arc(5, -8, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'shades') {
    // Streetwear Shades
    ctx.fillStyle = '#38BDF8';
    roundRectPath(ctx, -11, -4, 9, 7, 2);
    ctx.fill();
    ctx.stroke();
    roundRectPath(ctx, 2, -4, 9, 7, 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-2, -1);
    ctx.lineTo(2, -1);
    ctx.stroke();
  } else if (kind === 'boombox') {
    // Retro Boombox
    ctx.fillStyle = '#F43F5E';
    roundRectPath(ctx, -10, -5, 20, 13, 3);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-5, -5);
    ctx.lineTo(-5, -9);
    ctx.lineTo(5, -9);
    ctx.lineTo(5, -5);
    ctx.stroke();
    ctx.fillStyle = '#18181B';
    ctx.beginPath();
    ctx.arc(-5, 2, 3, 0, Math.PI * 2);
    ctx.arc(5, 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

