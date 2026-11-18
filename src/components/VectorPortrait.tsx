import React from 'react';
import { Crown } from 'lucide-react';
import { PETS, PetId } from '../data/mokayaData';

interface MascotPortraitProps {
  petId: PetId;
  stageLevel?: 1 | 2 | 3;
  size?: number;
  className?: string;
}

export const MascotVectorPortrait: React.FC<MascotPortraitProps> = ({
  petId,
  stageLevel = 1,
  size = 44,
  className = '',
}) => {
  const pet = PETS.find((p) => p.id === petId) ?? PETS[0];

  return (
    <div
      style={{
        width: size,
        height: size,
        boxShadow: stageLevel >= 2 ? `0 0 0 2px ${pet.secondaryColor}` : undefined,
      }}
      className={`relative inline-flex items-center justify-center shrink-0 p-1 select-none ${className}`}
    >
      <img
        src={pet.imageUrl}
        alt={pet.name}
        className="w-full h-full object-contain drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)]"
        draggable={false}
        referrerPolicy="no-referrer"
      />
      {stageLevel === 3 && size >= 40 && (
        <span
          title="Etapa 3 · Corona Mokaya"
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-400 border border-zinc-900 flex items-center justify-center shadow-xs"
        >
          <Crown className="w-2.5 h-2.5 text-zinc-900" />
        </span>
      )}
    </div>
  );
};

// Backwards-compatible alias rendering the authentic Mokaya character portrait
export const FighterVectorPortrait: React.FC<{
  petId?: PetId;
  size?: number;
  className?: string;
}> = ({ petId = 'mokay-fosforo', size = 44, className = '' }) => {
  return <MascotVectorPortrait petId={petId} size={size} className={className} />;
};
