import React, { useState } from 'react';
import { ARENA_STAGES, JUMP_BIOMES, LEVEL_METERS, WORLD_MAPS } from '../data/mokayaData';
import { Layers, MapPin, Rocket, X } from 'lucide-react';

interface WorldMapExplorerProps {
  selectedArenaId: string;
  onSelectArenaAndFight: (arenaId: string) => void;
}

export const WorldMapExplorer: React.FC<WorldMapExplorerProps> = ({
  selectedArenaId,
  onSelectArenaAndFight,
}) => {
  const [mapView, setMapView] = useState<'official' | 'isometric' | 'treeOrigin'>('official');
  const [cardMode, setCardMode] = useState<'scene' | 'map'>('scene');
  const [zoomedImage, setZoomedImage] = useState<{ src: string; title: string } | null>(null);

  const activeMapSrc = WORLD_MAPS[mapView];

  return (
    <div className="space-y-4 pb-3">
      {/* Header + Map Switcher */}
      <div className="mokaya-card rounded-2xl p-3.5 space-y-3">
        <div>
          <h1 className="font-display font-extrabold text-xl text-zinc-900">
            Escenarios & Mapa de Mokaya
          </h1>
          <p className="text-xs text-zinc-600 mt-0.5">
            Cada {LEVEL_METERS}m de ascenso atraviesas un distrito nuevo con dificultad progresiva.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100 rounded-xl border border-zinc-300">
          <button
            onClick={() => setMapView('official')}
            className={`py-1.5 text-[11px] font-bold rounded-lg ${
              mapView === 'official' ? 'bg-zinc-900 text-white' : 'text-zinc-700'
            }`}
          >
            Mapa Oficial
          </button>
          <button
            onClick={() => setMapView('isometric')}
            className={`py-1.5 text-[11px] font-bold rounded-lg ${
              mapView === 'isometric' ? 'bg-zinc-900 text-white' : 'text-zinc-700'
            }`}
          >
            Isométrica
          </button>
          <button
            onClick={() => setMapView('treeOrigin')}
            className={`py-1.5 text-[11px] font-bold rounded-lg ${
              mapView === 'treeOrigin' ? 'bg-zinc-900 text-white' : 'text-zinc-700'
            }`}
          >
            Árbol Original
          </button>
        </div>

        <div className="rounded-xl overflow-hidden bg-zinc-950 border-2 border-zinc-900 relative">
          <img
            src={activeMapSrc}
            alt="Mapa ilustrado del mundo de Mokaya"
            className="w-full max-h-[240px] object-contain mx-auto bg-zinc-950 cursor-zoom-in"
            referrerPolicy="no-referrer"
            onClick={() =>
              setZoomedImage({
                src: activeMapSrc,
                title: 'Mokaya · Planeta de la Creatividad',
              })
            }
          />
          <button
            onClick={() =>
              setZoomedImage({
                src: activeMapSrc,
                title: 'Mapa de Mokaya',
              })
            }
            className="absolute bottom-2 right-2 px-2.5 py-1 bg-white/95 border border-zinc-900 rounded-lg text-[11px] font-bold"
          >
            Ampliar
          </button>
        </div>
      </div>

      {/* Mode Switch */}
      <div className="flex items-center justify-between gap-2 px-0.5">
        <h2 className="font-display font-bold text-base">Niveles Recreación 2D</h2>
        <div className="flex items-center gap-1 p-1 bg-white rounded-xl border-2 border-zinc-900">
          <button
            onClick={() => setCardMode('scene')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg ${
              cardMode === 'scene' ? 'bg-zinc-900 text-white' : 'text-zinc-700'
            }`}
          >
            Escena 2D
          </button>
          <button
            onClick={() => setCardMode('map')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg ${
              cardMode === 'map' ? 'bg-zinc-900 text-white' : 'text-zinc-700'
            }`}
          >
            Referencia
          </button>
        </div>
      </div>

      {/* Stage Cards */}
      <div className="space-y-3.5">
        {ARENA_STAGES.map((stage, idx) => {
          const isSelected = stage.id === selectedArenaId;
          const biome = JUMP_BIOMES[idx];
          const previewImg = cardMode === 'scene' ? stage.stageImage : stage.mapImage;
          return (
            <article
              key={stage.id}
              className={`mokaya-card rounded-2xl overflow-hidden ${
                isSelected ? 'ring-2 ring-[#FF6A3D]' : ''
              }`}
            >
              <div className="grid grid-cols-[120px_1fr] items-stretch">
                <div className="relative bg-zinc-900 border-r-2 border-zinc-900">
                  <img
                    src={previewImg}
                    alt={`Escenario ${stage.name}`}
                    className="w-full h-full min-h-[148px] object-cover cursor-zoom-in"
                    referrerPolicy="no-referrer"
                    onClick={() =>
                      setZoomedImage({
                        src: previewImg,
                        title: `${stage.name} · ${stage.collection}`,
                      })
                    }
                  />
                  {biome && (
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-zinc-950/90 text-white text-[10px] font-mono-tabular font-bold flex items-center gap-1">
                      <Layers className="w-2.5 h-2.5 text-[#FF6A3D]" />
                      {biome.minMeters}m
                    </div>
                  )}
                </div>

                <div className="p-3 flex flex-col justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1 text-[10px] text-zinc-500 font-semibold">
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-[#FF6A3D] shrink-0" />
                        {stage.collection}
                      </span>
                      {isSelected && <span className="font-bold text-[#FF6A3D]">Activo</span>}
                    </div>
                    <h3 className="font-display font-extrabold text-base text-zinc-900 leading-tight">
                      Nv.{idx + 1} · {stage.name}
                    </h3>
                    <p className="text-[11px] text-zinc-600 line-clamp-2 leading-snug">
                      {stage.description}
                    </p>
                  </div>

                  <button
                    onClick={() => onSelectArenaAndFight(stage.id)}
                    className="mokaya-btn w-full bg-[#FF6A3D] text-white py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Rocket className="w-3.5 h-3.5" /> Ascender aquí
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Lightbox */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3"
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="bg-white border-2 border-zinc-900 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3.5 py-2.5 border-b-2 border-zinc-900 flex items-center justify-between">
              <span className="font-display font-bold text-sm truncate">{zoomedImage.title}</span>
              <button
                onClick={() => setZoomedImage(null)}
                className="p-1 rounded-lg hover:bg-zinc-100"
                aria-label="Cerrar vista ampliada"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-zinc-950 max-h-[75vh] overflow-auto">
              <img
                src={zoomedImage.src}
                alt={zoomedImage.title}
                className="w-full max-h-[73vh] object-contain mx-auto"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
