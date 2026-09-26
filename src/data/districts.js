// Districts occupy a tile inside the city's borders. A city may hold 1 district per 3 population.

export const DISTRICTS = {
  campus: {
    name: 'Campus',
    cost: 45,
    tech: 'writing',
    yield: 'science',
    info: '+1 Science, +1 per adjacent mountain, +1 per 2 adjacent districts',
  },
  commercial: {
    name: 'Commercial Hub',
    cost: 45,
    tech: 'currency',
    yield: 'gold',
    info: '+1 Gold, +2 next to coast, +1 per 2 adjacent districts',
  },
  encampment: {
    name: 'Encampment',
    cost: 45,
    tech: 'bronze',
    yield: null,
    notNextToCenter: true,
    info: 'Military units build 25% faster. Cannot be next to the city center.',
  },
};

export const ENCAMPMENT_PRODUCTION_BONUS = 0.25;
