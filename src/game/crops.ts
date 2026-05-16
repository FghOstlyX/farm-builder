export interface CropDef {
  id: string;
  name: string;
  emoji: string;
  growMs: number;
  seedPrice: number;
  sellPrice: number;
  unlockPrice: number;
  harvestCoins: number;
  starter?: boolean;
}

export const CROPS: Record<string, CropDef> = {
  carrot: {
    id: "carrot",
    name: "Морковь",
    emoji: "🥕",
    growMs: 30_000,
    seedPrice: 0,
    sellPrice: 12,
    unlockPrice: 0,
    harvestCoins: 15,
    starter: true,
  },
  tomato: {
    id: "tomato",
    name: "Помидор",
    emoji: "🍅",
    growMs: 60_000,
    seedPrice: 20,
    sellPrice: 28,
    unlockPrice: 80,
    harvestCoins: 22,
  },
  wheat: {
    id: "wheat",
    name: "Пшеница",
    emoji: "🌾",
    growMs: 45_000,
    seedPrice: 10,
    sellPrice: 16,
    unlockPrice: 50,
    harvestCoins: 18,
  },
  corn: {
    id: "corn",
    name: "Кукуруза",
    emoji: "🌽",
    growMs: 90_000,
    seedPrice: 35,
    sellPrice: 45,
    unlockPrice: 150,
    harvestCoins: 35,
  },
};

export const STARTER_CROPS = Object.values(CROPS)
  .filter((c) => c.starter)
  .map((c) => c.id);

export function cropById(id: string): CropDef | undefined {
  return CROPS[id];
}
