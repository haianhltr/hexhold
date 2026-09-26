# Hexhold civics dictionary

This is the design reference for Hexhold's civics tree, governments and policy cards. It pairs with [tech-dictionary.md](tech-dictionary.md), and `src/data/civics.js` and `src/data/government.js` implement it.

**Coverage.** The tree is modeled on Civilization VI's civics tree, including the Gathering Storm expansion's Environmentalism and its Future era. That's **59 civics in 9 eras**, plus a repeatable **Future Civic**.

**What's ours.** Civic and government names are ordinary historical and political terms, and many policy cards borrow Civ VI's names. Everything else is Hexhold's own design, built on Hexhold's rules rather than Civ VI's:
- culture costs and prerequisites
- the slot layout and bonus of every government
- every policy card's effect
- all descriptions

Hexhold has no religion, great people, city-states, trade routes, amenities, housing or loyalty. Civ VI cards and bonuses that depend on those are either left out or rewritten to use yields, production, combat and gold instead.

## How civics work

- **Culture researches civics** the way science researches techs. Every city's culture counts toward the current civic, and still grows that city's borders too.
- Pick any civic in the tree. If it needs earlier civics, those are researched first.
- Civics unlock **governments**, **policy cards**, the **Theater Square** with its first two buildings, and a few lasting bonuses.
- After every civic, a repeatable **Future Civic** (800 culture) adds +5 score each.
- Each civic researched is worth 2 points of score, the same as a tech.

## Governments and policy cards

A government has **policy slots** of three kinds:

| Slot | Takes |
|---|---|
| Military | Military cards |
| Economic | Economic cards |
| Wildcard | Any card, including wildcard-only cards |

Each card can be slotted once. When a later card replaces an older one (**Replaced by** below), the old card can't be slotted any more. If it was slotted, the replacement takes its place automatically.

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
| Heritage Tourism | Cultural Heritage | +25% Culture | — |
| Online Communities | Social Media | +15% Culture and +10% Science | — |

## Eras at a glance

| Era | Civics | Culture per civic | Theme |
|---|---|---|---|
| Ancient | 7 | 20–40 | Laws, crafts, trade and the first government |
| Classical | 7 | 65–80 | Philosophy, drama and the first real governments |
| Medieval | 7 | 95–110 | Feudal duty, guilds, divine right |
| Renaissance | 6 | 130–145 | Exploration, humanism and the Enlightenment |
| Industrial | 7 | 170–185 | Nations, cities and the arts |
| Modern | 9 | 205–230 | Ideology and the three modern governments |
| Atomic | 5 | 260–275 | Cold war, sport and the space race |
| Information | 3 | 310–310 | A connected world |
| Future | 8 | 350–450 | Governments of the future |

---

## Ancient era

| Civic | Cost | Needs | Unlocks |
|---|---|---|---|
| Code of Laws | 20 | — | **Chiefdom** (government), Discipline (military), God King (economic), Urban Planning (economic) |
| Craftsmanship | 30 | Code of Laws | Agoge (military), Ilkum (economic) |
| Foreign Trade | 30 | Code of Laws | Caravansaries (economic) |
| Early Empire | 40 | Foreign Trade | Colonization (economic), Land Surveyors (economic) |
| Mysticism | 40 | Foreign Trade | Revelation (wildcard) |
| Military Tradition | 40 | Craftsmanship | Maneuver (military) |
| State Workforce | 40 | Craftsmanship | Conscription (military) |

## Classical era

| Civic | Cost | Needs | Unlocks |
|---|---|---|---|
| Political Philosophy | 65 | State Workforce, Early Empire | **Autocracy** (government), **Oligarchy** (government), **Classical Republic** (government), Charismatic Leader (wildcard) |
| Games and Recreation | 65 | State Workforce | Insulae (economic) |
| Drama and Poetry | 65 | Early Empire | **Theater Square** district, **Amphitheater** |
| Military Training | 80 | Military Tradition, Games and Recreation | Veterancy (military) |
| Defensive Tactics | 80 | Games and Recreation, Political Philosophy | Limes (military), Bastions (military) |
| Recorded History | 80 | Political Philosophy, Drama and Poetry | Natural Philosophy (economic) |
| Theology | 80 | Drama and Poetry, Mysticism | Scripture (economic) |

## Medieval era

| Civic | Cost | Needs | Unlocks |
|---|---|---|---|
| Naval Tradition | 95 | Defensive Tactics | Naval Infrastructure (economic) |
| Feudalism | 95 | Defensive Tactics | Serfdom (economic) |
| Civil Service | 95 | Defensive Tactics, Recorded History | Meritocracy (economic) |
| Mercenaries | 110 | Military Training, Feudalism | Professional Army (military) |
| Medieval Faires | 110 | Feudalism | Trade Confederation (economic), Aesthetics (economic) |
| Guilds | 110 | Feudalism, Civil Service | Town Charters (economic), Craftsmen (economic) |
| Divine Right | 110 | Civil Service, Theology | **Monarchy** (government), Chivalry (military) |

## Renaissance era

| Civic | Cost | Needs | Unlocks |
|---|---|---|---|
| Exploration | 130 | Mercenaries, Medieval Faires | **Merchant Republic** (government), Feudal Contract (military), Colonial Offices (economic) |
| Humanism | 130 | Medieval Faires, Guilds | **Art Museum** |
| Diplomatic Service | 130 | Guilds | Wisselbanken (economic) |
| Reformed Church | 145 | Guilds, Divine Right | **Theocracy** (government) |
| Mercantilism | 145 | Humanism | Triangular Trade (economic) |
| The Enlightenment | 145 | Diplomatic Service | Rationalism (economic), Free Market (economic) |

## Industrial era

| Civic | Cost | Needs | Unlocks |
|---|---|---|---|
| Colonialism | 170 | Mercantilism | Colonial Taxes (economic) |
| Civil Engineering | 170 | Mercantilism | Public Works (economic) |
| Nationalism | 170 | The Enlightenment | Grande Armée (military), National Identity (military) |
| Opera and Ballet | 170 | The Enlightenment | Grand Opera (economic) |
| Natural History | 185 | Colonialism | Theater Squares +1 Culture |
| Scorched Earth | 185 | Nationalism | Scorched Earth (military) |
| Urbanization | 185 | Civil Engineering, Nationalism | Public Transport (economic) |

## Modern era

| Civic | Cost | Needs | Unlocks |
|---|---|---|---|
| Conservation | 205 | Natural History, Urbanization | Lumber Mills +1 Production |
| Capitalism | 205 | Urbanization | Market Economy (economic), Economic Union (economic) |
| Mass Media | 215 | Urbanization | Propaganda (wildcard) |
| Mobilization | 215 | Urbanization | Levée en Masse (military), Military Research (military) |
| Ideology | 230 | Mass Media, Mobilization | +1 Culture in every city |
| Nuclear Program | 230 | Ideology | Research Grants (economic) |
| Suffrage | 230 | Ideology | **Democracy** (government), New Deal (economic) |
| Totalitarianism | 230 | Ideology | **Fascism** (government), Total War (military) |
| Class Struggle | 230 | Ideology | **Communism** (government), Five-Year Plan (economic), Collectivization (economic) |

## Atomic era

| Civic | Cost | Needs | Unlocks |
|---|---|---|---|
| Cultural Heritage | 260 | Conservation | Heritage Tourism (wildcard) |
| Cold War | 260 | Ideology | Military Organization (military) |
| Professional Sports | 260 | Ideology | Sports Media (economic) |
| Rapid Deployment | 275 | Cold War | Lightning Warfare (military), Force Modernization (military) |
| Space Race | 275 | Cold War | +10% Science |

## Information era

| Civic | Cost | Needs | Unlocks |
|---|---|---|---|
| Globalization | 310 | Rapid Deployment, Space Race | Ecommerce (economic) |
| Social Media | 310 | Professional Sports, Space Race | Online Communities (wildcard) |
| Environmentalism | 310 | Cultural Heritage | +1 Food in every city |

## Future era

| Civic | Cost | Needs | Unlocks |
|---|---|---|---|
| Near Future Governance | 350 | Globalization, Social Media | — |
| Venture Politics | 380 | Near Future Governance | **Corporate Libertarianism** (government) |
| Distributed Sovereignty | 380 | Near Future Governance | **Digital Democracy** (government) |
| Optimization Imperative | 380 | Near Future Governance | **Synthetic Technocracy** (government) |
| Information Warfare | 410 | Venture Politics | Every unit +3 strength |
| Exodus Imperative | 410 | Optimization Imperative | +15% Science |
| Smart Power Doctrine | 410 | Distributed Sovereignty | +15% Gold |
| Cultural Hegemony | 450 | Smart Power Doctrine, Environmentalism | +25% Culture |

| Future Civic | 800 | Every other civic | Repeatable, +5 score each |

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

## Pacing targets

- Civics move a little behind techs. In AI-vs-AI games on Normal, the leading civilization is in the Medieval civics era at turn 100 (Renaissance for techs), and has about three quarters of each tree by turn 150.
- Policies and governments add a lot of science and production, so the tech costs from the Renaissance on were raised in 1.3 to keep the Epic 250-turn game's science victory near the end: on Normal the leader launches between turns 185 and 245, or doesn't finish in time.

The AI-vs-AI soak test reports each game's tech and civics era at turn 100, and the costs above are tuned against it.
