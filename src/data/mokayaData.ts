export type PetId =
  | 'mokay-fosforo'
  | 'mokay-caja'
  | 'bloom'
  | 'floko'
  | 'molotov'
  | 'birdy'
  | 'street-dino'
  | 'laughing-cat'
  | 'sparky'
  | 'nubi'
  | 'octo'
  | 'tintin';

export type SkinToneId = 'arena' | 'cacao' | 'marfil' | 'oliva' | 'ebano' | 'tinta-1930';
export type HairStyleId = 'fade' | 'locs' | 'afro' | 'spiky' | 'buns' | 'clean';
export type EyeStyleId = 'pie-cut' | 'star' | 'shades' | 'fierce';

export interface AvatarConfig {
  skinId: SkinToneId;
  hairId: HairStyleId;
  hairColor: string;
  eyeStyle: EyeStyleId;
}

export interface SkinToneOption {
  id: SkinToneId;
  name: string;
  color: string;
  shade: string;
}

export interface HairStyleOption {
  id: HairStyleId;
  name: string;
}

export interface EyeStyleOption {
  id: EyeStyleId;
  name: string;
}

export type WardrobeSlot = 'top' | 'bottom' | 'headwear' | 'sneakers' | 'accessory';

export type VisualSkillId =
  | 'chispa-clasica'
  | 'trazo-posca'
  | 'tinta-rubber'
  | 'explosion-beat'
  | 'llama-primigenia';

export interface WardrobeItem {
  id: string;
  name: string;
  slot: WardrobeSlot;
  collection: string;
  rarity: 'Base' | 'Drop Urbano' | 'Edición Limitada' | 'Colección Chispa';
  stylePoints: number;
  primaryColor: string;
  secondaryColor: string;
  variant: string;
  description: string;
}

export interface StyleRank {
  id: string;
  name: string;
  minPoints: number;
  color: string;
  unlockNote: string;
}

export interface VisualSkill {
  id: VisualSkillId;
  name: string;
  requiredStylePoints: number;
  accentColor: string;
  secondaryColor: string;
  calloutWord: string;
  description: string;
}

export interface PetStage {
  level: 1 | 2 | 3;
  label: string;
  minXp: number;
  visualNote: string;
}

export interface PetCompanion {
  id: PetId;
  name: string;
  title: string;
  district: string;
  quote: string;
  primaryColor: string;
  secondaryColor: string;
  cry: string;
  imageUrl: string;
  naturalFacing: 1 | -1;
  sheetImage?: string;
  stages: [PetStage, PetStage, PetStage];
}

export interface ArenaStage {
  id: string;
  name: string;
  subtitle: string;
  collection: string;
  description: string;
  mapImage: string;
  stageImage: string;
  skyTop: string;
  skyBottom: string;
  floorColor: string;
  floorLineColor: string;
  accentColor: string;
  isMonochrome?: boolean;
}

export interface PlayerLoadout {
  playerName: string;
  avatar: AvatarConfig;
  clothes: Record<WardrobeSlot, string>;
  visualSkillId: VisualSkillId;
  petId: PetId;
  petXp: number;
  wins: number;
  losses: number;
  elo: number;
  clanTag: string;
}

export const WORLD_MAPS = {
  official: '/assets/aistudio/ChatGPT_Image_8_jun_2026__20_21_35_a5d80663.png',
  isometric: '/assets/aistudio/ChatGPT_Image_8_jun_2026__22_44_53_b13ce6b4.png',
  parchment: '/assets/aistudio/ChatGPT_Image_7_jun_2026__20_50_04_f4791dee.png',
  treeOrigin: '/assets/aistudio/ChatGPT_Image_8_jun_2026__21_44_55_d23477a8.png',
};

export const SKIN_TONES: SkinToneOption[] = [
  { id: 'marfil', name: 'Marfil', color: '#F7D9C4', shade: '#E2B49A' },
  { id: 'arena', name: 'Arena Cálida', color: '#E2A679', shade: '#C58254' },
  { id: 'oliva', name: 'Oliva', color: '#C68B59', shade: '#A1683A' },
  { id: 'cacao', name: 'Cacao', color: '#8D5524', shade: '#6A3D16' },
  { id: 'ebano', name: 'Ébano', color: '#4E2E1E', shade: '#331C11' },
  { id: 'tinta-1930', name: 'Tinta 1930', color: '#F4F4F5', shade: '#D4D4D8' },
];

export const HAIR_STYLES: HairStyleOption[] = [
  { id: 'fade', name: 'Fade Urbano' },
  { id: 'locs', name: 'Locs Street' },
  { id: 'afro', name: 'Afro Chispa' },
  { id: 'spiky', name: 'Spiky Skate' },
  { id: 'buns', name: 'Coletas Beat' },
  { id: 'clean', name: 'Rapado Pro' },
];

export const HAIR_COLORS = [
  { name: 'Tinta Negra', hex: '#18181B' },
  { name: 'Chispa Naranja', hex: '#FF6A3D' },
  { name: 'Lavanda Flow', hex: '#8B7CE8' },
  { name: 'Sol Artelia', hex: '#FACC15' },
  { name: 'Rosa Bloom', hex: '#E97893' },
  { name: 'Blanco Nube', hex: '#F4F4F5' },
];

export const EYE_STYLES: EyeStyleOption[] = [
  { id: 'pie-cut', name: 'Mokaya 1930' },
  { id: 'star', name: 'Ojos Estrella' },
  { id: 'fierce', name: 'Mirada Torneo' },
  { id: 'shades', name: 'Gafas Street' },
];

export const WARDROBE_ITEMS: WardrobeItem[] = [
  // TOPS
  {
    id: 'top-tee-mokaya',
    name: 'Camiseta Chispa Base',
    slot: 'top',
    collection: 'Plaza Infinita',
    rarity: 'Base',
    stylePoints: 30,
    primaryColor: '#F4E7D1',
    secondaryColor: '#FF6A3D',
    variant: 'tee',
    description: 'Algodón pesado 280g con sello Mokaya frontal.',
  },
  {
    id: 'top-hoodie-chispa',
    name: 'Hoodie Chispa Naranja',
    slot: 'top',
    collection: 'Plaza Infinita',
    rarity: 'Drop Urbano',
    stylePoints: 75,
    primaryColor: '#FF6A3D',
    secondaryColor: '#FFC24D',
    variant: 'hoodie',
    description: 'Sudadera boxy oversize de corte callejero con capucha.',
  },
  {
    id: 'top-chaleco-violeta',
    name: 'Chaleco Violeta Zigzag',
    slot: 'top',
    collection: 'Arena Viva',
    rarity: 'Edición Limitada',
    stylePoints: 120,
    primaryColor: '#9F91E8',
    secondaryColor: '#2DD4BF',
    variant: 'vest',
    description: 'Chaleco varsity con franja geométrica turquesa.',
  },
  {
    id: 'top-camisa-nubes',
    name: 'Camisa Nubes Constelaria',
    slot: 'top',
    collection: 'Constelaria',
    rarity: 'Drop Urbano',
    stylePoints: 85,
    primaryColor: '#7DD6F3',
    secondaryColor: '#FDE047',
    variant: 'shirt',
    description: 'Camisa abierta relajada con estampado de nubes y flores.',
  },
  {
    id: 'top-chaleco-punk',
    name: 'Chaleco Denim Tachas',
    slot: 'top',
    collection: 'Sombravía',
    rarity: 'Edición Limitada',
    stylePoints: 135,
    primaryColor: '#334155',
    secondaryColor: '#EA580C',
    variant: 'punk-vest',
    description: 'Denim lavado oscuro con tachas y parches de corona.',
  },
  {
    id: 'top-oversize-coral',
    name: 'Hoodie Coral Marea',
    slot: 'top',
    collection: 'Marea Viva',
    rarity: 'Drop Urbano',
    stylePoints: 90,
    primaryColor: '#E97893',
    secondaryColor: '#6FD7C7',
    variant: 'hoodie',
    description: 'Corte ancho con detalles bioluminiscentes.',
  },
  {
    id: 'top-bomber-artelia',
    name: 'Bomber Dorada Artelia',
    slot: 'top',
    collection: 'Artelia',
    rarity: 'Colección Chispa',
    stylePoints: 170,
    primaryColor: '#D97706',
    secondaryColor: '#FEF3C7',
    variant: 'jacket',
    description: 'Chaqueta universitaria bordada con hilos dorados.',
  },

  // BOTTOMS
  {
    id: 'bot-cargo-negro',
    name: 'Cargo Negro con Cadena',
    slot: 'bottom',
    collection: 'Rhythm Hood',
    rarity: 'Drop Urbano',
    stylePoints: 85,
    primaryColor: '#18181B',
    secondaryColor: '#D4D4D8',
    variant: 'cargo',
    description: 'Bolsillos laterales tácticos y cadena metálica.',
  },
  {
    id: 'bot-bermuda-arena',
    name: 'Bermuda Cargo Arena',
    slot: 'bottom',
    collection: 'Arena Viva',
    rarity: 'Base',
    stylePoints: 40,
    primaryColor: '#78716C',
    secondaryColor: '#F5F5F4',
    variant: 'shorts',
    description: 'Bermudas frescas con medias altas para máxima movilidad.',
  },
  {
    id: 'bot-jogger-cubista',
    name: 'Jogger Cubista Picasia',
    slot: 'bottom',
    collection: 'Picasia',
    rarity: 'Edición Limitada',
    stylePoints: 115,
    primaryColor: '#4C1D95',
    secondaryColor: '#F59E0B',
    variant: 'jogger',
    description: 'Paneles asimétricos vibrantes de corte relajado.',
  },
  {
    id: 'bot-denim-tinta',
    name: 'Denim Tinta Monocromo',
    slot: 'bottom',
    collection: 'Tintópolis',
    rarity: 'Drop Urbano',
    stylePoints: 95,
    primaryColor: '#27272A',
    secondaryColor: '#FAFAFA',
    variant: 'denim',
    description: 'Pantalón recto con trazos blancos estilo años 30.',
  },
  {
    id: 'bot-short-viva',
    name: 'Bermuda Basket Viva',
    slot: 'bottom',
    collection: 'Arena Viva',
    rarity: 'Colección Chispa',
    stylePoints: 150,
    primaryColor: '#EA580C',
    secondaryColor: '#3B82F6',
    variant: 'shorts',
    description: 'Bermuda deportiva de torneo oficial Arena Viva.',
  },

  // HEADWEAR
  {
    id: 'head-sin-gorra',
    name: 'Sin Gorra (Natural)',
    slot: 'headwear',
    collection: 'Plaza Infinita',
    rarity: 'Base',
    stylePoints: 20,
    primaryColor: 'transparent',
    secondaryColor: 'transparent',
    variant: 'none',
    description: 'Luce tu peinado personalizado en la arena.',
  },
  {
    id: 'head-gorra-reversa',
    name: 'Gorra Reversa Street',
    slot: 'headwear',
    collection: 'Rhythm Hood',
    rarity: 'Drop Urbano',
    stylePoints: 80,
    primaryColor: '#F97316',
    secondaryColor: '#8B7CE8',
    variant: 'cap-back',
    description: 'Snapback con visera hacia atrás y bordado Mokaya.',
  },
  {
    id: 'head-beanie-mokay',
    name: 'Beanie Tejido MOKAY',
    slot: 'headwear',
    collection: 'Constelaria',
    rarity: 'Drop Urbano',
    stylePoints: 90,
    primaryColor: '#7C3AED',
    secondaryColor: '#FDE047',
    variant: 'beanie',
    description: 'Gorro de punto violeta con parche frontal MOKAY.',
  },
  {
    id: 'head-gorra-bloom',
    name: 'Gorra Urbana Pastel',
    slot: 'headwear',
    collection: 'Marea Viva',
    rarity: 'Edición Limitada',
    stylePoints: 115,
    primaryColor: '#F4E7D1',
    secondaryColor: '#E97893',
    variant: 'cap-front',
    description: 'Gorra bicolor suave con visera curva.',
  },
  {
    id: 'head-bandana-punk',
    name: 'Bandana Paisley Roja',
    slot: 'headwear',
    collection: 'Sombravía',
    rarity: 'Colección Chispa',
    stylePoints: 145,
    primaryColor: '#B91C1C',
    secondaryColor: '#FCA5A5',
    variant: 'bandana',
    description: 'Pañuelo anudado icónico con puntas al viento.',
  },

  // SNEAKERS
  {
    id: 'snk-kicks-lavanda',
    name: 'Kicks Lavanda Chispa',
    slot: 'sneakers',
    collection: 'Plaza Infinita',
    rarity: 'Base',
    stylePoints: 45,
    primaryColor: '#B7B0E6',
    secondaryColor: '#FFFFFF',
    variant: 'chunky',
    description: 'Zapatillas acolchadas firma de Mokaya.',
  },
  {
    id: 'snk-chunky-retro',
    name: 'Zapas Chunky M-Wave',
    slot: 'sneakers',
    collection: 'Arena Viva',
    rarity: 'Drop Urbano',
    stylePoints: 85,
    primaryColor: '#14B8A6',
    secondaryColor: '#F97316',
    variant: 'chunky',
    description: 'Suela esculpida multicolor de alto agarre.',
  },
  {
    id: 'snk-oversize-rosa',
    name: 'Sneakers Oversize Bloom',
    slot: 'sneakers',
    collection: 'Rhythm Hood',
    rarity: 'Edición Limitada',
    stylePoints: 120,
    primaryColor: '#E97893',
    secondaryColor: '#FDE047',
    variant: 'skate',
    description: 'Silueta ancha skate con cordones crema.',
  },
  {
    id: 'snk-botas-punk',
    name: 'Botas Combate Tachas',
    slot: 'sneakers',
    collection: 'Sombravía',
    rarity: 'Colección Chispa',
    stylePoints: 155,
    primaryColor: '#3F3F46',
    secondaryColor: '#DC2626',
    variant: 'boots',
    description: 'Botas con plataforma, hebillas y tachas metálicas.',
  },

  // ACCESSORIES
  {
    id: 'acc-sin-accesorio',
    name: 'Sin Accesorio',
    slot: 'accessory',
    collection: 'Plaza Infinita',
    rarity: 'Base',
    stylePoints: 15,
    primaryColor: 'transparent',
    secondaryColor: 'transparent',
    variant: 'none',
    description: 'Estilo limpio sin accesorios extra.',
  },
  {
    id: 'acc-marcador-xl',
    name: 'Marcador Mokaya XL',
    slot: 'accessory',
    collection: 'Picasia',
    rarity: 'Drop Urbano',
    stylePoints: 80,
    primaryColor: '#E97893',
    secondaryColor: '#18181B',
    variant: 'marker',
    description: 'Rotulador gigante listo para dejar tu firma en el aire.',
  },
  {
    id: 'acc-mochila-exploradora',
    name: 'Mochila Exploradora',
    slot: 'accessory',
    collection: 'Artelia',
    rarity: 'Drop Urbano',
    stylePoints: 95,
    primaryColor: '#8B7CE8',
    secondaryColor: '#FFD24D',
    variant: 'backpack',
    description: 'Mochila con corona dorada y pins coleccionables.',
  },
  {
    id: 'acc-cadena-paz',
    name: 'Collar Dorado Paz',
    slot: 'accessory',
    collection: 'Constelaria',
    rarity: 'Edición Limitada',
    stylePoints: 125,
    primaryColor: '#FACC15',
    secondaryColor: '#FEF08A',
    variant: 'chain',
    description: 'Cadena metálica dorada de gran formato.',
  },
  {
    id: 'acc-audifonos-studio',
    name: 'Audífonos Beat Lab',
    slot: 'accessory',
    collection: 'Rhythm Hood',
    rarity: 'Edición Limitada',
    stylePoints: 130,
    primaryColor: '#7C3AED',
    secondaryColor: '#22D3EE',
    variant: 'headphones',
    description: 'Cascos de estudio al cuello para entrar en ritmo.',
  },
  {
    id: 'acc-spray-graffiti',
    name: 'Lata Spray MOKAY',
    slot: 'accessory',
    collection: 'Rhythm Hood',
    rarity: 'Colección Chispa',
    stylePoints: 155,
    primaryColor: '#38BDF8',
    secondaryColor: '#FDE047',
    variant: 'spray',
    description: 'Lata de pintura callejera con emblema sonriente.',
  },
  {
    id: 'acc-chispa-aura',
    name: 'Emblema Chispa Viva',
    slot: 'accessory',
    collection: 'Árbol Original',
    rarity: 'Colección Chispa',
    stylePoints: 185,
    primaryColor: '#FF6A3D',
    secondaryColor: '#FDE047',
    variant: 'spark',
    description: 'Aura ceremonial del Árbol Original. Cosmética pura.',
  },
];

export const STYLE_RANKS: StyleRank[] = [
  {
    id: 'novato',
    name: 'Novato del Barrio',
    minPoints: 0,
    color: '#71717A',
    unlockNote: 'Estilo inicial de ingreso a Mokay Jump.',
  },
  {
    id: 'fresco',
    name: 'Estilo Fresco',
    minPoints: 250,
    color: '#0D9488',
    unlockNote: 'Desbloquea Trazo Posca Neón para ataques especiales.',
  },
  {
    id: 'coleccionista',
    name: 'Coleccionista Drop',
    minPoints: 400,
    color: '#7C3AED',
    unlockNote: 'Desbloquea Tinta Rubber-Hose 1930 en tus golpes.',
  },
  {
    id: 'icono',
    name: 'Icono de Mokaya',
    minPoints: 550,
    color: '#EA580C',
    unlockNote: 'Desbloquea Onda Graffiti Beat en combos.',
  },
  {
    id: 'leyenda',
    name: 'Leyenda Chispa Original',
    minPoints: 700,
    color: '#D97706',
    unlockNote: 'Desbloquea Llama Primigenia Dorada (100% cosmética).',
  },
];

export const VISUAL_SKILLS: VisualSkill[] = [
  {
    id: 'chispa-clasica',
    name: 'Chispa Clásica',
    requiredStylePoints: 0,
    accentColor: '#FF6A3D',
    secondaryColor: '#FFC24D',
    calloutWord: '¡CHISPA!',
    description: 'Destellos cálidos de fuego callejero. Mismo daño y frames base.',
  },
  {
    id: 'trazo-posca',
    name: 'Trazo Posca Neón',
    requiredStylePoints: 250,
    accentColor: '#EC4899',
    secondaryColor: '#2DD4BF',
    calloutWord: '¡TRAZO!',
    description: 'Salpicaduras de marcador acrílico vibrante al impactar.',
  },
  {
    id: 'tinta-rubber',
    name: 'Tinta Rubber-Hose',
    requiredStylePoints: 400,
    accentColor: '#18181B',
    secondaryColor: '#E4E4E7',
    calloutWord: '¡INK!',
    description: 'Anillos y gotas monocromas estilo animación clásica de 1930.',
  },
  {
    id: 'explosion-beat',
    name: 'Onda Graffiti Beat',
    requiredStylePoints: 550,
    accentColor: '#8B5CF6',
    secondaryColor: '#F43F5E',
    calloutWord: '¡FLOW!',
    description: 'Ondas sonoras de Rhythm Hood con estallido cromático.',
  },
  {
    id: 'llama-primigenia',
    name: 'Llama Primigenia',
    requiredStylePoints: 700,
    accentColor: '#F59E0B',
    secondaryColor: '#FB7185',
    calloutWord: '¡MOKAYA!',
    description: 'Estela áurea del Árbol Original. Cero ventaja competitiva.',
  },
];

export const PETS: PetCompanion[] = [
  {
    id: 'mokay-fosforo',
    name: 'Mokay El Fósforo',
    title: 'La Chispa Original',
    district: 'Plaza Infinita',
    quote: 'La chispa que inicia todo.',
    primaryColor: '#FF6A3D',
    secondaryColor: '#FFC24D',
    cry: '¡CHISPA!',
    imageUrl: '/assets/mascots/mokay-fosforo.png',
    naturalFacing: 1,
    sheetImage: '/assets/aistudio/ChatGPT_Image_4_jun_2026__17_59_22_38a13087.png',
    stages: [
      { level: 1, label: 'Etapa 1 · Fósforo Vivo', minXp: 0, visualNote: 'Llama encendida y guantes lavanda' },
      { level: 2, label: 'Etapa 2 · Llama Ardiente', minXp: 120, visualNote: 'Aura de chispas doradas y anillo de fuego' },
      { level: 3, label: 'Etapa 3 · Chispa Suprema', minXp: 300, visualNote: 'Corona dorada del Árbol Original' },
    ],
  },
  {
    id: 'mokay-caja',
    name: 'Mokay La Caja',
    title: 'Guardiana de la Chispa',
    district: 'Plaza Infinita',
    quote: 'Una chispa puede cambiarlo todo.',
    primaryColor: '#B7B0E6',
    secondaryColor: '#FF6A3D',
    cry: '¡MOKAY!',
    imageUrl: '/assets/mascots/mokay-caja.png',
    naturalFacing: 1,
    sheetImage: '/assets/aistudio/ChatGPT_Image_4_jun_2026__18_05_17_6e8946ef.png',
    stages: [
      { level: 1, label: 'Etapa 1 · Caja Clásica', minXp: 0, visualNote: 'Fósforos listos y ojos estrella' },
      { level: 2, label: 'Etapa 2 · Caja Encendida', minXp: 120, visualNote: 'Anillo orbital y chispas en la tapa' },
      { level: 3, label: 'Etapa 3 · Guardiana Real', minXp: 300, visualNote: 'Corona dorada y aura energética' },
    ],
  },
  {
    id: 'bloom',
    name: 'Bloom',
    title: 'The Creative Flower',
    district: 'Rhythm Hood',
    quote: 'Si puedes imaginarlo, puedes dibujarlo.',
    primaryColor: '#E97893',
    secondaryColor: '#6FD7C7',
    cry: '¡CREA!',
    imageUrl: '/assets/mascots/bloom.png',
    naturalFacing: -1,
    sheetImage: '/assets/aistudio/ChatGPT_Image_6_jun_2026__05_17_06_adaac76c.png',
    stages: [
      { level: 1, label: 'Etapa 1 · Flor Urbana', minXp: 0, visualNote: 'Pétalos coral, gorra y marcador XL' },
      { level: 2, label: 'Etapa 2 · Artista Flow', minXp: 120, visualNote: 'Estela de trazos neón y anillo creativo' },
      { level: 3, label: 'Etapa 3 · Icono Bloom', minXp: 300, visualNote: 'Corona dorada de grafiti vivo' },
    ],
  },
  {
    id: 'floko',
    name: 'Floko',
    title: 'The Inspiring Flower',
    district: 'Artelia',
    quote: 'Cada idea puede crecer.',
    primaryColor: '#FF7A00',
    secondaryColor: '#FFD24D',
    cry: '¡INSPIRA!',
    imageUrl: '/assets/mascots/floko.png',
    naturalFacing: -1,
    sheetImage: '/assets/aistudio/ChatGPT_Image_6_jun_2026__05_22_59_c97d0f3d.png',
    stages: [
      { level: 1, label: 'Etapa 1 · Flor Exploradora', minXp: 0, visualNote: 'Pétalos naranja, mochila y marcador' },
      { level: 2, label: 'Etapa 2 · Floko Luminoso', minXp: 120, visualNote: 'Destellos solares alrededor' },
      { level: 3, label: 'Etapa 3 · Maestro Artelia', minXp: 300, visualNote: 'Corona dorada y halo creativo' },
    ],
  },
  {
    id: 'molotov',
    name: 'Molotov Mokay',
    title: 'The Literal Punk',
    district: 'Sombravía',
    quote: 'Leal, directo y listo para encender la arena.',
    primaryColor: '#C2410C',
    secondaryColor: '#FCA5A5',
    cry: '¡PUNK!',
    imageUrl: '/assets/mascots/molotov.png',
    naturalFacing: 1,
    sheetImage: '/assets/aistudio/Gemini_Generated_Image_yxz9z8yxz9z8yxz9__1__6a141e55.png',
    stages: [
      { level: 1, label: 'Etapa 1 · Punk Literal', minXp: 0, visualNote: 'Chaleco con tachas y bandana roja' },
      { level: 2, label: 'Etapa 2 · Mecha Activa', minXp: 120, visualNote: 'Chispas en la bandana y anillo punk' },
      { level: 3, label: 'Etapa 3 · Leyenda Sombravía', minXp: 300, visualNote: 'Corona metálica y aura de fuego' },
    ],
  },
  {
    id: 'birdy',
    name: 'Birdy',
    title: 'El Soñador',
    district: 'Constelaria',
    quote: 'Soñar no es escapar, es crear un lugar mejor.',
    primaryColor: '#FF5A4D',
    secondaryColor: '#7DD6F3',
    cry: '¡VUELA!',
    imageUrl: '/assets/mascots/birdy.png',
    naturalFacing: 1,
    sheetImage: '/assets/aistudio/ChatGPT_Image_6_jun_2026__06_39_12_3ff507a4.png',
    stages: [
      { level: 1, label: 'Etapa 1 · Soñador Libre', minXp: 0, visualNote: 'Beanie MOKAY, camisa nubes y collar paz' },
      { level: 2, label: 'Etapa 2 · Vuelo Estelar', minXp: 120, visualNote: 'Nubecita flotante y anillo celeste' },
      { level: 3, label: 'Etapa 3 · Guardián del Cielo', minXp: 300, visualNote: 'Corona dorada sobre el beanie' },
    ],
  },
  {
    id: 'street-dino',
    name: 'Street Dino',
    title: 'T-Rex del Asfalto',
    district: 'Arena Viva',
    quote: 'Estilo pesado y paso firme en cada torneo.',
    primaryColor: '#2F855A',
    secondaryColor: '#8B7CE8',
    cry: '¡ROAR!',
    imageUrl: '/assets/mascots/street-dino.png',
    naturalFacing: 1,
    sheetImage: '/assets/aistudio/Gemini_Generated_Image_gshbj8gshbj8gshb_cc39493d.png',
    stages: [
      { level: 1, label: 'Etapa 1 · Mini Dino Street', minXp: 0, visualNote: 'Gorra reversa y chaleco zigzag' },
      { level: 2, label: 'Etapa 2 · Dino Torneo', minXp: 120, visualNote: 'Aura Arena Viva y cadena brillante' },
      { level: 3, label: 'Etapa 3 · Rey del Asfalto', minXp: 300, visualNote: 'Corona dorada sobre la snapback' },
    ],
  },
  {
    id: 'laughing-cat',
    name: 'Laughing Cat',
    title: 'Gato de la Risa Eterna',
    district: 'Rhythm Hood',
    quote: '¡Bwahaha! Ningún golpe apaga la risa.',
    primaryColor: '#18181B',
    secondaryColor: '#F97316',
    cry: 'BWAHAHA!',
    imageUrl: '/assets/mascots/laughing-cat.png',
    naturalFacing: 1,
    sheetImage: '/assets/aistudio/Gemini_Generated_Image_gshbj8gshbj8gshb_cc39493d.png',
    stages: [
      { level: 1, label: 'Etapa 1 · Gatito Callejero', minXp: 0, visualNote: 'Beanie naranja y sonrisa pícara' },
      { level: 2, label: 'Etapa 2 · Gato Chaleco Flow', minXp: 120, visualNote: 'Chaleco geométrico violeta y estela' },
      { level: 3, label: 'Etapa 3 · Rey Bwahaha', minXp: 300, visualNote: 'Corona dorada y carcajada cósmica' },
    ],
  },
  {
    id: 'sparky',
    name: 'Sparky',
    title: 'Espíritu del Árbol',
    district: 'Árbol Original',
    quote: 'Nacido de la Llama Primigenia.',
    primaryColor: '#7C3AED',
    secondaryColor: '#C084FC',
    cry: '¡FUEGO!',
    imageUrl: '/assets/mascots/sparky.png',
    naturalFacing: 1,
    stages: [
      { level: 1, label: 'Etapa 1 · Chispita', minXp: 0, visualNote: 'Flama violeta alegre con chispas vivas' },
      { level: 2, label: 'Etapa 2 · Antorcha Viva', minXp: 120, visualNote: 'Aura violeta orbitante con chispas' },
      { level: 3, label: 'Etapa 3 · Fénix Primigenio', minXp: 300, visualNote: 'Corona solar del Árbol Original' },
    ],
  },
  {
    id: 'nubi',
    name: 'Nubi',
    title: 'Nube Estelar',
    district: 'Constelaria',
    quote: 'Sueños flotantes sobre la ciudad.',
    primaryColor: '#7DD6F3',
    secondaryColor: '#A78BFA',
    cry: '¡BRILLO!',
    imageUrl: '/assets/mascots/nubi.png',
    naturalFacing: 1,
    stages: [
      { level: 1, label: 'Etapa 1 · Nubecita', minXp: 0, visualNote: 'Nube esponjosa con pupilas estelares' },
      { level: 2, label: 'Etapa 2 · Nube Cometa', minXp: 120, visualNote: 'Satélites de estrellas girando alrededor' },
      { level: 3, label: 'Etapa 3 · Nebulosa Real', minXp: 300, visualNote: 'Corona astral y estela cósmica' },
    ],
  },
  {
    id: 'octo',
    name: 'Octo',
    title: 'Pulpo Inventor',
    district: 'Marea Viva',
    quote: 'El ritmo y el agua siempre encuentran salida.',
    primaryColor: '#9333EA',
    secondaryColor: '#2DD4BF',
    cry: '¡SPLASH!',
    imageUrl: '/assets/mascots/octo.png',
    naturalFacing: 1,
    stages: [
      { level: 1, label: 'Etapa 1 · Pulpito Coral', minXp: 0, visualNote: 'Pulpo músico con guitarra coral' },
      { level: 2, label: 'Etapa 2 · Pulpo DJ', minXp: 120, visualNote: 'Burbujas bioluminiscentes y anillo' },
      { level: 3, label: 'Etapa 3 · Maestro Abisal', minXp: 300, visualNote: 'Corona dorada de inventor marino' },
    ],
  },
  {
    id: 'tintin',
    name: 'Tintín',
    title: 'Espíritu Rubber Hose',
    district: 'Tintópolis',
    quote: 'Animación pura desde 1930.',
    primaryColor: '#27272A',
    secondaryColor: '#F4F4F5',
    cry: '¡TINTA!',
    imageUrl: '/assets/mascots/tintin.png',
    naturalFacing: 1,
    stages: [
      { level: 1, label: 'Etapa 1 · Gota Clásica', minXp: 0, visualNote: 'Guantes blancos y ojos pie-cut 1930' },
      { level: 2, label: 'Etapa 2 · Caricatura Vintage', minXp: 120, visualNote: 'Bombín clásico y anillo de tinta' },
      { level: 3, label: 'Etapa 3 · Maestro del Tintero', minXp: 300, visualNote: 'Corona dorada de cine mudo' },
    ],
  },
];

export interface JumpBiome {
  id: string;
  name: string;
  subtitle: string;
  minMeters: number;
  imageUrl: string;
  skyTop: string;
  skyBottom: string;
  platformColor: string;
  platformRim: string;
  accentColor: string;
  particleKind: 'notes' | 'sparks' | 'bubbles' | 'ink' | 'stars';
  isMonochrome?: boolean;
}

export const LEVEL_METERS = 900;

export const JUMP_BIOMES: JumpBiome[] = [
  {
    id: 'rhythm-hood',
    name: 'Rhythm Hood',
    subtitle: 'Azoteas Urbanas & Beat Street',
    minMeters: 0,
    imageUrl: '/src/assets/images/mokaya_jump_rhythm_hood_1794949446875.jpg',
    skyTop: '#1E103C',
    skyBottom: '#4C1D95',
    platformColor: '#3B0764',
    platformRim: '#EC4899',
    accentColor: '#FF6A3D',
    particleKind: 'notes',
  },
  {
    id: 'arena-viva',
    name: 'Arena Viva',
    subtitle: 'Estadio Costero & Skate Park',
    minMeters: 900,
    imageUrl: '/src/assets/images/mokaya_jump_arena_viva_1794949449016.jpg',
    skyTop: '#0284C7',
    skyBottom: '#7DD3FC',
    platformColor: '#0F766E',
    platformRim: '#F97316',
    accentColor: '#F97316',
    particleKind: 'sparks',
  },
  {
    id: 'marea-viva',
    name: 'Marea Viva',
    subtitle: 'Arrecifes Bioluminiscentes',
    minMeters: 1800,
    imageUrl: '/src/assets/images/mokaya_jump_marea_viva_1794949448958.jpg',
    skyTop: '#083344',
    skyBottom: '#0E7490',
    platformColor: '#164E63',
    platformRim: '#2DD4BF',
    accentColor: '#2DD4BF',
    particleKind: 'bubbles',
  },
  {
    id: 'tintopolis',
    name: 'Tintópolis',
    subtitle: 'Ciudad Clásica de Tinta 1930',
    minMeters: 2700,
    imageUrl: '/src/assets/images/mokaya_jump_tintopolis_1794949450218.jpg',
    skyTop: '#18181B',
    skyBottom: '#3F3F46',
    platformColor: '#27272A',
    platformRim: '#F4F4F5',
    accentColor: '#FAFAFA',
    particleKind: 'ink',
    isMonochrome: true,
  },
  {
    id: 'constelaria',
    name: 'Constelaria & Árbol Original',
    subtitle: 'Observatorios & Llama Primigenia',
    minMeters: 3600,
    imageUrl: '/src/assets/images/mokaya_jump_constelaria_tree_1794949452143.jpg',
    skyTop: '#0F0728',
    skyBottom: '#31105E',
    platformColor: '#2E1065',
    platformRim: '#FACC15',
    accentColor: '#FACC15',
    particleKind: 'stars',
  },
];

export type JumpAbilityId =
  | 'boots'
  | 'shield'
  | 'jetpack'
  | 'magnet'
  | 'laser'
  | 'shades'
  | 'boombox';

export interface JumpAbilityMeta {
  id: JumpAbilityId;
  name: string;
  shortLabel: string;
  color: string;
  durationText: string;
  description: string;
}

export const JUMP_ABILITIES: JumpAbilityMeta[] = [
  {
    id: 'boots',
    name: 'Turbo de Zapatillas',
    shortLabel: 'Turbo Zapas',
    color: '#FACC15',
    durationText: '14s + 2 Saltos',
    description: 'Aumenta la velocidad y altura de salto, acelera en el aire y suma 2 dobles saltos.',
  },
  {
    id: 'shield',
    name: 'Escudo de Hoodie',
    shortLabel: 'Hoodie Escudo',
    color: '#2DD4BF',
    durationText: '1 Impacto / Caída',
    description: 'Hoodie energética que bloquea 1 choque con dron o te rescata una vez del vacío.',
  },
  {
    id: 'jetpack',
    name: 'Mochila Cohete',
    shortLabel: 'Cohete',
    color: '#FF6A3D',
    durationText: '4s Invulnerable',
    description: 'Propulsión supersónica vertical que atraviesa peligros sin recibir daño.',
  },
  {
    id: 'magnet',
    name: 'Gorra Imán',
    shortLabel: 'Gorra Imán',
    color: '#A855F7',
    durationText: '14s',
    description: 'Atrae Chispas doradas y coleccionables streetwear a gran distancia.',
  },
  {
    id: 'laser',
    name: 'Spray Láser',
    shortLabel: 'Spray x3',
    color: '#EC4899',
    durationText: '11s',
    description: 'Dispara ráfagas triples automáticas de pintura para despejar drones arriba.',
  },
  {
    id: 'shades',
    name: 'Gafas Flow',
    shortLabel: 'Gafas Flow',
    color: '#38BDF8',
    durationText: '12s',
    description: 'Reduce la gravedad al caer un 35% para controlar aterrizajes difíciles con precisión.',
  },
  {
    id: 'boombox',
    name: 'Boombox x2',
    shortLabel: 'Boombox x2',
    color: '#F43F5E',
    durationText: '14s + Onda',
    description: 'Onda sonora que limpia drones en pantalla y duplica tus Chispas y puntos.',
  },
];

export const ARENA_STAGES: ArenaStage[] = [
  {
    id: 'rhythm-hood',
    name: 'Rhythm Hood',
    subtitle: 'Distrito Urbano · Beat & Graffiti',
    collection: 'Colección Beat Street',
    description: 'Azoteas con murales, puentes del metro morado y torres de sonido para despegar desde la calle.',
    mapImage: '/assets/aistudio/ChatGPT_Image_8_jun_2026__21_22_30_9586de42.png',
    stageImage: '/src/assets/images/mokaya_jump_rhythm_hood_1794949446875.jpg',
    skyTop: '#2E1065',
    skyBottom: '#701A75',
    floorColor: '#27272A',
    floorLineColor: '#EC4899',
    accentColor: '#EC4899',
  },
  {
    id: 'arena-viva',
    name: 'Arena Viva',
    subtitle: 'Distrito Deportivo · Canchas & Skate',
    collection: 'Colección Pro Court',
    description: 'Arcos deportivos, rampas de skate en altura y brisa costera bajo el cielo de Mokaya.',
    mapImage: '/assets/aistudio/ChatGPT_Image_8_jun_2026__21_33_05_8f93fa8b.png',
    stageImage: '/src/assets/images/mokaya_jump_arena_viva_1794949449016.jpg',
    skyTop: '#0C4A6E',
    skyBottom: '#0284C7',
    floorColor: '#1E293B',
    floorLineColor: '#F97316',
    accentColor: '#F97316',
  },
  {
    id: 'marea-viva',
    name: 'Marea Viva',
    subtitle: 'Distrito Acuático · Plaza Coral',
    collection: 'Colección Fluidez Marina',
    description: 'Torres de coral bioluminiscentes, perlas flotantes y corrientes ascendentes hacia la superficie.',
    mapImage: '/assets/aistudio/ChatGPT_Image_7_jun_2026__22_22_35_8f45d43a.png',
    stageImage: '/src/assets/images/mokaya_jump_marea_viva_1794949448958.jpg',
    skyTop: '#164E63',
    skyBottom: '#0E7490',
    floorColor: '#0F172A',
    floorLineColor: '#2DD4BF',
    accentColor: '#2DD4BF',
  },
  {
    id: 'tintopolis',
    name: 'Tintópolis',
    subtitle: 'Distrito Monocroma · Rubber Hose',
    collection: 'Colección Archivo 1930',
    description: 'Ciudad clásica en blanco y negro con tinteros gigantes, teatros art-decó y vapor animado.',
    mapImage: '/assets/aistudio/ChatGPT_Image_7_jun_2026__22_15_30_49e07213.png',
    stageImage: '/src/assets/images/mokaya_jump_tintopolis_1794949450218.jpg',
    skyTop: '#18181B',
    skyBottom: '#52525B',
    floorColor: '#27272A',
    floorLineColor: '#FAFAFA',
    accentColor: '#F4F4F5',
    isMonochrome: true,
  },
  {
    id: 'constelaria',
    name: 'Constelaria & Árbol Original',
    subtitle: 'Distrito Celestial · Llama Primigenia',
    collection: 'Colección Estelar',
    description: 'Puentes de luz dorada, observatorios flotantes y las ramas luminosas del Árbol Original.',
    mapImage: '/assets/aistudio/ChatGPT_Image_8_jun_2026__21_35_38_a8eb9b55.png',
    stageImage: '/src/assets/images/mokaya_jump_constelaria_tree_1794949452143.jpg',
    skyTop: '#1E1B4B',
    skyBottom: '#4C1D95',
    floorColor: '#1E1B4B',
    floorLineColor: '#FACC15',
    accentColor: '#A78BFA',
  },
];

export function computeStylePoints(clothes: Record<WardrobeSlot, string>): number {
  return Object.values(clothes).reduce((sum, itemId) => {
    const item = WARDROBE_ITEMS.find((i) => i.id === itemId);
    return sum + (item?.stylePoints ?? 0);
  }, 0);
}

export function getStyleRank(points: number): StyleRank {
  let current = STYLE_RANKS[0];
  for (const rank of STYLE_RANKS) {
    if (points >= rank.minPoints) {
      current = rank;
    }
  }
  return current;
}

export function getPetStage(pet: PetCompanion, xp: number): PetStage {
  let current: PetStage = pet.stages[0];
  for (const stage of pet.stages) {
    if (xp >= stage.minXp) {
      current = stage;
    }
  }
  return current;
}

export const DEFAULT_AVATAR: AvatarConfig = {
  skinId: 'arena',
  hairId: 'locs',
  hairColor: '#18181B',
  eyeStyle: 'star',
};

export const DEFAULT_LOADOUT: PlayerLoadout = {
  playerName: 'MokayerPro',
  avatar: { ...DEFAULT_AVATAR },
  clothes: {
    top: 'top-hoodie-chispa',
    bottom: 'bot-cargo-negro',
    headwear: 'head-gorra-reversa',
    sneakers: 'snk-kicks-lavanda',
    accessory: 'acc-audifonos-studio',
  },
  visualSkillId: 'chispa-clasica',
  petId: 'mokay-fosforo',
  petXp: 145,
  wins: 8,
  losses: 3,
  elo: 1240,
  clanTag: 'CHISPA',
};

export function normalizeLoadout(raw: Partial<PlayerLoadout> | null | undefined): PlayerLoadout {
  if (!raw) return { ...DEFAULT_LOADOUT, avatar: { ...DEFAULT_AVATAR }, clothes: { ...DEFAULT_LOADOUT.clothes } };
  const validPet = PETS.some((p) => p.id === raw.petId) ? (raw.petId as PetId) : DEFAULT_LOADOUT.petId;
  return {
    ...DEFAULT_LOADOUT,
    ...raw,
    petId: validPet,
    avatar: {
      ...DEFAULT_AVATAR,
      ...(raw.avatar ?? {}),
    },
    clothes: {
      ...DEFAULT_LOADOUT.clothes,
      ...(raw.clothes ?? {}),
    },
  };
}
