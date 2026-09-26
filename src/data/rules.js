// Core balance numbers. Rebalance the game by editing these; the logic reads them from here.

export const RULES = {
  startGold: 10,
  cityMinDistance: 4, // cities must be at least this many tiles apart
  workRadius: 3, // cities claim and work tiles within this distance of the center
  foodPerPop: 2,
  growthBase: 15,
  growthPerPop: 8,
  growthExp: 1.5,
  borderBase: 8,
  borderPerTile: 5,
  buyTileBase: 20,
  buyTilePerTile: 5,
  goldPerProduction: 4, // buying an item costs this much gold per production point remaining
  freeUnitsPerCity: 2,
  cityHp: 200,
  cityHpRegen: 20,
  capturedCityHp: 50,
  cityStrengthBase: 15,
  cityStrengthPerPop: 2,
  cityStrikeRange: 2,
  wallsHp: 100,
  wallsStrength: 10,
  constructionWallsHp: 50,
  healNeutral: 10,
  healOwn: 20,
  healCity: 25,
  fortifyBonus: 4,
  hillsDefense: 3,
  forestDefense: 3,
  damageBase: 30,
  strengthDivisor: 25,
  palace: { science: 3, gold: 2, culture: 1, prod: 1 },
  sciencePerPop: 0.6,
  culturePerCity: 1,
  districtBase: 1,
  futureTechCost: 150,
  yearStart: -4000,
  yearsPerTurn: 40,
  score: { city: 5, pop: 1, tech: 2, district: 3, tilesPer: 10, future: 5 },
  maxQueue: 5,
  idleProductionCap: 60,
  settlerMinPop: 2,
};

export const DIFFICULTY = {
  easy: { label: 'Easy', aiYield: 0.8, aiExtraWarriors: 0, warTurn: 35, aggression: 0.7 },
  normal: { label: 'Normal', aiYield: 1, aiExtraWarriors: 0, warTurn: 20, aggression: 1 },
  hard: { label: 'Hard', aiYield: 1.25, aiExtraWarriors: 1, warTurn: 12, aggression: 1.3 },
};

export const MAP_SIZES = {
  small: { label: 'Small', w: 28, h: 18 },
  medium: { label: 'Medium', w: 36, h: 22 },
};

export const TURN_LIMITS = [60, 100, 150];
