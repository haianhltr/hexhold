// Terrain, features, resources and improvements. Yields are per tile per turn.

export const TERRAIN = {
  grass: { name: 'Grassland', food: 2, prod: 0, gold: 0, land: true },
  plains: { name: 'Plains', food: 1, prod: 1, gold: 0, land: true },
  desert: { name: 'Desert', food: 0, prod: 0, gold: 0, land: true },
  mountain: { name: 'Mountain', food: 0, prod: 0, gold: 0, land: true, impassable: true },
  coast: { name: 'Coast', food: 1, prod: 0, gold: 1, land: false },
  ocean: { name: 'Ocean', food: 1, prod: 0, gold: 0, land: false },
};

export const HILLS = { name: 'Hills', prod: 1, move: 1, sight: 1 };
export const FOREST = { name: 'Forest', prod: 1, move: 1 };

export const RESOURCES = {
  wheat: { name: 'Wheat', food: 1 },
  stone: { name: 'Stone', prod: 1 },
  deer: { name: 'Deer', prod: 1 },
  fish: { name: 'Fish', food: 1 },
};

export const IMPROVEMENTS = {
  farm: { name: 'Farm', food: 1, tech: null, hint: 'Grassland, plains or desert without hills or forest' },
  mine: { name: 'Mine', prod: 1, tech: 'mining', hint: 'Hills without forest' },
  lumbermill: { name: 'Lumber Mill', prod: 2, tech: 'machinery', hint: 'Forest tiles' },
  // Unique improvements (see data/civs.js): only their civilization's Builders can make them.
  sphinx: { name: 'Sphinx', culture: 1, prod: 1, civ: 'egypt', civic: 'craftsmanship', hint: 'Flat land without forest' },
  pairidaeza: { name: 'Pairidaeza', culture: 1, gold: 2, civ: 'persia', civic: 'politicalphilosophy', hint: 'Flat land without forest' },
  stepwell: { name: 'Stepwell', food: 2, culture: 1, civ: 'india', tech: 'irrigation', hint: 'Flat land without forest' },
  chateau: { name: 'Château', culture: 2, gold: 1, civ: 'france', civic: 'humanism', hint: 'Flat land without forest' },
};

const FLAT_ONLY = new Set(['farm', 'sphinx', 'pairidaeza', 'stepwell', 'chateau']);

export function improvementValid(tile, kind) {
  if (FLAT_ONLY.has(kind)) return ['grass', 'plains', 'desert'].includes(tile.t) && !tile.hills && !tile.forest;
  if (kind === 'mine') return tile.hills && !tile.forest && tile.t !== 'mountain';
  if (kind === 'lumbermill') return tile.forest && tile.t !== 'mountain';
  return false;
}
