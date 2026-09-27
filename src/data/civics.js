// The civics tree: 59 civics in the same 9 eras as the tech tree (see docs/civics-dictionary.md).
// Culture researches civics the way science researches techs. Civics unlock governments and policy
// cards (data/government.js) and a few districts and buildings (their `civic` field). Some give a
// lasting bonus through `effect`, summed by core/effects.js exactly like tech effects.

import { eraIn } from './techs.js';

const c = (name, era, cost, req = [], effect = null, effectText = null) => ({ name, era, cost, req, ...(effect ? { effect, effectText } : {}) });

export const CIVICS = {
  // Ancient
  code: c('Code of Laws', 'ancient', 20),
  craftsmanship: c('Craftsmanship', 'ancient', 30, ['code']),
  foreigntrade: c('Foreign Trade', 'ancient', 30, ['code']),
  earlyempire: c('Early Empire', 'ancient', 40, ['foreigntrade']),
  mysticism: c('Mysticism', 'ancient', 40, ['foreigntrade']),
  miltradition: c('Military Tradition', 'ancient', 40, ['craftsmanship']),
  stateworkforce: c('State Workforce', 'ancient', 40, ['craftsmanship']),

  // Classical
  politicalphilosophy: c('Political Philosophy', 'classical', 80, ['stateworkforce', 'earlyempire']),
  games: c('Games and Recreation', 'classical', 80, ['stateworkforce']),
  drama: c('Drama and Poetry', 'classical', 80, ['earlyempire']),
  miltraining: c('Military Training', 'classical', 100, ['miltradition', 'games']),
  defensivetactics: c('Defensive Tactics', 'classical', 100, ['games', 'politicalphilosophy']),
  recordedhistory: c('Recorded History', 'classical', 100, ['politicalphilosophy', 'drama']),
  theology: c('Theology', 'classical', 100, ['drama', 'mysticism']),

  // Medieval
  navaltradition: c('Naval Tradition', 'medieval', 120, ['defensivetactics']),
  feudalism: c('Feudalism', 'medieval', 120, ['defensivetactics']),
  civilservice: c('Civil Service', 'medieval', 120, ['defensivetactics', 'recordedhistory']),
  mercenaries: c('Mercenaries', 'medieval', 140, ['miltraining', 'feudalism']),
  faires: c('Medieval Faires', 'medieval', 140, ['feudalism']),
  guilds: c('Guilds', 'medieval', 140, ['feudalism', 'civilservice']),
  divineright: c('Divine Right', 'medieval', 140, ['civilservice', 'theology']),

  // Renaissance
  exploration: c('Exploration', 'renaissance', 165, ['mercenaries', 'faires']),
  humanism: c('Humanism', 'renaissance', 165, ['faires', 'guilds']),
  diplomaticservice: c('Diplomatic Service', 'renaissance', 165, ['guilds']),
  reformedchurch: c('Reformed Church', 'renaissance', 180, ['guilds', 'divineright']),
  mercantilism: c('Mercantilism', 'renaissance', 180, ['humanism']),
  enlightenment: c('The Enlightenment', 'renaissance', 180, ['diplomaticservice']),

  // Industrial
  colonialism: c('Colonialism', 'industrial', 215, ['mercantilism']),
  civilengineering: c('Civil Engineering', 'industrial', 215, ['mercantilism']),
  nationalism: c('Nationalism', 'industrial', 215, ['enlightenment']),
  opera: c('Opera and Ballet', 'industrial', 215, ['enlightenment']),
  naturalhistory: c('Natural History', 'industrial', 230, ['colonialism'], { districtBonus: { theater: { culture: 1 } } }, 'Theater Squares +1 Culture'),
  scorchedearth: c('Scorched Earth', 'industrial', 230, ['nationalism']),
  urbanization: c('Urbanization', 'industrial', 230, ['civilengineering', 'nationalism']),

  // Modern
  conservation: c('Conservation', 'modern', 255, ['naturalhistory', 'urbanization'], { improvementBonus: { lumbermill: { prod: 1 } } }, 'Lumber Mills +1 Production'),
  capitalism: c('Capitalism', 'modern', 255, ['urbanization']),
  massmedia: c('Mass Media', 'modern', 270, ['urbanization']),
  mobilization: c('Mobilization', 'modern', 270, ['urbanization']),
  ideology: c('Ideology', 'modern', 290, ['massmedia', 'mobilization'], { cityYield: { culture: 1 } }, '+1 Culture in every city'),
  nuclearprogram: c('Nuclear Program', 'modern', 290, ['ideology']),
  suffrage: c('Suffrage', 'modern', 290, ['ideology']),
  totalitarianism: c('Totalitarianism', 'modern', 290, ['ideology']),
  classstruggle: c('Class Struggle', 'modern', 290, ['ideology']),

  // Atomic
  culturalheritage: c('Cultural Heritage', 'atomic', 325, ['conservation'], { tourismPct: 50 }, '+50% Tourism'),
  coldwar: c('Cold War', 'atomic', 325, ['ideology']),
  professionalsports: c('Professional Sports', 'atomic', 325, ['ideology']),
  rapiddeployment: c('Rapid Deployment', 'atomic', 345, ['coldwar']),
  spacerace: c('Space Race', 'atomic', 345, ['coldwar'], { yieldPct: { science: 10 } }, '+10% Science'),

  // Information
  globalization: c('Globalization', 'information', 390, ['rapiddeployment', 'spacerace']),
  socialmedia: c('Social Media', 'information', 390, ['professionalsports', 'spacerace'], { tourismPct: 25 }, '+25% Tourism'),
  environmentalism: c('Environmentalism', 'information', 390, ['culturalheritage'], { cityYield: { food: 1 } }, '+1 Food in every city'),

  // Future
  nearfuture: c('Near Future Governance', 'future', 440, ['globalization', 'socialmedia']),
  venturepolitics: c('Venture Politics', 'future', 475, ['nearfuture']),
  distributedsovereignty: c('Distributed Sovereignty', 'future', 475, ['nearfuture']),
  optimization: c('Optimization Imperative', 'future', 475, ['nearfuture']),
  infowarfare: c('Information Warfare', 'future', 515, ['venturepolitics'], { strength: { all: 3 } }, 'Every unit +3 strength'),
  exodus: c('Exodus Imperative', 'future', 515, ['optimization'], { yieldPct: { science: 15 } }, '+15% Science'),
  smartpower: c('Smart Power Doctrine', 'future', 515, ['distributedsovereignty'], { yieldPct: { gold: 15 } }, '+15% Gold'),
  culturalhegemony: c('Cultural Hegemony', 'future', 565, ['smartpower', 'environmentalism'], { yieldPct: { culture: 25 } }, '+25% Culture'),
};

export const CIVIC_KEYS = Object.keys(CIVICS);

// A player's civics era: the latest era in which they have finished a civic.
export const civicEraOf = (civics) => eraIn(CIVICS, civics);
