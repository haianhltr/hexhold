# Hexhold civics dictionary

This is the design reference for Hexhold's civics tree, governments and policy cards. It pairs with [tech-dictionary.md](tech-dictionary.md). `src/data/civics.js`, `src/data/government.js` and `src/data/boosts.js` implement it, and `node tools/docs.mjs` regenerates this page from them.

**Coverage.** The tree is modeled on Civilization VI's civics tree, including the Gathering Storm expansion's Environmentalism and its Future era. That's **59 civics in 9 eras**, plus a repeatable **Future Civic**.

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
- **Inspirations:** almost every civic has a goal (the **Inspiration** column). Meeting it gives 40% of the civic's cost at once, whether or not you're researching it. China gets more.
- After every civic, a repeatable **Future Civic** (800 culture) adds +5 score each.
- Each civic researched is worth 2 points of score, the same as a tech.

## Governments and policy cards

A government has **policy slots** of three kinds:

| Slot | Takes |
|---|---|
| Military | Military cards |
| Economic | Economic cards |
| Wildcard | Any card, including wildcard-only cards |

Each card can be slotted once. When a later card replaces an older one (**Replaced by** below), the old card can't be slotted any more. If it was slotted, the replacement takes its place automatically. Greece gets one extra wildcard slot in every government.

**When changes are free.** On any turn you finish a civic, you can change government and policy cards for free until the end of the round. At other times:
- each newly slotted card costs **20 gold + 3 per civic researched**
- switching government costs 3 times that
- removing a card is always free
- your first government is free, and so is filling a new government's slots on the turn you adopt it

When you switch government, cards move to slots of their own kind first, then to wildcard slots. Cards that don't fit are unslotted.

### Governments

| Government | Unlocked by | Tier | Military | Economic | Wildcard | Bonus |
|---|---|---|---|---|---|---|
| Chiefdom | Code of Laws | Start | 1 | 1 | 0 | No bonus |
| Autocracy | Political Philosophy | 1 | 2 | 1 | 1 | +1 to every yield in the capital |
| Oligarchy | Political Philosophy | 1 | 1 | 1 | 2 | Melee units +4 strength |
| Classical Republic | Political Philosophy | 1 | 0 | 2 | 2 | +10% Culture and Gold |
| Monarchy | Divine Right | 2 | 3 | 1 | 2 | Cities +5 strength; Walls, Castles and Star Forts build 50% faster |
| Theocracy | Reformed Church | 2 | 2 | 2 | 2 | +15% Culture; units heal +5 HP per turn |
| Merchant Republic | Exploration | 2 | 1 | 2 | 3 | Buying with gold costs 15% less; +10% Gold |
| Fascism | Totalitarianism | 3 | 4 | 1 | 3 | Every unit +5 strength |
| Communism | Class Struggle | 3 | 3 | 3 | 2 | +15% Production |
| Democracy | Suffrage | 3 | 1 | 4 | 3 | Buying with gold costs 25% less; +10% Science |
| Corporate Libertarianism | Venture Politics | 4 | 2 | 4 | 2 | +15% Production and Gold |
| Digital Democracy | Distributed Sovereignty | 4 | 1 | 4 | 3 | +15% Science and Culture |
| Synthetic Technocracy | Optimization Imperative | 4 | 3 | 3 | 2 | +25% Science |

### Military cards

| Card | Unlocked by | Effect | Replaced by |
|---|---|---|---|
| Discipline | Code of Laws | Every unit +3 strength when defending | Scorched Earth |
| Agoge | Craftsmanship | +50% Production toward melee, anti-cavalry and ranged units | Feudal Contract |
| Maneuver | Military Tradition | +50% Production toward mounted units | Chivalry |
| Conscription | State Workforce | Each city supports 1 more unit without upkeep | Levée en Masse |
| Limes | Defensive Tactics | +100% Production toward Walls, Castles and Star Forts | — |
| Bastions | Defensive Tactics | Cities +6 strength | — |
| Veterancy | Military Training | +50% Production toward Encampments and their buildings | — |
| Professional Army | Mercenaries | Upgrading units costs 50% less | Force Modernization |
| Chivalry | Divine Right | +75% Production toward mounted units | — |
| Feudal Contract | Exploration | +75% Production toward melee, anti-cavalry and ranged units | Grande Armée |
| Grande Armée | Nationalism | +100% Production toward melee, anti-cavalry and ranged units | — |
| National Identity | Nationalism | Units heal +10 HP per turn | — |
| Scorched Earth | Scorched Earth | Every unit +6 strength when defending | — |
| Levée en Masse | Mobilization | Each city supports 2 more units without upkeep | — |
| Military Research | Mobilization | Encampments +3 Science | — |
| Total War | Totalitarianism | Every unit +3 strength | Military Organization |
| Military Organization | Cold War | Every unit +5 strength | — |
| Lightning Warfare | Rapid Deployment | Mounted units +1 move | — |
| Force Modernization | Rapid Deployment | Upgrading units costs 75% less | — |

### Economic cards

| Card | Unlocked by | Effect | Replaced by |
|---|---|---|---|
| God King | Code of Laws | +1 Gold and +1 Culture in the capital | — |
| Urban Planning | Code of Laws | +1 Production in every city | — |
| Ilkum | Craftsmanship | +30% Production toward Builders | Public Works |
| Caravansaries | Foreign Trade | +1 Gold in every city | — |
| Colonization | Early Empire | +50% Production toward Settlers | — |
| Land Surveyors | Early Empire | Buying tiles costs 30% less | — |
| Insulae | Games and Recreation | +1 Food in every city | — |
| Natural Philosophy | Recorded History | Campus adjacency bonuses doubled | Five-Year Plan |
| Scripture | Theology | Shrines +2 Culture | — |
| Naval Infrastructure | Naval Tradition | Harbor adjacency bonuses doubled | Economic Union |
| Serfdom | Feudalism | New Builders +2 uses | Public Works |
| Meritocracy | Civil Service | +1 Culture per district | — |
| Trade Confederation | Medieval Faires | +2 Gold in every city | — |
| Aesthetics | Medieval Faires | Theater Square adjacency bonuses doubled | — |
| Town Charters | Guilds | Commercial Hub adjacency bonuses doubled | Economic Union |
| Craftsmen | Guilds | Industrial Zone adjacency bonuses doubled | Five-Year Plan |
| Colonial Offices | Exploration | Cities grow 25% faster | — |
| Wisselbanken | Diplomatic Service | +1 Gold and +1 Science in every city | — |
| Triangular Trade | Mercantilism | Harbors and Commercial Hubs +2 Gold | — |
| Rationalism | The Enlightenment | Campus buildings +50% yields | — |
| Free Market | The Enlightenment | Commercial Hub buildings +50% yields | — |
| Colonial Taxes | Colonialism | +15% Gold | — |
| Public Works | Civil Engineering | +50% Production toward Builders; new Builders +2 uses | — |
| Grand Opera | Opera and Ballet | Theater Square buildings +50% yields | — |
| Public Transport | Urbanization | Farms +1 Food | — |
| Market Economy | Capitalism | +20% Gold | — |
| Economic Union | Capitalism | Commercial Hub and Harbor adjacency bonuses doubled | — |
| Research Grants | Nuclear Program | +10% Science | — |
| New Deal | Suffrage | +2 Food and −2 Gold in every city | — |
| Five-Year Plan | Class Struggle | Campus and Industrial Zone adjacency bonuses doubled | — |
| Collectivization | Class Struggle | Farms +1 Production | — |
| Sports Media | Professional Sports | +2 Culture in every city | — |
| Ecommerce | Globalization | +2 Production and +3 Gold in every city | — |

### Wildcard-only cards

| Card | Unlocked by | Effect | Replaced by |
|---|---|---|---|
| Revelation | Mysticism | +2 Culture in the capital | — |
| Charismatic Leader | Political Philosophy | +1 Culture in every city | — |
| Propaganda | Mass Media | +15% Culture | Heritage Tourism |
| Heritage Tourism | Cultural Heritage | +15% Culture and +50% Tourism | — |
| Online Communities | Social Media | +15% Culture and +75% Tourism | — |

## Eras at a glance

| Era | Civics | Culture per civic | Theme |
|---|---|---|---|
| Ancient | 7 | 20–40 | Laws, crafts, trade and the first government |
| Classical | 7 | 80–100 | Philosophy, drama and the first real governments |
| Medieval | 7 | 120–140 | Feudal duty, guilds, divine right |
| Renaissance | 6 | 165–180 | Exploration, humanism and the Enlightenment |
| Industrial | 7 | 215–230 | Nations, cities and the arts |
| Modern | 9 | 255–290 | Ideology and the three modern governments |
| Atomic | 5 | 325–345 | Cold war, sport and the space race |
| Information | 3 | 390–390 | A connected world |
| Future | 8 | 440–565 | Governments of the future |

---

## Ancient era

| Civic | Cost | Needs | Unlocks | Inspiration |
|---|---|---|---|---|
| Code of Laws | 20 | — | **Chiefdom** (government), Discipline (military), God King (economic), Urban Planning (economic) | — |
| Craftsmanship | 30 | Code of Laws | Sphinx (Egypt only), Agoge (military), Ilkum (economic) | Improve 3 tiles |
| Foreign Trade | 30 | Code of Laws | Caravansaries (economic) | Explore 15% of the map |
| Early Empire | 40 | Foreign Trade | Colonization (economic), Land Surveyors (economic) | Found 3 cities |
| Mysticism | 40 | Foreign Trade | Revelation (wildcard) | Build a Shrine |
| Military Tradition | 40 | Craftsmanship | Maneuver (military) | Destroy 2 enemy units |
| State Workforce | 40 | Craftsmanship | Conscription (military) | Build a district |

## Classical era

| Civic | Cost | Needs | Unlocks | Inspiration |
|---|---|---|---|---|
| Political Philosophy | 80 | State Workforce, Early Empire | **Autocracy** (government), **Oligarchy** (government), **Classical Republic** (government), Pairidaeza (Persia only), Charismatic Leader (wildcard) | Meet 2 civilizations |
| Games and Recreation | 80 | State Workforce | Insulae (economic) | Research Construction |
| Drama and Poetry | 80 | Early Empire | **Theater Square** district, **Amphitheater** | Build 2 Monuments |
| Military Training | 100 | Military Tradition, Games and Recreation | Veterancy (military) | Build an Encampment |
| Defensive Tactics | 100 | Games and Recreation, Political Philosophy | Limes (military), Bastions (military) | Go to war |
| Recorded History | 100 | Political Philosophy, Drama and Poetry | Natural Philosophy (economic) | Build 2 Campus |
| Theology | 100 | Drama and Poetry, Mysticism | Scripture (economic) | Build 2 Shrines |

## Medieval era

| Civic | Cost | Needs | Unlocks | Inspiration |
|---|---|---|---|---|
| Naval Tradition | 120 | Defensive Tactics | Naval Infrastructure (economic) | Have 3 cities on the coast |
| Feudalism | 120 | Defensive Tactics | Serfdom (economic) | Build 6 Farms |
| Civil Service | 120 | Defensive Tactics, Recorded History | Meritocracy (economic) | Grow a city to 10 population |
| Mercenaries | 140 | Military Training, Feudalism | Professional Army (military) | Have 8 military units |
| Medieval Faires | 140 | Feudalism | Trade Confederation (economic), Aesthetics (economic) | Build 2 Markets |
| Guilds | 140 | Feudalism, Civil Service | Town Charters (economic), Craftsmen (economic) | Build 2 Commercial Hubs |
| Divine Right | 140 | Civil Service, Theology | **Monarchy** (government), Chivalry (military) | Adopt a Tier 1 government |

## Renaissance era

| Civic | Cost | Needs | Unlocks | Inspiration |
|---|---|---|---|---|
| Exploration | 165 | Mercenaries, Medieval Faires | **Merchant Republic** (government), Feudal Contract (military), Colonial Offices (economic) | Build a Harbor |
| Humanism | 165 | Medieval Faires, Guilds | **Art Museum**, Château (France only) | Build an Amphitheater |
| Diplomatic Service | 165 | Guilds | Wisselbanken (economic) | Make peace |
| Reformed Church | 180 | Guilds, Divine Right | **Theocracy** (government) | Found 6 cities |
| Mercantilism | 180 | Humanism | Triangular Trade (economic) | Build a Bank |
| The Enlightenment | 180 | Diplomatic Service | Rationalism (economic), Free Market (economic) | Build 2 Universities |

## Industrial era

| Civic | Cost | Needs | Unlocks | Inspiration |
|---|---|---|---|---|
| Colonialism | 215 | Mercantilism | Colonial Taxes (economic) | Research Astronomy |
| Civil Engineering | 215 | Mercantilism | Public Works (economic) | Have 8 districts |
| Nationalism | 215 | The Enlightenment | Grande Armée (military), National Identity (military) | Go to war 2 times |
| Opera and Ballet | 215 | The Enlightenment | Grand Opera (economic) | Build an Art Museum |
| Natural History | 230 | Colonialism | Theater Squares +1 Culture | Explore 50% of the map |
| Scorched Earth | 230 | Nationalism | Scorched Earth (military) | Train 2 Field Cannons |
| Urbanization | 230 | Civil Engineering, Nationalism | Public Transport (economic) | Grow a city to 15 population |

## Modern era

| Civic | Cost | Needs | Unlocks | Inspiration |
|---|---|---|---|---|
| Conservation | 255 | Natural History, Urbanization | Lumber Mills +1 Production | Build 3 Theater Squares |
| Capitalism | 255 | Urbanization | Market Economy (economic), Economic Union (economic) | Build 3 Banks |
| Mass Media | 270 | Urbanization | Propaganda (wildcard) | Research Radio |
| Mobilization | 270 | Urbanization | Levée en Masse (military), Military Research (military) | Have 15 military units |
| Ideology | 290 | Mass Media, Mobilization | +1 Culture in every city | — |
| Nuclear Program | 290 | Ideology | Research Grants (economic) | Build a Research Lab |
| Suffrage | 290 | Ideology | **Democracy** (government), New Deal (economic) | Build 4 Sewers |
| Totalitarianism | 290 | Ideology | **Fascism** (government), Total War (military) | Build 3 Military Academies |
| Class Struggle | 290 | Ideology | **Communism** (government), Five-Year Plan (economic), Collectivization (economic) | Build 3 Factories |

## Atomic era

| Civic | Cost | Needs | Unlocks | Inspiration |
|---|---|---|---|---|
| Cultural Heritage | 325 | Conservation | Heritage Tourism (wildcard), +50% Tourism | Reach 20 Tourism per turn |
| Cold War | 325 | Ideology | Military Organization (military) | Research Nuclear Fission |
| Professional Sports | 325 | Ideology | Sports Media (economic) | Grow a city to 20 population |
| Rapid Deployment | 345 | Cold War | Lightning Warfare (military), Force Modernization (military) | Destroy 30 enemy units |
| Space Race | 345 | Cold War | +10% Science | Research Rocketry |

## Information era

| Civic | Cost | Needs | Unlocks | Inspiration |
|---|---|---|---|---|
| Globalization | 390 | Rapid Deployment, Space Race | Ecommerce (economic) | Build 2 Stock Exchanges |
| Social Media | 390 | Professional Sports, Space Race | Online Communities (wildcard), +25% Tourism | Research Telecommunications |
| Environmentalism | 390 | Cultural Heritage | +1 Food in every city | Build 6 Lumber Mills |

## Future era

| Civic | Cost | Needs | Unlocks | Inspiration |
|---|---|---|---|---|
| Near Future Governance | 440 | Globalization, Social Media | — | Reach 60 Tourism per turn |
| Venture Politics | 475 | Near Future Governance | **Corporate Libertarianism** (government) | Have 2000 Gold |
| Distributed Sovereignty | 475 | Near Future Governance | **Digital Democracy** (government) | Build 3 Broadcast Centers |
| Optimization Imperative | 475 | Near Future Governance | **Synthetic Technocracy** (government) | Research Robotics |
| Information Warfare | 515 | Venture Politics | Every unit +3 strength | Have 25 military units |
| Exodus Imperative | 515 | Optimization Imperative | +15% Science | Research Satellites |
| Smart Power Doctrine | 515 | Distributed Sovereignty | +15% Gold | Adopt a Tier 4 government |
| Cultural Hegemony | 565 | Smart Power Doctrine, Environmentalism | +25% Culture | Reach 100 Tourism per turn |

| Future Civic | 800 | Every other civic | Repeatable, +5 score each | — |

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
