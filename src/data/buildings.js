// Buildings. Those with `district` need that district in the city first.

export const BUILDINGS = {
  monument: { name: 'Monument', cost: 30, culture: 2, info: '+2 Culture' },
  granary: { name: 'Granary', cost: 40, food: 2, tech: 'pottery', info: '+2 Food' },
  walls: { name: 'Walls', cost: 60, tech: 'masonry', info: '+100 city HP, +10 city strength and a ranged strike' },
  library: { name: 'Library', cost: 50, science: 2, district: 'campus', tech: 'writing', info: '+2 Science' },
  market: { name: 'Market', cost: 50, gold: 3, district: 'commercial', tech: 'currency', info: '+3 Gold' },
  barracks: { name: 'Barracks', cost: 50, district: 'encampment', tech: 'bronze', unitBonus: 5, info: 'New melee units get +5 strength' },
};
