// Buildings (see docs/tech-dictionary.md). Those with `district` need that district in the city;
// `requires` names a building that must already stand. A `tech` or `civic` field names what unlocks it. `defense` adds city HP and strength, and
// `strike` lets the city attack nearby enemies.

const b = (name, cost, info, extra = {}) => ({ name, cost, info, ...extra });

export const BUILDINGS = {
  // City center
  monument: b('Monument', 30, '+2 Culture', { culture: 2 }),
  granary: b('Granary', 40, '+2 Food', { food: 2, tech: 'pottery' }),
  shrine: b('Shrine', 40, '+2 Culture', { culture: 2, tech: 'astrology' }),
  watermill: b('Water Mill', 50, '+1 Food, +1 Production', { food: 1, prod: 1, tech: 'wheel' }),
  walls: b('Walls', 60, '+100 city HP, +10 city strength and a ranged strike', { tech: 'masonry', defense: { hp: 100, str: 10, strike: true } }),
  aqueduct: b('Aqueduct', 70, '+2 Food', { food: 2, tech: 'engineering' }),
  castle: b('Castle', 100, '+100 city HP, +10 city strength', { tech: 'castles', requires: 'walls', defense: { hp: 100, str: 10 } }),
  starfort: b('Star Fort', 140, '+100 city HP, +10 city strength', { tech: 'siegetactics', requires: 'castle', defense: { hp: 100, str: 10 } }),
  sewer: b('Sewer', 160, '+3 Food', { food: 3, tech: 'sanitation' }),

  // Campus
  library: b('Library', 50, '+2 Science', { science: 2, district: 'campus', tech: 'writing' }),
  university: b('University', 100, '+4 Science', { science: 4, district: 'campus', tech: 'education' }),
  observatory: b('Observatory', 130, '+3 Science', { science: 3, district: 'campus', tech: 'astronomy' }),
  researchlab: b('Research Lab', 220, '+5 Science', { science: 5, district: 'campus', tech: 'chemistry' }),

  // Commercial Hub
  market: b('Market', 50, '+3 Gold', { gold: 3, district: 'commercial', tech: 'currency' }),
  bank: b('Bank', 120, '+4 Gold', { gold: 4, district: 'commercial', tech: 'banking' }),
  stockexchange: b('Stock Exchange', 190, '+6 Gold', { gold: 6, district: 'commercial', tech: 'economics' }),

  // Encampment
  barracks: b('Barracks', 50, 'New military units +5 strength', { unitBonus: 5, district: 'encampment', tech: 'bronze' }),
  armory: b('Armory', 100, 'New military units +5 more strength', { unitBonus: 5, district: 'encampment', tech: 'milengineering' }),
  academy: b('Military Academy', 180, 'New military units +5 more strength', { unitBonus: 5, district: 'encampment', tech: 'militaryscience' }),

  // Industrial Zone
  workshop: b('Workshop', 80, '+2 Production', { prod: 2, district: 'industrial', tech: 'apprenticeship' }),
  factory: b('Factory', 170, '+4 Production', { prod: 4, district: 'industrial', tech: 'industrialization' }),
  powerplant: b('Power Plant', 230, '+5 Production', { prod: 5, district: 'industrial', tech: 'electricity' }),

  // Theater Square
  amphitheater: b('Amphitheater', 80, '+2 Culture', { culture: 2, district: 'theater', civic: 'drama' }),
  artmuseum: b('Art Museum', 140, '+3 Culture', { culture: 3, district: 'theater', civic: 'humanism' }),
  broadcast: b('Broadcast Center', 220, '+4 Culture', { culture: 4, district: 'theater', tech: 'radio' }),

  // Harbor
  lighthouse: b('Lighthouse', 60, '+2 Food', { food: 2, district: 'harbor', tech: 'celestial' }),
  shipyard: b('Shipyard', 90, '+3 Production', { prod: 3, district: 'harbor', tech: 'shipbuilding' }),
};

// Unique buildings (see data/civs.js). Each replaces a standard building for one civilization and
// keeps its unlock, district and requirements unless overridden.
const ub = (base, civ, name, over, info) => ({ ...BUILDINGS[base], food: 0, prod: 0, gold: 0, science: 0, culture: 0, name, civ, replaces: base, ...over, info });
Object.assign(BUILDINGS, {
  bath: ub('aqueduct', 'rome', 'Bath', { food: 3, culture: 1 }, '+3 Food, +1 Culture'),
  hanlin: ub('library', 'china', 'Hanlin Academy', { science: 3, culture: 1 }, '+3 Science, +1 Culture'),
  electronics: ub('factory', 'japan', 'Electronics Factory', { prod: 4, culture: 3 }, '+4 Production, +3 Culture'),
  ordu: ub('barracks', 'mongolia', 'Ordu', { unitBonus: 8, cost: 45 }, 'New military units +8 strength'),
  tlachtli: ub('monument', 'aztec', 'Tlachtli', { culture: 2, gold: 2, cost: 35 }, '+2 Culture, +2 Gold'),
});
