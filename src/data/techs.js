// The tech tree: 76 techs in 9 eras (see docs/tech-dictionary.md). Units, buildings, districts
// and improvements name the tech that unlocks them with their own `tech` field; `effect` holds
// civilization-wide bonuses, summed across every researched tech by core/effects.js.

export const ERAS = [
  { key: 'ancient', name: 'Ancient' },
  { key: 'classical', name: 'Classical' },
  { key: 'medieval', name: 'Medieval' },
  { key: 'renaissance', name: 'Renaissance' },
  { key: 'industrial', name: 'Industrial' },
  { key: 'modern', name: 'Modern' },
  { key: 'atomic', name: 'Atomic' },
  { key: 'information', name: 'Information' },
  { key: 'future', name: 'Future' },
];

const t = (name, era, cost, req = [], effect = null, effectText = null) => ({ name, era, cost, req, ...(effect ? { effect, effectText } : {}) });

export const TECHS = {
  // Ancient
  pottery: t('Pottery', 'ancient', 22),
  animal: t('Animal Husbandry', 'ancient', 22, [], { resourceBonus: { wheat: { food: 1 }, deer: { food: 1 } } }, 'Wheat and Deer +1 Food'),
  mining: t('Mining', 'ancient', 22),
  sailing: t('Sailing', 'ancient', 32, [], { resourceBonus: { fish: { food: 1 } } }, 'Fish +1 Food'),
  astrology: t('Astrology', 'ancient', 32),
  irrigation: t('Irrigation', 'ancient', 32, ['pottery'], { improvementBonus: { farm: { food: 1 } } }, 'Farms +1 Food'),
  archery: t('Archery', 'ancient', 32, ['animal']),
  writing: t('Writing', 'ancient', 32, ['pottery']),
  masonry: t('Masonry', 'ancient', 32, ['mining']),
  bronze: t('Bronze Working', 'ancient', 32, ['mining']),
  wheel: t('The Wheel', 'ancient', 32, ['mining']),

  // Classical
  celestial: t('Celestial Navigation', 'classical', 70, ['sailing', 'astrology']),
  currency: t('Currency', 'classical', 70, ['writing']),
  horseback: t('Horseback Riding', 'classical', 70, ['animal']),
  ironworking: t('Iron Working', 'classical', 70, ['bronze']),
  shipbuilding: t('Shipbuilding', 'classical', 90, ['sailing']),
  mathematics: t('Mathematics', 'classical', 90, ['currency']),
  construction: t('Construction', 'classical', 90, ['masonry', 'horseback'], { builderCharges: 1 }, 'Builders +1 use'),
  engineering: t('Engineering', 'classical', 90, ['wheel'], { wallsHp: 50 }, 'Walls +50 HP'),

  // Medieval
  tactics: t('Military Tactics', 'medieval', 120, ['mathematics']),
  apprenticeship: t('Apprenticeship', 'medieval', 120, ['currency', 'horseback']),
  stirrups: t('Stirrups', 'medieval', 120, ['horseback']),
  machinery: t('Machinery', 'medieval', 120, ['ironworking', 'engineering']),
  buttress: t('Buttress', 'medieval', 120, ['shipbuilding', 'mathematics'], { cityYield: { prod: 1 } }, '+1 Production in every city'),
  education: t('Education', 'medieval', 145, ['mathematics', 'apprenticeship']),
  milengineering: t('Military Engineering', 'medieval', 145, ['construction']),
  castles: t('Castles', 'medieval', 145, ['construction']),

  // Renaissance
  cartography: t('Cartography', 'renaissance', 260, ['shipbuilding'], { sight: 1 }, '+1 sight for every unit'),
  massproduction: t('Mass Production', 'renaissance', 260, ['shipbuilding', 'education'], { improvementBonus: { mine: { prod: 1 }, lumbermill: { prod: 1 } } }, 'Mines and Lumber Mills +1 Production'),
  banking: t('Banking', 'renaissance', 260, ['stirrups', 'education']),
  gunpowder: t('Gunpowder', 'renaissance', 260, ['apprenticeship', 'stirrups', 'milengineering']),
  printing: t('Printing', 'renaissance', 260, ['machinery'], { yieldPct: { culture: 10 } }, '+10% Culture'),
  squarerigging: t('Square Rigging', 'renaissance', 295, ['cartography'], { terrainBonus: { coast: { gold: 1 } } }, 'Coast +1 Gold'),
  astronomy: t('Astronomy', 'renaissance', 295, ['education']),
  metalcasting: t('Metal Casting', 'renaissance', 295, ['gunpowder']),
  siegetactics: t('Siege Tactics', 'renaissance', 295, ['castles']),

  // Industrial
  industrialization: t('Industrialization', 'industrial', 410, ['massproduction']),
  scientifictheory: t('Scientific Theory', 'industrial', 410, ['astronomy'], { yieldPct: { science: 15 } }, '+15% Science'),
  ballistics: t('Ballistics', 'industrial', 410, ['metalcasting']),
  militaryscience: t('Military Science', 'industrial', 410, ['printing', 'siegetactics']),
  steampower: t('Steam Power', 'industrial', 470, ['squarerigging', 'industrialization'], { moves: 1 }, '+1 move for every unit'),
  sanitation: t('Sanitation', 'industrial', 470, ['scientifictheory']),
  economics: t('Economics', 'industrial', 470, ['banking', 'scientifictheory']),
  rifling: t('Rifling', 'industrial', 470, ['ballistics', 'militaryscience']),

  // Modern
  flight: t('Flight', 'modern', 615, ['industrialization', 'scientifictheory'], { sight: 1, tourismPct: 25 }, '+1 sight for every unit, +25% Tourism'),
  replaceable: t('Replaceable Parts', 'modern', 615, ['economics']),
  steel: t('Steel', 'modern', 615, ['ballistics'], { cityStrength: 10 }, 'Cities +10 strength'),
  electricity: t('Electricity', 'modern', 670, ['steampower']),
  radio: t('Radio', 'modern', 670, ['steampower', 'flight'], { tourismPct: 25 }, '+25% Tourism'),
  chemistry: t('Chemistry', 'modern', 670, ['sanitation']),
  combustion: t('Combustion', 'modern', 670, ['rifling', 'steel']),
  refining: t('Refining', 'modern', 670, ['rifling'], { buildingBonus: { factory: { prod: 2 } } }, 'Factories +2 Production'),

  // Atomic
  advancedflight: t('Advanced Flight', 'atomic', 905, ['radio'], { heal: 10 }, 'Units heal +10 HP per turn'),
  rocketry: t('Rocketry', 'atomic', 905, ['radio', 'chemistry'], { yieldPct: { science: 10 } }, '+10% Science'),
  advancedballistics: t('Advanced Ballistics', 'atomic', 905, ['replaceable', 'steel']),
  combinedarms: t('Combined Arms', 'atomic', 905, ['steel', 'combustion'], { strength: { melee: 5 } }, 'Melee units +5 strength'),
  plastics: t('Plastics', 'atomic', 905, ['combustion'], { terrainBonus: { coast: { prod: 1 } } }, 'Coast +1 Production'),
  computers: t('Computers', 'atomic', 985, ['electricity', 'radio'], { yieldPct: { science: 10, culture: 10 }, tourismPct: 25 }, '+10% Science and Culture, +25% Tourism'),
  fission: t('Nuclear Fission', 'atomic', 985, ['advancedballistics', 'combinedarms'], { yieldPct: { prod: 15 } }, '+15% Production'),
  synthetic: t('Synthetic Materials', 'atomic', 985, ['plastics'], { cityYield: { food: 2 } }, '+2 Food in every city'),

  // Information
  telecom: t('Telecommunications', 'information', 1245, ['computers'], { yieldPct: { gold: 15 } }, '+15% Gold'),
  satellites: t('Satellites', 'information', 1245, ['advancedflight', 'rocketry'], { revealMap: true }, 'Reveals the whole map'),
  guidance: t('Guidance Systems', 'information', 1245, ['rocketry', 'advancedballistics']),
  lasers: t('Lasers', 'information', 1245, ['fission'], { strength: { ranged: 10 } }, 'Ranged and siege units +10 ranged strength'),
  composites: t('Composites', 'information', 1245, ['synthetic']),
  stealth: t('Stealth Technology', 'information', 1245, ['synthetic'], { strength: { defense: 5 } }, 'Every unit +5 defense'),
  robotics: t('Robotics', 'information', 1380, ['computers'], { yieldPct: { prod: 15 } }, '+15% Production'),
  nanotech: t('Nanotechnology', 'information', 1380, ['composites'], { districtBonus: { campus: { science: 3 } } }, 'Campus districts +3 Science'),
  fusion: t('Nuclear Fusion', 'information', 1380, ['lasers'], { cityYield: { prod: 3 } }, '+3 Production in every city'),

  // Future
  seasteads: t('Seasteads', 'future', 1780, ['nanotech'], { terrainBonus: { coast: { food: 2 } } }, 'Coast +2 Food'),
  advancedai: t('Advanced AI', 'future', 1780, ['robotics'], { yieldPct: { science: 20 } }, '+20% Science'),
  powercells: t('Advanced Power Cells', 'future', 1780, ['fusion'], { moves: 1 }, '+1 move for every unit'),
  cybernetics: t('Cybernetics', 'future', 1780, ['robotics'], { strength: { all: 5 } }, 'Every unit +5 strength'),
  smartmaterials: t('Smart Materials', 'future', 1780, ['nanotech'], { cityYield: { prod: 3 } }, '+3 Production in every city'),
  predictive: t('Predictive Systems', 'future', 1780, ['telecom'], { yieldPct: { gold: 20 } }, '+20% Gold'),
  offworld: t('Offworld Mission', 'future', 2315, ['advancedai', 'powercells', 'smartmaterials', 'satellites'], { victory: 'science' }, 'Science victory: the first civilization to research it wins'),
};

export const TECH_KEYS = Object.keys(TECHS);
export const ERA_INDEX = Object.fromEntries(ERAS.map((e, i) => [e.key, i]));

// A player's era: the latest era in which they have researched at least one tech.
export const eraOf = (techs) => eraIn(TECHS, techs);

// The latest era among `keys` in a tree table (techs or civics).
export function eraIn(table, keys) {
  let best = 0;
  for (const k of keys) {
    const i = ERA_INDEX[table[k]?.era] ?? 0;
    if (i > best) best = i;
  }
  return ERAS[best];
}
