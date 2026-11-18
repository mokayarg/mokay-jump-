import React, { useEffect, useRef, useState } from 'react';
import {
  JUMP_BIOMES,
  PETS,
  PlayerLoadout,
  STYLE_RANKS,
  VISUAL_SKILLS,
  WARDROBE_ITEMS,
  WardrobeSlot,
  computeStylePoints,
  getPetStage,
  getStyleRank,
} from '../data/mokayaData';
import {
  drawMokayaJumper,
  getCachedBiomeImage,
  preloadMokayaSprites,
} from '../engine/fighterRenderer';
import { MascotVectorPortrait } from './VectorPortrait';
import { Check, Dices, Lock, Rocket, Shield, Sparkles } from 'lucide-react';

interface WardrobeStudioProps {
  loadout: PlayerLoadout;
  onUpdateLoadout: (updater: (prev: PlayerLoadout) => PlayerLoadout) => void;
  onGoToArena: () => void;
}

type JumpPreviewMode = 'bounce' | 'boots' | 'shield' | 'jetpack' | 'shades' | 'boombox';

const SLOT_LABELS: { id: WardrobeSlot; label: string }[] = [
  { id: 'top', label: 'Camisetas' },
  { id: 'bottom', label: 'Pantalones' },
  { id: 'headwear', label: 'Gorras' },
  { id: 'sneakers', label: 'Zapas' },
  { id: 'accessory', label: 'Accesorios' },
];

export const WardrobeStudio: React.FC<WardrobeStudioProps> = ({
  loadout,
  onUpdateLoadout,
  onGoToArena,
}) => {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeSlot, setActiveSlot] = useState<WardrobeSlot>('top');
  const [previewMode, setPreviewMode] = useState<JumpPreviewMode>('boots');
  const [showRefSheet, setShowRefSheet] = useState(false);

  const selectedPet = PETS.find((p) => p.id === loadout.petId) ?? PETS[0];
  const petStage = getPetStage(selectedPet, loadout.petXp);

  const stylePoints = computeStylePoints(loadout.clothes);
  const styleRank = getStyleRank(stylePoints);
  const nextRank = STYLE_RANKS.find((r) => r.minPoints > stylePoints) ?? null;

  const previewBiome =
    JUMP_BIOMES.find((b) =>
      b.name.toLowerCase().includes(selectedPet.district.toLowerCase().split(' ')[0])
    ) ?? JUMP_BIOMES[0];

  useEffect(() => {
    preloadMokayaSprites();
  }, []);

  useEffect(() => {
    let raf = 0;
    const render = (now: number) => {
      const canvas = previewCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const t = now / 1000;
          const W = canvas.width;
          const H = canvas.height;
          ctx.clearRect(0, 0, W, H);

          const grad = ctx.createLinearGradient(0, 0, 0, H);
          grad.addColorStop(0, previewBiome.skyTop);
          grad.addColorStop(1, previewBiome.skyBottom);
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, W, H);

          const bgImg = getCachedBiomeImage(previewBiome.imageUrl);
          if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
            const scale = Math.max(W / bgImg.naturalWidth, H / bgImg.naturalHeight);
            const dw = bgImg.naturalWidth * scale;
            const dh = bgImg.naturalHeight * scale;
            const scrollY = (t * 16) % Math.max(1, dh - H);
            ctx.save();
            ctx.globalAlpha = 0.88;
            ctx.drawImage(bgImg, (W - dw) / 2, -scrollY * 0.35, dw, dh);
            ctx.restore();
          }

          ctx.fillStyle = 'rgba(10, 10, 18, 0.22)';
          ctx.fillRect(0, 0, W, H);

          const platY = H - 36;
          const platW = 138;
          const platX = W / 2 - platW / 2;
          ctx.fillStyle = previewBiome.platformColor;
          ctx.strokeStyle = '#18181B';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(platX, platY, platW, 16, 8);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = previewBiome.platformRim;
          ctx.beginPath();
          ctx.roundRect(platX + 4, platY + 2, platW - 8, 5, 3);
          ctx.fill();

          const cycle = (t * 1.45) % 1;
          const arc = Math.sin(cycle * Math.PI);
          const feetY =
            previewMode === 'jetpack'
              ? H - 90 + Math.sin(t * 7) * 8
              : platY - arc * 78;

          const squash =
            previewMode === 'jetpack'
              ? 1
              : cycle < 0.1 || cycle > 0.9
              ? 1.1
              : 0.95;
          const stretch = previewMode === 'jetpack' ? 1.04 : 2 - squash;

          drawMokayaJumper(ctx, loadout.petId, {
            x: W / 2,
            y: feetY,
            facing: Math.sin(t * 1.1) >= 0 ? 1 : -1,
            scaleX: squash,
            scaleY: stretch,
            tiltRad: Math.sin(t * 2.2) * 0.08,
            stageLevel: petStage.level,
            visualSkillId: loadout.visualSkillId,
            timeSec: t,
            jetpackActive: previewMode === 'jetpack',
            shieldActive: previewMode === 'shield',
            bootsActive: previewMode === 'boots',
            shadesActive: previewMode === 'shades',
            boomboxActive: previewMode === 'boombox',
            cryText:
              previewMode === 'boots'
                ? '¡TURBO!'
                : previewMode === 'shield'
                ? '¡HOODIE!'
                : previewMode === 'boombox'
                ? '¡BOOM x2!'
                : undefined,
          });
        }
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [loadout.petId, loadout.visualSkillId, petStage.level, previewBiome, previewMode]);

  const handleRandomizeClothes = () => {
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const tops = WARDROBE_ITEMS.filter((i) => i.slot === 'top');
    const bottoms = WARDROBE_ITEMS.filter((i) => i.slot === 'bottom');
    const heads = WARDROBE_ITEMS.filter((i) => i.slot === 'headwear');
    const snks = WARDROBE_ITEMS.filter((i) => i.slot === 'sneakers');
    const accs = WARDROBE_ITEMS.filter((i) => i.slot === 'accessory');

    onUpdateLoadout((prev) => ({
      ...prev,
      clothes: {
        top: pick(tops).id,
        bottom: pick(bottoms).id,
        headwear: pick(heads).id,
        sneakers: pick(snks).id,
        accessory: pick(accs).id,
      },
    }));
  };

  const slotItems = WARDROBE_ITEMS.filter((item) => item.slot === activeSlot);

  return (
    <div className="space-y-4 pb-3">
      {/* Live Character & Power-Up Preview Card */}
      <div className="mokaya-card rounded-2xl overflow-hidden">
        <div className="px-3.5 py-2.5 border-b-2 border-zinc-900 flex items-center justify-between bg-white">
          <div className="min-w-0">
            <div className="font-display font-extrabold text-base truncate">{selectedPet.name}</div>
            <div className="text-[11px] text-zinc-500 truncate">
              {selectedPet.district} · {petStage.label}
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            {selectedPet.sheetImage && (
              <button
                onClick={() => setShowRefSheet((v) => !v)}
                className="text-xs font-bold underline text-zinc-800 hover:text-[#FF6A3D]"
              >
                {showRefSheet ? 'Escena' : 'Ficha'}
              </button>
            )}
            <button
              onClick={onGoToArena}
              className="mokaya-btn bg-[#FF6A3D] text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <Rocket className="w-3.5 h-3.5" /> Jugar
            </button>
          </div>
        </div>

        {showRefSheet && selectedPet.sheetImage ? (
          <div className="bg-zinc-100 p-2">
            <img
              src={selectedPet.sheetImage}
              alt={`Ficha original de ${selectedPet.name}`}
              className="w-full h-auto rounded-lg border border-zinc-300"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <canvas
            ref={previewCanvasRef}
            width={400}
            height={225}
            className="w-full h-auto block"
          />
        )}

        {/* Ability Visual Tester */}
        <div className="p-2.5 bg-white border-t-2 border-zinc-900 flex items-center gap-1.5 overflow-x-auto">
          {(
            [
              { id: 'boots', label: 'Turbo Zapas' },
              { id: 'shield', label: 'Hoodie Escudo' },
              { id: 'jetpack', label: 'Cohete' },
              { id: 'shades', label: 'Gafas Flow' },
              { id: 'boombox', label: 'Boombox' },
              { id: 'bounce', label: 'Base' },
            ] as { id: JumpPreviewMode; label: string }[]
          ).map((mode) => (
            <button
              key={mode.id}
              onClick={() => setPreviewMode(mode.id)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                previewMode === mode.id
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Player Handle & Style Rank */}
      <div className="mokaya-card rounded-2xl p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-semibold text-zinc-500">Rango de Prendas (Cosmético)</div>
            <div className="font-display font-bold text-sm" style={{ color: styleRank.color }}>
              {styleRank.name} · {stylePoints} pts
            </div>
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold">
            {nextRank ? `Faltan ${nextRank.minPoints - stylePoints}` : 'Máximo'}
          </span>
        </div>
        <div className="h-2 bg-zinc-200 rounded-full overflow-hidden border border-zinc-300">
          <div
            className="h-full bg-[#FF6A3D] transition-all duration-200"
            style={{ width: `${Math.min(100, (stylePoints / 700) * 100)}%` }}
          />
        </div>
        <label className="block text-xs font-bold text-zinc-700">
          Nombre en Torneos
          <input
            type="text"
            maxLength={18}
            value={loadout.playerName}
            onChange={(e) =>
              onUpdateLoadout((prev) => ({
                ...prev,
                playerName: e.target.value || 'MokayerPro',
              }))
            }
            className="mt-1 w-full px-3 py-2 text-xs font-semibold bg-zinc-50 border-2 border-zinc-900 rounded-xl focus:outline-none focus:bg-white"
          />
        </label>
      </div>

      {/* 1. 12 Original Mokaya Playable Characters */}
      <section className="mokaya-card rounded-2xl p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display font-bold text-base flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#FF6A3D]" />
            Personajes Mokaya (12)
          </h2>
          <span className="text-[11px] font-mono-tabular font-bold text-zinc-600">
            {loadout.petXp} XP
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {PETS.map((pet) => {
            const active = loadout.petId === pet.id;
            const curStage = getPetStage(pet, loadout.petXp);
            return (
              <button
                key={pet.id}
                onClick={() => {
                  onUpdateLoadout((prev) => ({ ...prev, petId: pet.id }));
                }}
                className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                  active
                    ? 'border-zinc-900 bg-amber-50 shadow-[2px_2px_0px_#18181B]'
                    : 'border-zinc-200 bg-white hover:border-zinc-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MascotVectorPortrait
                    petId={pet.id}
                    stageLevel={curStage.level}
                    size={42}
                    className="rounded-lg bg-white border border-zinc-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-display font-bold text-xs truncate">{pet.name}</div>
                    <div className="text-[10px] text-zinc-500 truncate">{pet.district}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Streetwear Collection & Style Rank */}
      <section className="mokaya-card rounded-2xl p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display font-bold text-base">Prendas Streetwear</h2>
          <button
            onClick={handleRandomizeClothes}
            className="px-2.5 py-1.5 text-[11px] font-bold border-2 border-zinc-900 rounded-xl bg-zinc-100 hover:bg-amber-100 flex items-center gap-1"
          >
            <Dices className="w-3.5 h-3.5" /> Combinar
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {SLOT_LABELS.map((slot) => (
            <button
              key={slot.id}
              onClick={() => setActiveSlot(slot.id)}
              className={`px-2.5 py-1.5 text-[11px] font-bold rounded-xl border-2 whitespace-nowrap shrink-0 transition-colors ${
                activeSlot === slot.id
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-zinc-100 text-zinc-700 border-transparent hover:border-zinc-300'
              }`}
            >
              {slot.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {slotItems.map((item) => {
            const equipped = loadout.clothes[item.slot] === item.id;
            return (
              <button
                key={item.id}
                onClick={() =>
                  onUpdateLoadout((prev) => ({
                    ...prev,
                    clothes: { ...prev.clothes, [item.slot]: item.id },
                  }))
                }
                className={`w-full p-2.5 rounded-xl border-2 text-left transition-all flex items-center justify-between gap-2.5 ${
                  equipped
                    ? 'border-zinc-900 bg-orange-50 shadow-[2px_2px_0px_#18181B]'
                    : 'border-zinc-200 bg-white hover:border-zinc-400'
                }`}
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-md border border-zinc-900 shrink-0"
                      style={{
                        background:
                          item.primaryColor === 'transparent'
                            ? '#E4E4E7'
                            : `linear-gradient(135deg, ${item.primaryColor} 55%, ${item.secondaryColor} 55%)`,
                      }}
                    />
                    <span className="font-display font-bold text-xs truncate">{item.name}</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate">
                    {item.collection} · +{item.stylePoints} Estilo
                  </div>
                </div>
                {equipped && (
                  <span className="w-5 h-5 rounded-full bg-[#FF6A3D] text-white flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Unlockable Visual Effects */}
      <section className="mokaya-card rounded-2xl p-3.5 space-y-2.5">
        <h2 className="font-display font-bold text-base flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-[#FF6A3D]" />
          Estelas Visuales por Rango
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {VISUAL_SKILLS.map((skill) => {
            const unlocked = stylePoints >= skill.requiredStylePoints;
            const selected = loadout.visualSkillId === skill.id;
            return (
              <button
                key={skill.id}
                disabled={!unlocked}
                onClick={() =>
                  onUpdateLoadout((prev) => ({
                    ...prev,
                    visualSkillId: skill.id,
                  }))
                }
                className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                  selected
                    ? 'border-zinc-900 bg-violet-50 shadow-[2px_2px_0px_#18181B]'
                    : unlocked
                    ? 'border-zinc-200 bg-white hover:border-zinc-400'
                    : 'border-zinc-200 bg-zinc-100 opacity-65 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-display font-bold text-xs truncate">{skill.name}</span>
                  {unlocked ? (
                    <span
                      className="w-3 h-3 rounded-full border border-zinc-900 shrink-0"
                      style={{ backgroundColor: skill.accentColor }}
                    />
                  ) : (
                    <Lock className="w-3 h-3 text-zinc-500 shrink-0" />
                  )}
                </div>
                <div className="text-[10px] font-semibold text-zinc-500 mt-1">
                  {unlocked ? skill.calloutWord : `Req. ${skill.requiredStylePoints} pts`}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
