// Regenerates the data-driven dictionaries from src/data, so they never drift from the game:
//   docs/civics-dictionary.md and docs/civilizations-dictionary.md
// (docs/tech-dictionary.md is written by hand; its costs and Eurekas are checked by the tests.)
//   node tools/docs.mjs

import fs from 'fs';
import { ERAS, TECHS } from '../src/data/techs.js';
import { CIVICS, CIVIC_KEYS } from '../src/data/civics.js';
import { GOVERNMENTS, POLICIES, SLOT_NAMES } from '../src/data/government.js';
import { BUILDINGS } from '../src/data/buildings.js';
import { DISTRICTS } from '../src/data/districts.js';
import { UNITS } from '../src/data/units.js';
import { IMPROVEMENTS } from '../src/data/terrain.js';
import { CIVS, CIV_KEYS } from '../src/data/civs.js';
import { RULES } from '../src/data/rules.js';
import { boostGoal, goalText } from '../src/core/boosts.js';

const cname = (k) => CIVICS[k].name;

// ---------- civics ----------

function civicUnlocks(k) {
  const out = [];
  for (const g of Object.values(GOVERNMENTS)) if (g.civic === k) out.push(`**${g.name}** (government)`);
  for (const d of Object.values(DISTRICTS)) if (d.civic === k) out.push(`**${d.name}** district`);
  for (const b of Object.values(BUILDINGS)) if (b.civic === k && !b.civ) out.push(`**${b.name}**`);
  for (const [key, d] of Object.entries(IMPROVEMENTS)) if (d.civic === k) out.push(`${d.name} (${CIVS[d.civ].name} only)`);
  for (const c of Object.values(POLICIES)) if (c.civic === k) out.push(`${c.name} (${SLOT_NAMES[c.slot].toLowerCase()})`);
  if (CIVICS[k].effectText) out.push(CIVICS[k].effectText);
  return out.join(', ') || '—';
}

const THEMES = {
  ancient: 'Laws, crafts, trade and the first government',
  classical: 'Philosophy, drama and the first real governments',
  medieval: 'Feudal duty, guilds, divine right',
  renaissance: 'Exploration, humanism and the Enlightenment',
  industrial: 'Nations, cities and the arts',
  modern: 'Ideology and the three modern governments',
  atomic: 'Cold war, sport and the space race',
  information: 'A connected world',
  future: 'Governments of the future',
};

let civics = `# Hexhold civics dictionary

This is the design reference for Hexhold's civics tree, governments and policy cards. It pairs with [tech-dictionary.md](tech-dictionary.md). \`src/data/civics.js\`, \`src/data/government.js\` and \`src/data/boosts.js\` implement it, and \`node tools/docs.mjs\` regenerates this page from them.

**Coverage.** The tree is modeled on Civilization VI's civics tree, including the Gathering Storm expansion's Environmentalism and its Future era. That's **${CIVIC_KEYS.length} civics in ${ERAS.length} eras**, plus a repeatable **Future Civic**.

**What's ours.** Civic and government names are ordinary historical and political terms, and many policy cards borrow Civ VI's names. Everything else is Hexhold's own design, built on Hexhold's rules rather than Civ VI's:
- culture costs, prerequisites and Inspiration goals
- the slot layout and bonus of every government
- every policy card's effect
- all descriptions

Hexhold has no religion, great people, city-states, trade routes, amenities, housing or loyalty. Civ VI cards and bonuses that depend on those are either left out or rewritten to use yields, production, combat and gold instead.

## How civics work

- **Culture researches civics** the way science researches techs. Every city's culture counts toward the current civic, and still grows that city's borders too.
- Pick any civic in the tree. If it needs earlier civics, those are researched first.
- Civics unlock **governments**, **policy cards**, the **Theater Square** with its first two buildings, a few unique improvements, and some lasting bonuses.
- **Inspirations:** almost every civic has a goal (the **Inspiration** column). Meeting it gives ${RULES.boostPct}% of the civic's cost at once, whether or not you're researching it. China gets more.
- After every civic, a repeatable **Future Civic** (${RULES.futureCivicCost} culture) adds +${RULES.score.future} score each.
- Each civic researched is worth ${RULES.score.civic} points of score, the same as a tech.

## Governments and policy cards

A government has **policy slots** of three kinds:

| Slot | Takes |
|---|---|
| Military | Military cards |
| Economic | Economic cards |
| Wildcard | Any card, including wildcard-only cards |

Each card can be slotted once. When a later card replaces an older one (**Replaced by** below), the old card can't be slotted any more. If it was slotted, the replacement takes its place automatically. Greece gets one extra wildcard slot in every government.

**When changes are free.** On any turn you finish a civic, you can change government and policy cards for free until the end of the round. At other times:
- each newly slotted card costs **${RULES.policySwapBase} gold + ${RULES.policySwapPerCivic} per civic researched**
- switching government costs ${RULES.governmentCostMult} times that
- removing a card is always free
- your first government is free, and so is filling a new government's slots on the turn you adopt it

When you switch government, cards move to slots of their own kind first, then to wildcard slots. Cards that don't fit are unslotted.

### Governments

| Government | Unlocked by | Tier | Military | Economic | Wildcard | Bonus |
|---|---|---|---|---|---|---|
${Object.values(GOVERNMENTS).map((g) => `| ${g.name} | ${cname(g.civic)} | ${g.tier || 'Start'} | ${g.slots[0]} | ${g.slots[1]} | ${g.slots[2]} | ${g.effectText} |`).join('\n')}

`;

for (const slot of ['military', 'economic', 'wildcard']) {
  const title = { military: 'Military cards', economic: 'Economic cards', wildcard: 'Wildcard-only cards' }[slot];
  civics += `### ${title}\n\n| Card | Unlocked by | Effect | Replaced by |\n|---|---|---|---|\n`;
  for (const c of Object.values(POLICIES).filter((c) => c.slot === slot)) {
    civics += `| ${c.name} | ${cname(c.civic)} | ${c.effectText} | ${c.obsoleteBy ? POLICIES[c.obsoleteBy].name : '—'} |\n`;
  }
  civics += '\n';
}

civics += `## Eras at a glance

| Era | Civics | Culture per civic | Theme |
|---|---|---|---|
${ERAS.map((e) => {
  const ks = CIVIC_KEYS.filter((k) => CIVICS[k].era === e.key);
  const costs = ks.map((k) => CIVICS[k].cost);
  return `| ${e.name} | ${ks.length} | ${Math.min(...costs)}–${Math.max(...costs)} | ${THEMES[e.key]} |`;
}).join('\n')}

---

`;

for (const e of ERAS) {
  civics += `## ${e.name} era\n\n| Civic | Cost | Needs | Unlocks | Inspiration |\n|---|---|---|---|---|\n`;
  for (const k of CIVIC_KEYS.filter((k) => CIVICS[k].era === e.key)) {
    const c = CIVICS[k];
    const goal = boostGoal('civic', k);
    civics += `| ${c.name} | ${c.cost} | ${c.req.map(cname).join(', ') || '—'} | ${civicUnlocks(k)} | ${goal ? goalText(goal) : '—'} |\n`;
  }
  civics += '\n';
}

civics += `| Future Civic | ${RULES.futureCivicCost} | Every other civic | Repeatable, +${RULES.score.future} score each | — |

## Effect glossary

Card, government and civic effects use the same fields as tech effects (see the tech dictionary), plus:

| Effect | Meaning |
|---|---|
| Production toward X | Faster production of matching units, buildings or districts. "Melee" covers anti-cavalry units but not mounted units. |
| Adjacency doubled | The district's adjacency bonus counts twice. Its base +1 isn't doubled. |
| Buildings +50% yields | Yields of buildings in that district |
| Per district | Added once for each district in each city |
| In the capital | Added to the capital only |
| More units without upkeep | Each city supports extra units before unit upkeep starts |
| Upgrades cost less | A discount on upgrading units |
| Buying costs less | A discount when buying items with gold (Land Surveyors discounts tiles) |
| Grow faster | Cities need less food to grow |
| Tourism | Draws visitors from other civilizations toward a culture victory (see [victory-and-history.md](victory-and-history.md)) |

## Pacing targets

Civics move a little behind techs. In AI-vs-AI games on Normal, the leading civilization is in the Renaissance or Industrial era of civics by turn 100, about level with its techs. The AI-vs-AI soak test reports each game's tech and civics era at turn 100, and the costs above are tuned against it.
`;

fs.writeFileSync('docs/civics-dictionary.md', civics);

// ---------- civilizations ----------

const yieldsText = (d) => ['food', 'prod', 'gold', 'science', 'culture'].filter((y) => d[y]).map((y) => `+${d[y]} ${{ food: 'Food', prod: 'Production', gold: 'Gold', science: 'Science', culture: 'Culture' }[y]}`).join(', ');

function infraLine(k) {
  const c = CIVS[k];
  const { kind, key } = c.infra;
  if (kind === 'building') {
    const b = BUILDINGS[key];
    return `**${b.name}** (building, replaces the ${BUILDINGS[b.replaces].name}): ${b.info}. Cost ${b.cost}.`;
  }
  if (kind === 'improvement') {
    const d = IMPROVEMENTS[key];
    const unlock = d.civic ? cname(d.civic) : TECHS[d.tech].name;
    return `**${d.name}** (improvement, from ${unlock}): ${yieldsText(d)}. ${d.hint}.`;
  }
  return `**${c.districtNames[key]}** (district, replaces the ${DISTRICTS[key].name}): ${c.infraText}`;
}

function unitLine(k) {
  const u = UNITS[CIVS[k].unit];
  const base = UNITS[u.replaces];
  const diffs = [];
  const label = { strength: 'Strength', ranged: 'Ranged strength', moves: 'Moves', cost: 'Cost' };
  for (const f of ['strength', 'ranged', 'moves', 'cost']) if (u[f] !== base[f]) diffs.push(`${label[f]} ${u[f]} (${base.name} ${base[f] ?? '—'})`);
  if (u.defenseBonus) diffs.push(`+${u.defenseBonus} when defending`);
  if (u.noWoundPenalty) diffs.push('No penalty when wounded');
  if (u.tags?.includes('mounted') && !base.tags?.includes('mounted')) diffs.push('Mounted');
  return `**${u.name}** (replaces the ${base.name}): ${u.info} ${diffs.join('. ')}.`;
}

let civDoc = `# Hexhold civilizations dictionary

The design reference for Hexhold's ${CIV_KEYS.length} playable civilizations. \`src/data/civs.js\` implements it, with unique units in \`units.js\`, unique buildings in \`buildings.js\` and unique improvements in \`terrain.js\`. \`node tools/docs.mjs\` regenerates this page.

**What's historical and what's ours.** The civilizations, their leaders and their city names are real history. Each civilization's ability name, effect and unique items are Hexhold's own design, chosen to suit its history and to use Hexhold's rules. They are not copied from any other game.

## How civilizations differ

Every civilization has three traits:
- an **ability**: a bonus for the whole empire, all game
- a **unique unit** that replaces a standard unit. It's unlocked by the same tech and upgrades along the same line.
- a **unique building, district or improvement**. A unique building replaces a standard one. A unique district is a stronger version of a standard district with its own name. A unique improvement is one only its civilization's Builders can make.

The AI plays each civilization with a leaning: **builders** favor growth, science and culture, and **conquerors** favor armies and war.

Players pick a civilization on the New game screen. Rivals are drawn at random from the rest.

## At a glance

| Civilization | Leader | Ability | Unique unit | Unique infrastructure | AI leaning |
|---|---|---|---|---|---|
${CIV_KEYS.map((k) => {
  const c = CIVS[k];
  const infra = c.infra.kind === 'building' ? BUILDINGS[c.infra.key].name : c.infra.kind === 'improvement' ? IMPROVEMENTS[c.infra.key].name : c.districtNames[c.infra.key];
  return `| ${c.name} | ${c.leader} | ${c.ability.name} | ${UNITS[c.unit].name} | ${infra} | ${c.personality === 'builder' ? 'Builder' : 'Conqueror'} |`;
}).join('\n')}

`;

for (const k of CIV_KEYS) {
  const c = CIVS[k];
  civDoc += `## ${c.name}

Led by **${c.leader}**. Color ${c.color}, emblem: ${{ laurel: 'laurel wreath', ankh: 'ankh', column: 'Ionic column', wingedDisc: 'winged disc', coin: 'round coin', wheel: 'twelve-spoked wheel', torii: 'torii gate', bell: 'temple bell', ger: 'ger (felt tent)', rose: 'five-petal rose', fleur: 'fleur-de-lis', pyramid: 'stepped temple pyramid' }[c.emblem]}.

- **${c.ability.name}:** ${c.ability.text}
- ${unitLine(k)}
- ${infraLine(k)}
- **Cities:** ${c.cities.join(', ')}

`;
}

fs.writeFileSync('docs/civilizations-dictionary.md', civDoc);
console.log('Wrote docs/civics-dictionary.md and docs/civilizations-dictionary.md');
