// Unit types. cls: civilian | recon | melee | ranged. Only melee units can capture cities.

export const UNITS = {
  settler: { name: 'Settler', cls: 'civilian', strength: 0, moves: 2, cost: 40, sight: 2, info: 'Founds a new city. Costs 1 population.' },
  builder: { name: 'Builder', cls: 'civilian', strength: 0, moves: 2, cost: 30, sight: 2, charges: 3, info: 'Builds farms and mines. 3 uses.' },
  scout: { name: 'Scout', cls: 'recon', strength: 10, moves: 3, cost: 20, sight: 3, info: 'Fast explorer that sees farther.' },
  warrior: { name: 'Warrior', cls: 'melee', strength: 20, moves: 2, cost: 20, sight: 2, info: 'Basic melee unit. Can capture cities.' },
  archer: { name: 'Archer', cls: 'ranged', strength: 15, ranged: 25, range: 2, moves: 2, cost: 35, sight: 2, tech: 'archery', info: 'Attacks from 2 tiles away without taking damage.' },
  horseman: { name: 'Horseman', cls: 'melee', strength: 36, moves: 4, cost: 55, sight: 2, tech: 'horseback', info: 'Fast melee unit.' },
  swordsman: { name: 'Swordsman', cls: 'melee', strength: 35, moves: 2, cost: 60, sight: 2, tech: 'bronze', info: 'Strong melee unit.' },
  catapult: { name: 'Catapult', cls: 'ranged', strength: 23, ranged: 35, range: 2, moves: 2, cost: 70, sight: 2, tech: 'mathematics', vsCity: 10, info: 'Siege unit. +10 strength against cities.' },
};

export const isMilitary = (type) => UNITS[type].cls !== 'civilian';
