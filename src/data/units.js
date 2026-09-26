// Unit types, grouped into upgrade lines (see docs/tech-dictionary.md).
//   cls: civilian | recon | melee | ranged. Only melee units can capture cities.
//   upgradesTo: the next unit in the line. Once its tech is known, this unit can't be built but
//     existing ones can be upgraded for gold.
//   tags: mounted, antiCav (+10 against mounted), siege (+vsCity against cities)
//   glyph / model: how the unit is drawn on the 2D and 3D maps.

const u = (name, cls, strength, moves, cost, extra = {}) => ({ name, cls, strength, moves, cost, sight: 2, ...extra });

export const UNITS = {
  // Civilians
  settler: u('Settler', 'civilian', 0, 2, 40, { glyph: 'settler', model: 'settler', info: 'Founds a new city. Costs 1 population.' }),
  builder: u('Builder', 'civilian', 0, 2, 30, { charges: 3, glyph: 'builder', model: 'builder', info: 'Builds farms, mines and lumber mills. 3 uses.' }),

  // Recon
  scout: u('Scout', 'recon', 10, 3, 20, { sight: 3, upgradesTo: 'ranger', glyph: 'scout', model: 'pawn', info: 'Fast explorer that sees farther.' }),
  ranger: u('Ranger', 'recon', 45, 3, 110, { sight: 3, tech: 'rifling', glyph: 'gun', model: 'pawn', info: 'Late-game explorer and skirmisher.' }),

  // Melee
  warrior: u('Warrior', 'melee', 20, 2, 20, { upgradesTo: 'swordsman', glyph: 'warrior', model: 'squad', info: 'Basic melee unit. Can capture cities.' }),
  swordsman: u('Swordsman', 'melee', 35, 2, 60, { tech: 'ironworking', upgradesTo: 'manatarms', glyph: 'swordsman', model: 'squad', info: 'Strong classical infantry.' }),
  manatarms: u('Man-at-Arms', 'melee', 45, 2, 80, { tech: 'apprenticeship', upgradesTo: 'musketman', glyph: 'swordsman', model: 'squad', info: 'Armored medieval infantry.' }),
  musketman: u('Musketman', 'melee', 55, 2, 110, { tech: 'gunpowder', upgradesTo: 'lineinfantry', glyph: 'gun', model: 'squad', info: 'Gunpowder infantry.' }),
  lineinfantry: u('Line Infantry', 'melee', 65, 2, 140, { tech: 'rifling', upgradesTo: 'infantry', glyph: 'gun', model: 'squad', info: 'Disciplined rifle infantry.' }),
  infantry: u('Infantry', 'melee', 70, 2, 170, { tech: 'replaceable', upgradesTo: 'mechinfantry', glyph: 'gun', model: 'squad', info: 'Modern infantry.' }),
  mechinfantry: u('Mechanized Infantry', 'melee', 85, 3, 240, { tech: 'satellites', glyph: 'gun', model: 'tank', info: 'Infantry in armored carriers.' }),

  // Anti-cavalry
  spearman: u('Spearman', 'melee', 25, 2, 30, { tech: 'bronze', upgradesTo: 'pikeman', tags: ['antiCav'], glyph: 'spear', model: 'squad', info: '+10 strength against mounted units.' }),
  pikeman: u('Pikeman', 'melee', 41, 2, 75, { tech: 'tactics', upgradesTo: 'atcrew', tags: ['antiCav'], glyph: 'spear', model: 'squad', info: '+10 strength against mounted units.' }),
  atcrew: u('Anti-Tank Crew', 'melee', 70, 2, 180, { tech: 'chemistry', upgradesTo: 'modernat', tags: ['antiCav'], glyph: 'spear', model: 'squad', info: '+10 strength against mounted units and tanks.' }),
  modernat: u('Modern Anti-Tank', 'melee', 80, 2, 240, { tech: 'composites', tags: ['antiCav'], glyph: 'spear', model: 'squad', info: '+10 strength against mounted units and tanks.' }),

  // Ranged
  archer: u('Archer', 'ranged', 15, 2, 35, { ranged: 25, range: 2, tech: 'archery', upgradesTo: 'crossbowman', glyph: 'archer', model: 'squad', info: 'Attacks from 2 tiles away without taking damage.' }),
  crossbowman: u('Crossbowman', 'ranged', 30, 2, 80, { ranged: 40, range: 2, tech: 'machinery', upgradesTo: 'fieldcannon', glyph: 'archer', model: 'squad', info: 'Powerful medieval ranged unit.' }),
  fieldcannon: u('Field Cannon', 'ranged', 50, 2, 140, { ranged: 60, range: 2, tech: 'ballistics', upgradesTo: 'machinegun', glyph: 'cannon', model: 'cannon', info: 'Industrial-era ranged support.' }),
  machinegun: u('Machine Gun', 'ranged', 65, 2, 200, { ranged: 75, range: 2, tech: 'advancedballistics', glyph: 'gun', model: 'squad', info: 'Modern ranged support.' }),

  // Mounted
  horseman: u('Horseman', 'melee', 36, 4, 55, { tech: 'horseback', upgradesTo: 'knight', tags: ['mounted'], glyph: 'horseman', model: 'riders', info: 'Fast melee unit.' }),
  knight: u('Knight', 'melee', 48, 4, 85, { tech: 'stirrups', upgradesTo: 'cavalry', tags: ['mounted'], glyph: 'horseman', model: 'riders', info: 'Heavy medieval cavalry.' }),
  cavalry: u('Cavalry', 'melee', 62, 5, 140, { tech: 'militaryscience', upgradesTo: 'tank', tags: ['mounted'], glyph: 'horseman', model: 'riders', info: 'Fast industrial-era cavalry.' }),
  tank: u('Tank', 'melee', 80, 4, 190, { tech: 'combustion', upgradesTo: 'modernarmor', tags: ['mounted'], glyph: 'tank', model: 'tank', info: 'Armored breakthrough unit.' }),
  modernarmor: u('Modern Armor', 'melee', 90, 5, 250, { tech: 'composites', tags: ['mounted'], glyph: 'tank', model: 'tank', info: 'The strongest land unit.' }),

  // Siege
  catapult: u('Catapult', 'ranged', 23, 2, 70, { ranged: 35, range: 2, vsCity: 10, tech: 'mathematics', upgradesTo: 'trebuchet', tags: ['siege'], glyph: 'catapult', model: 'siege', info: 'Siege unit. +10 strength against cities.' }),
  trebuchet: u('Trebuchet', 'ranged', 30, 2, 90, { ranged: 45, range: 2, vsCity: 10, tech: 'milengineering', upgradesTo: 'bombard', tags: ['siege'], glyph: 'catapult', model: 'siege', info: 'Siege unit. +10 strength against cities.' }),
  bombard: u('Bombard', 'ranged', 43, 2, 120, { ranged: 55, range: 2, vsCity: 10, tech: 'metalcasting', upgradesTo: 'artillery', tags: ['siege'], glyph: 'cannon', model: 'cannon', info: 'Gunpowder siege. +10 strength against cities.' }),
  artillery: u('Artillery', 'ranged', 60, 2, 180, { ranged: 70, range: 2, vsCity: 10, tech: 'steel', upgradesTo: 'rocketartillery', tags: ['siege'], glyph: 'cannon', model: 'cannon', info: 'Heavy guns. +10 strength against cities.' }),
  rocketartillery: u('Rocket Artillery', 'ranged', 70, 2, 250, { ranged: 85, range: 3, vsCity: 10, tech: 'guidance', tags: ['siege'], glyph: 'cannon', model: 'tank', info: 'Range 3. +10 strength against cities.' }),
};

export const isMilitary = (type) => UNITS[type].cls !== 'civilian';
export const hasTag = (type, tag) => !!UNITS[type].tags?.includes(tag);
