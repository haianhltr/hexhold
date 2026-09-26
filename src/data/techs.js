// The tech tree. Units, buildings, districts and improvements name the tech that unlocks them
// with their own `tech` field; `effect` covers bonuses that aren't a new item.

export const TECHS = {
  pottery: { name: 'Pottery', tier: 1, cost: 22, req: [] },
  mining: { name: 'Mining', tier: 1, cost: 22, req: [] },
  animal: {
    name: 'Animal Husbandry',
    tier: 1,
    cost: 22,
    req: [],
    effect: { resourceBonus: { wheat: { food: 1 }, deer: { food: 1 } } },
    effectText: '+1 Food on Wheat and Deer',
  },
  archery: { name: 'Archery', tier: 1, cost: 22, req: [] },
  writing: { name: 'Writing', tier: 2, cost: 55, req: ['pottery'] },
  masonry: { name: 'Masonry', tier: 2, cost: 55, req: ['mining'] },
  horseback: { name: 'Horseback Riding', tier: 2, cost: 55, req: ['animal'] },
  bronze: { name: 'Bronze Working', tier: 2, cost: 55, req: ['mining'] },
  currency: { name: 'Currency', tier: 3, cost: 110, req: ['writing'] },
  mathematics: { name: 'Mathematics', tier: 3, cost: 110, req: ['writing', 'archery'] },
  construction: {
    name: 'Construction',
    tier: 3,
    cost: 110,
    req: ['masonry', 'horseback'],
    effect: { builderCharges: 1, wallsHp: 50 },
    effectText: 'Builders get +1 use. Walls get +50 HP.',
  },
  philosophy: {
    name: 'Philosophy',
    tier: 3,
    cost: 110,
    req: ['writing', 'bronze'],
    effect: { sciencePct: 10, culturePct: 10 },
    effectText: '+10% Science and Culture in every city',
  },
};

export const TECH_KEYS = Object.keys(TECHS);
