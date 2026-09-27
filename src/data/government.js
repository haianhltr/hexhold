// Governments and policy cards (see docs/civics-dictionary.md). Civics unlock both.
//
// A government has policy slots of three kinds: military, economic and wildcard. A military or
// economic card fits its own kind of slot or a wildcard slot; a wildcard card fits only a wildcard
// slot. A card whose `obsoleteBy` card is unlocked can't be slotted any more. Card and government
// effects use the same fields as tech effects and are summed by core/effects.js.

import { CIVS } from './civs.js';

export const SLOT_TYPES = ['military', 'economic', 'wildcard'];
export const SLOT_NAMES = { military: 'Military', economic: 'Economic', wildcard: 'Wildcard' };

const g = (name, civic, tier, slots, effect, effectText) => ({ name, civic, tier, slots, effect, effectText });

export const GOVERNMENTS = {
  chiefdom: g('Chiefdom', 'code', 0, [1, 1, 0], null, 'No bonus'),
  autocracy: g('Autocracy', 'politicalphilosophy', 1, [2, 1, 1], { capitalYield: { food: 1, prod: 1, gold: 1, science: 1, culture: 1 } }, '+1 to every yield in the capital'),
  oligarchy: g('Oligarchy', 'politicalphilosophy', 1, [1, 1, 2], { strength: { melee: 4 } }, 'Melee units +4 strength'),
  classicalrepublic: g('Classical Republic', 'politicalphilosophy', 1, [0, 2, 2], { yieldPct: { culture: 10, gold: 10 } }, '+10% Culture and Gold'),
  monarchy: g('Monarchy', 'divineright', 2, [3, 1, 2], { cityStrength: 5, prodBonus: { defense: 50 } }, 'Cities +5 strength; Walls, Castles and Star Forts build 50% faster'),
  theocracy: g('Theocracy', 'reformedchurch', 2, [2, 2, 2], { yieldPct: { culture: 15 }, heal: 5 }, '+15% Culture; units heal +5 HP per turn'),
  merchantrepublic: g('Merchant Republic', 'exploration', 2, [1, 2, 3], { buyDiscount: 15, yieldPct: { gold: 10 } }, 'Buying with gold costs 15% less; +10% Gold'),
  fascism: g('Fascism', 'totalitarianism', 3, [4, 1, 3], { strength: { all: 5 } }, 'Every unit +5 strength'),
  communism: g('Communism', 'classstruggle', 3, [3, 3, 2], { yieldPct: { prod: 15 } }, '+15% Production'),
  democracy: g('Democracy', 'suffrage', 3, [1, 4, 3], { buyDiscount: 25, yieldPct: { science: 10 } }, 'Buying with gold costs 25% less; +10% Science'),
  corporatelib: g('Corporate Libertarianism', 'venturepolitics', 4, [2, 4, 2], { yieldPct: { prod: 15, gold: 15 } }, '+15% Production and Gold'),
  digitaldemocracy: g('Digital Democracy', 'distributedsovereignty', 4, [1, 4, 3], { yieldPct: { science: 15, culture: 15 } }, '+15% Science and Culture'),
  synthetic: g('Synthetic Technocracy', 'optimization', 4, [3, 3, 2], { yieldPct: { science: 25 } }, '+25% Science'),
};

export const GOVERNMENT_KEYS = Object.keys(GOVERNMENTS);

// The slot kinds of a government, in order: military first, then economic, then wildcard.
export function slotsOf(gov) {
  const def = GOVERNMENTS[gov];
  if (!def) return [];
  return SLOT_TYPES.flatMap((type, k) => Array(def.slots[k]).fill(type));
}

// A player's slots under a government, with any extra slots from their civilization (Greece).
export function slotsFor(p, gov = p.government) {
  const base = slotsOf(gov);
  if (!base.length) return base;
  const extra = CIVS[p.civ]?.ability.effect.extraSlots || {};
  return [...base, ...SLOT_TYPES.flatMap((type) => Array(extra[type] || 0).fill(type))];
}

const p = (name, slot, civic, effect, effectText, obsoleteBy = null) => ({ name, slot, civic, effect, effectText, ...(obsoleteBy ? { obsoleteBy } : {}) });

export const POLICIES = {
  // Military
  discipline: p('Discipline', 'military', 'code', { strength: { defense: 3 } }, 'Every unit +3 strength when defending', 'scorchedearthcard'),
  agoge: p('Agoge', 'military', 'craftsmanship', { prodBonus: { melee: 50, ranged: 50 } }, '+50% Production toward melee, anti-cavalry and ranged units', 'feudalcontract'),
  maneuver: p('Maneuver', 'military', 'miltradition', { prodBonus: { mounted: 50 } }, '+50% Production toward mounted units', 'chivalry'),
  conscription: p('Conscription', 'military', 'stateworkforce', { freeUnits: 1 }, 'Each city supports 1 more unit without upkeep', 'leveeenmasse'),
  limes: p('Limes', 'military', 'defensivetactics', { prodBonus: { defense: 100 } }, '+100% Production toward Walls, Castles and Star Forts'),
  bastions: p('Bastions', 'military', 'defensivetactics', { cityStrength: 6 }, 'Cities +6 strength'),
  veterancy: p('Veterancy', 'military', 'miltraining', { prodBonus: { encampment: 50 } }, '+50% Production toward Encampments and their buildings'),
  professionalarmy: p('Professional Army', 'military', 'mercenaries', { upgradeDiscount: 50 }, 'Upgrading units costs 50% less', 'forcemodernization'),
  chivalry: p('Chivalry', 'military', 'divineright', { prodBonus: { mounted: 75 } }, '+75% Production toward mounted units'),
  feudalcontract: p('Feudal Contract', 'military', 'exploration', { prodBonus: { melee: 75, ranged: 75 } }, '+75% Production toward melee, anti-cavalry and ranged units', 'grandearmee'),
  grandearmee: p('Grande Armée', 'military', 'nationalism', { prodBonus: { melee: 100, ranged: 100 } }, '+100% Production toward melee, anti-cavalry and ranged units'),
  nationalidentity: p('National Identity', 'military', 'nationalism', { heal: 10 }, 'Units heal +10 HP per turn'),
  scorchedearthcard: p('Scorched Earth', 'military', 'scorchedearth', { strength: { defense: 6 } }, 'Every unit +6 strength when defending'),
  leveeenmasse: p('Levée en Masse', 'military', 'mobilization', { freeUnits: 2 }, 'Each city supports 2 more units without upkeep'),
  militaryresearch: p('Military Research', 'military', 'mobilization', { districtBonus: { encampment: { science: 3 } } }, 'Encampments +3 Science'),
  totalwar: p('Total War', 'military', 'totalitarianism', { strength: { all: 3 } }, 'Every unit +3 strength', 'militaryorganization'),
  militaryorganization: p('Military Organization', 'military', 'coldwar', { strength: { all: 5 } }, 'Every unit +5 strength'),
  lightningwarfare: p('Lightning Warfare', 'military', 'rapiddeployment', { classMoves: { mounted: 1 } }, 'Mounted units +1 move'),
  forcemodernization: p('Force Modernization', 'military', 'rapiddeployment', { upgradeDiscount: 75 }, 'Upgrading units costs 75% less'),

  // Economic
  godking: p('God King', 'economic', 'code', { capitalYield: { gold: 1, culture: 1 } }, '+1 Gold and +1 Culture in the capital'),
  urbanplanning: p('Urban Planning', 'economic', 'code', { cityYield: { prod: 1 } }, '+1 Production in every city'),
  ilkum: p('Ilkum', 'economic', 'craftsmanship', { prodBonus: { builder: 30 } }, '+30% Production toward Builders', 'publicworks'),
  caravansaries: p('Caravansaries', 'economic', 'foreigntrade', { cityYield: { gold: 1 } }, '+1 Gold in every city'),
  colonization: p('Colonization', 'economic', 'earlyempire', { prodBonus: { settler: 50 } }, '+50% Production toward Settlers'),
  landsurveyors: p('Land Surveyors', 'economic', 'earlyempire', { tileDiscount: 30 }, 'Buying tiles costs 30% less'),
  insulae: p('Insulae', 'economic', 'games', { cityYield: { food: 1 } }, '+1 Food in every city'),
  naturalphilosophy: p('Natural Philosophy', 'economic', 'recordedhistory', { adjacencyPct: { campus: 100 } }, 'Campus adjacency bonuses doubled', 'fiveyearplan'),
  scripture: p('Scripture', 'economic', 'theology', { buildingBonus: { shrine: { culture: 2 } } }, 'Shrines +2 Culture'),
  navalinfrastructure: p('Naval Infrastructure', 'economic', 'navaltradition', { adjacencyPct: { harbor: 100 } }, 'Harbor adjacency bonuses doubled', 'economicunion'),
  serfdom: p('Serfdom', 'economic', 'feudalism', { builderCharges: 2 }, 'New Builders +2 uses', 'publicworks'),
  meritocracy: p('Meritocracy', 'economic', 'civilservice', { perDistrict: { culture: 1 } }, '+1 Culture per district'),
  tradeconfederation: p('Trade Confederation', 'economic', 'faires', { cityYield: { gold: 2 } }, '+2 Gold in every city'),
  aesthetics: p('Aesthetics', 'economic', 'faires', { adjacencyPct: { theater: 100 } }, 'Theater Square adjacency bonuses doubled'),
  towncharters: p('Town Charters', 'economic', 'guilds', { adjacencyPct: { commercial: 100 } }, 'Commercial Hub adjacency bonuses doubled', 'economicunion'),
  craftsmen: p('Craftsmen', 'economic', 'guilds', { adjacencyPct: { industrial: 100 } }, 'Industrial Zone adjacency bonuses doubled', 'fiveyearplan'),
  colonialoffices: p('Colonial Offices', 'economic', 'exploration', { growthPct: 25 }, 'Cities grow 25% faster'),
  wisselbanken: p('Wisselbanken', 'economic', 'diplomaticservice', { cityYield: { gold: 1, science: 1 } }, '+1 Gold and +1 Science in every city'),
  triangulartrade: p('Triangular Trade', 'economic', 'mercantilism', { districtBonus: { harbor: { gold: 2 }, commercial: { gold: 2 } } }, 'Harbors and Commercial Hubs +2 Gold'),
  rationalism: p('Rationalism', 'economic', 'enlightenment', { buildingPct: { campus: 50 } }, 'Campus buildings +50% yields'),
  freemarket: p('Free Market', 'economic', 'enlightenment', { buildingPct: { commercial: 50 } }, 'Commercial Hub buildings +50% yields'),
  colonialtaxes: p('Colonial Taxes', 'economic', 'colonialism', { yieldPct: { gold: 15 } }, '+15% Gold'),
  publicworks: p('Public Works', 'economic', 'civilengineering', { prodBonus: { builder: 50 }, builderCharges: 2 }, '+50% Production toward Builders; new Builders +2 uses'),
  grandopera: p('Grand Opera', 'economic', 'opera', { buildingPct: { theater: 50 } }, 'Theater Square buildings +50% yields'),
  publictransport: p('Public Transport', 'economic', 'urbanization', { improvementBonus: { farm: { food: 1 } } }, 'Farms +1 Food'),
  marketeconomy: p('Market Economy', 'economic', 'capitalism', { yieldPct: { gold: 20 } }, '+20% Gold'),
  economicunion: p('Economic Union', 'economic', 'capitalism', { adjacencyPct: { commercial: 100, harbor: 100 } }, 'Commercial Hub and Harbor adjacency bonuses doubled'),
  researchgrants: p('Research Grants', 'economic', 'nuclearprogram', { yieldPct: { science: 10 } }, '+10% Science'),
  newdeal: p('New Deal', 'economic', 'suffrage', { cityYield: { food: 2, gold: -2 } }, '+2 Food and −2 Gold in every city'),
  fiveyearplan: p('Five-Year Plan', 'economic', 'classstruggle', { adjacencyPct: { campus: 100, industrial: 100 } }, 'Campus and Industrial Zone adjacency bonuses doubled'),
  collectivization: p('Collectivization', 'economic', 'classstruggle', { improvementBonus: { farm: { prod: 1 } } }, 'Farms +1 Production'),
  sportsmedia: p('Sports Media', 'economic', 'professionalsports', { cityYield: { culture: 2 } }, '+2 Culture in every city'),
  ecommerce: p('Ecommerce', 'economic', 'globalization', { cityYield: { prod: 2, gold: 3 } }, '+2 Production and +3 Gold in every city'),

  // Wildcard only
  revelation: p('Revelation', 'wildcard', 'mysticism', { capitalYield: { culture: 2 } }, '+2 Culture in the capital'),
  charismaticleader: p('Charismatic Leader', 'wildcard', 'politicalphilosophy', { cityYield: { culture: 1 } }, '+1 Culture in every city'),
  propaganda: p('Propaganda', 'wildcard', 'massmedia', { yieldPct: { culture: 15 } }, '+15% Culture', 'heritagetourism'),
  heritagetourism: p('Heritage Tourism', 'wildcard', 'culturalheritage', { yieldPct: { culture: 15 }, tourismPct: 50 }, '+15% Culture and +50% Tourism'),
  onlinecommunities: p('Online Communities', 'wildcard', 'socialmedia', { yieldPct: { culture: 15 }, tourismPct: 75 }, '+15% Culture and +75% Tourism'),
};

export const POLICY_KEYS = Object.keys(POLICIES);

// Whether a card of kind `card` may go in a slot of kind `slot`.
export const fitsSlot = (card, slot) => slot === 'wildcard' || card === slot;
