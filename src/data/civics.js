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
  politicalphilosophy: c('Political Philosophy', 'classical', 65, ['stateworkforce', 'earlyempire']),
  games: c('Games and Recreation', 'classical', 65, ['stateworkforce']),
  drama: c('Drama and Poetry', 'classical', 65, ['earlyempire']),
  miltraining: c('Military Training', 'classical', 80, ['miltradition', 'games']),
  defensivetactics: c('Defensive Tactics', 'classical', 80, ['games', 'politicalphilosophy']),
  recordedhistory: c('Recorded History', 'classical', 80, ['politicalphilosophy', 'drama']),
  theology: c('Theology', 'classical', 80, ['drama', 'mysticism']),

  // Medieval
  navaltradition: c('Naval Tradition', 'medieval', 95, ['defensivetactics']),
  feudalism: c('Feudalism', 'medieval', 95, ['defensivetactics']),
  civilservice: c('Civil Service', 'medieval', 95, ['defensivetactics', 'recordedhistory']),
  mercenaries: c('Mercenaries', 'medieval', 110, ['miltraining', 'feudalism']),
  faires: c('Medieval Faires', 'medieval', 110, ['feudalism']),
  guilds: c('Guilds', 'medieval', 110, ['feudalism', 'civilservice']),
  divineright: c('Divine Right', 'medieval', 110, ['civilservice', 'theology']),

  // Renaissance
  exploration: c('Exploration', 'renaissance', 130, ['mercenaries', 'faires']),
  humanism: c('Humanism', 'renaissance', 130, ['faires', 'guilds']),
  diplomaticservice: c('Diplomatic Service', 'renaissance', 130, ['guilds']),
  reformedchurch: c('Reformed Church', 'renaissance', 145, ['guilds', 'divineright']),
  mercantilism: c('Mercantilism', 'renaissance', 145, ['humanism']),
  enlightenment: c('The Enlightenment', 'renaissance', 145, ['diplomaticservice']),

  // Industrial
  colonialism: c('Colonialism', 'industrial', 170, ['mercantilism']),
  civilengineering: c('Civil Engineering', 'industrial', 170, ['mercantilism']),
  nationalism: c('Nationalism', 'industrial', 170, ['enlightenment']),
  opera: c('Opera and Ballet', 'industrial', 170, ['enlightenment']),
  naturalhistory: c('Natural History', 'industrial', 185, ['colonialism'], { districtBonus: { theater: { culture: 1 } } }, 'Theater Squares +1 Culture'),
  scorchedearth: c('Scorched Earth', 'industrial', 185, ['nationalism']),
  urbanization: c('Urbanization', 'industrial', 185, ['civilengineering', 'nationalism']),

  // Modern
  conservation: c('Conservation', 'modern', 205, ['naturalhistory', 'urbanization'], { improvementBonus: { lumbermill: { prod: 1 } } }, 'Lumber Mills +1 Production'),
  capitalism: c('Capitalism', 'modern', 205, ['urbanization']),
  massmedia: c('Mass Media', 'modern', 215, ['urbanization']),
  mobilization: c('Mobilization', 'modern', 215, ['urbanization']),
  ideology: c('Ideology', 'modern', 230, ['massmedia', 'mobilization'], { cityYield: { culture: 1 } }, '+1 Culture in every city'),
  nuclearprogram: c('Nuclear Program', 'modern', 230, ['ideology']),
  suffrage: c('Suffrage', 'modern', 230, ['ideology']),
  totalitarianism: c('Totalitarianism', 'modern', 230, ['ideology']),
  classstruggle: c('Class Struggle', 'modern', 230, ['ideology']),

  // Atomic
  culturalheritage: c('Cultural Heritage', 'atomic', 260, ['conservation']),
  coldwar: c('Cold War', 'atomic', 260, ['ideology']),
  professionalsports: c('Professional Sports', 'atomic', 260, ['ideology']),
  rapiddeployment: c('Rapid Deployment', 'atomic', 275, ['coldwar']),
  spacerace: c('Space Race', 'atomic', 275, ['coldwar'], { yieldPct: { science: 10 } }, '+10% Science'),

  // Information
  globalization: c('Globalization', 'information', 310, ['rapiddeployment', 'spacerace']),
  socialmedia: c('Social Media', 'information', 310, ['professionalsports', 'spacerace']),
  environmentalism: c('Environmentalism', 'information', 310, ['culturalheritage'], { cityYield: { food: 1 } }, '+1 Food in every city'),

  // Future
  nearfuture: c('Near Future Governance', 'future', 350, ['globalization', 'socialmedia']),
  venturepolitics: c('Venture Politics', 'future', 380, ['nearfuture']),
  distributedsovereignty: c('Distributed Sovereignty', 'future', 380, ['nearfuture']),
  optimization: c('Optimization Imperative', 'future', 380, ['nearfuture']),
  infowarfare: c('Information Warfare', 'future', 410, ['venturepolitics'], { strength: { all: 3 } }, 'Every unit +3 strength'),
  exodus: c('Exodus Imperative', 'future', 410, ['optimization'], { yieldPct: { science: 15 } }, '+15% Science'),
  smartpower: c('Smart Power Doctrine', 'future', 410, ['distributedsovereignty'], { yieldPct: { gold: 15 } }, '+15% Gold'),
  culturalhegemony: c('Cultural Hegemony', 'future', 450, ['smartpower', 'environmentalism'], { yieldPct: { culture: 25 } }, '+25% Culture'),
};

export const CIVIC_KEYS = Object.keys(CIVICS);

// A player's civics era: the latest era in which they have finished a civic.
export const civicEraOf = (civics) => eraIn(CIVICS, civics);
