# Hexhold tech dictionary

This is the design reference for Hexhold's technology tree. It is written before the code, and `src/data/` implements it.

**Coverage.** Every technology in Civilization VI is covered, including the Gathering Storm expansion:
- the 67 base-game techs
- Buttress and Refining
- the 7 Future-era techs

That's **76 techs in 9 eras**, plus a repeatable **Future Tech**.

**What's ours.** The tech names are ordinary historical terms. Everything else is Hexhold's own design and is tuned for Hexhold's shorter games (60–250 turns instead of about 500):
- science costs
- prerequisites
- what each tech unlocks
- all descriptions

**Reading the tables**

| Column | Meaning |
|---|---|
| **Cost** | Science needed |
| **Needs** | Techs that must be researched first. Picking a locked tech in the game queues these automatically. |
| **Unlocks** | What becomes available: units, buildings, districts, improvements, or a permanent bonus for your whole civilization |

## Eras at a glance

| Era | Techs | Cost per tech | Theme |
|---|---|---|---|
| Ancient | 11 | 22–32 | Settling, first farms and mines, bronze weapons |
| Classical | 8 | 55–70 | Money, cavalry, iron, sea trade, public works |
| Medieval | 8 | 95–115 | Workshops, universities, knights, castles |
| Renaissance | 9 | 150–175 | Banking, gunpowder, printing, star forts |
| Industrial | 8 | 220–250 | Factories, rifles, science as a discipline, steam |
| Modern | 8 | 330–360 | Electricity, steel, tanks, research labs |
| Atomic | 8 | 440–480 | Computers, rockets, combined arms |
| Information | 9 | 560–620 | Satellites, composites, robotics |
| Future | 7 | 740–960 | The last techs. **Offworld Mission wins the game.** |

A player's **era** is the latest era in which they have researched at least one tech. It shows in the top bar and in Diplomacy.

---

## Ancient era

| Tech | Cost | Needs | Unlocks |
|---|---|---|---|
| Pottery | 22 | — | **Granary** (+2 Food) |
| Animal Husbandry | 22 | — | Wheat and Deer tiles +1 Food |
| Mining | 22 | — | **Mine** improvement (+1 Production on hills) |
| Sailing | 32 | — | Fish tiles +1 Food |
| Astrology | 32 | — | **Shrine** (+2 Culture) |
| Irrigation | 32 | Pottery | Farms +1 Food |
| Archery | 32 | Animal Husbandry | **Archer** |
| Writing | 32 | Pottery | **Campus** district, **Library** |
| Masonry | 32 | Mining | **Walls** |
| Bronze Working | 32 | Mining | **Spearman**, **Encampment** district, **Barracks** |
| The Wheel | 32 | Mining | **Water Mill** (+1 Food, +1 Production) |

## Classical era

| Tech | Cost | Needs | Unlocks |
|---|---|---|---|
| Celestial Navigation | 55 | Sailing, Astrology | **Harbor** district, **Lighthouse** |
| Currency | 55 | Writing | **Commercial Hub** district, **Market** |
| Horseback Riding | 55 | Animal Husbandry | **Horseman** |
| Iron Working | 55 | Bronze Working | **Swordsman** |
| Shipbuilding | 70 | Sailing | **Shipyard** (in a Harbor) |
| Mathematics | 70 | Currency | **Catapult** |
| Construction | 70 | Masonry, Horseback Riding | **Theater Square** district, **Amphitheater**. Builders +1 use. |
| Engineering | 70 | The Wheel | **Aqueduct** (+2 Food). Walls +50 HP. |

## Medieval era

| Tech | Cost | Needs | Unlocks |
|---|---|---|---|
| Military Tactics | 95 | Mathematics | **Pikeman** |
| Apprenticeship | 95 | Currency, Horseback Riding | **Industrial Zone** district, **Workshop**, **Man-at-Arms** |
| Stirrups | 95 | Horseback Riding | **Knight** |
| Machinery | 95 | Iron Working, Engineering | **Crossbowman**, **Lumber Mill** improvement (+2 Production on forest) |
| Buttress | 95 | Shipbuilding, Mathematics | +1 Production in every city |
| Education | 115 | Mathematics, Apprenticeship | **University** |
| Military Engineering | 115 | Construction | **Trebuchet**, **Armory** |
| Castles | 115 | Construction | **Castle** (needs Walls) |

## Renaissance era

| Tech | Cost | Needs | Unlocks |
|---|---|---|---|
| Cartography | 150 | Shipbuilding | +1 sight for every unit |
| Mass Production | 150 | Shipbuilding, Education | Mines and Lumber Mills +1 Production |
| Banking | 150 | Stirrups, Education | **Bank** |
| Gunpowder | 150 | Apprenticeship, Stirrups, Military Engineering | **Musketman** |
| Printing | 150 | Machinery | **Art Museum**, +10% Culture |
| Square Rigging | 175 | Cartography | Coast tiles +1 Gold |
| Astronomy | 175 | Education | **Observatory** |
| Metal Casting | 175 | Gunpowder | **Bombard** |
| Siege Tactics | 175 | Castles | **Star Fort** (needs Castle) |

## Industrial era

| Tech | Cost | Needs | Unlocks |
|---|---|---|---|
| Industrialization | 220 | Mass Production | **Factory** |
| Scientific Theory | 220 | Astronomy | +15% Science |
| Ballistics | 220 | Metal Casting | **Field Cannon** |
| Military Science | 220 | Printing, Siege Tactics | **Cavalry**, **Military Academy** |
| Steam Power | 250 | Square Rigging, Industrialization | +1 move for every unit |
| Sanitation | 250 | Scientific Theory | **Sewer** (+3 Food) |
| Economics | 250 | Banking, Scientific Theory | **Stock Exchange** |
| Rifling | 250 | Ballistics, Military Science | **Line Infantry**, **Ranger** |

## Modern era

| Tech | Cost | Needs | Unlocks |
|---|---|---|---|
| Flight | 330 | Industrialization, Scientific Theory | +1 sight for every unit |
| Replaceable Parts | 330 | Economics | **Infantry** |
| Steel | 330 | Ballistics | **Artillery**. Cities +10 strength. |
| Electricity | 360 | Steam Power | **Power Plant** |
| Radio | 360 | Steam Power, Flight | **Broadcast Center** |
| Chemistry | 360 | Sanitation | **Research Lab**, **Anti-Tank Crew** |
| Combustion | 360 | Rifling, Steel | **Tank** |
| Refining | 360 | Rifling | Factories +2 Production |

## Atomic era

| Tech | Cost | Needs | Unlocks |
|---|---|---|---|
| Advanced Flight | 440 | Radio | Units heal +10 HP per turn |
| Rocketry | 440 | Radio, Chemistry | +10% Science |
| Advanced Ballistics | 440 | Replaceable Parts, Steel | **Machine Gun** |
| Combined Arms | 440 | Steel, Combustion | Melee units +5 strength |
| Plastics | 440 | Combustion | Coast tiles +1 Production |
| Computers | 480 | Electricity, Radio | +10% Science and Culture |
| Nuclear Fission | 480 | Advanced Ballistics, Combined Arms | +15% Production |
| Synthetic Materials | 480 | Plastics | +2 Food in every city |

## Information era

| Tech | Cost | Needs | Unlocks |
|---|---|---|---|
| Telecommunications | 560 | Computers | +15% Gold |
| Satellites | 560 | Advanced Flight, Rocketry | Reveals the whole map. **Mechanized Infantry**. |
| Guidance Systems | 560 | Rocketry, Advanced Ballistics | **Rocket Artillery** |
| Lasers | 560 | Nuclear Fission | Ranged and siege units +10 ranged strength |
| Composites | 560 | Synthetic Materials | **Modern Armor**, **Modern Anti-Tank** |
| Stealth Technology | 560 | Synthetic Materials | Every unit +5 defense |
| Robotics | 620 | Computers | +15% Production |
| Nanotechnology | 620 | Composites | Campus districts +3 Science |
| Nuclear Fusion | 620 | Lasers | +3 Production in every city |

## Future era

| Tech | Cost | Needs | Unlocks |
|---|---|---|---|
| Seasteads | 740 | Nanotechnology | Coast tiles +2 Food |
| Advanced AI | 740 | Robotics | +20% Science |
| Advanced Power Cells | 740 | Nuclear Fusion | +1 move for every unit |
| Cybernetics | 740 | Robotics | Every unit +5 strength |
| Smart Materials | 740 | Nanotechnology | +3 Production in every city |
| Predictive Systems | 740 | Telecommunications | +20% Gold |
| **Offworld Mission** | 960 | Advanced AI, Advanced Power Cells, Smart Materials, Satellites | **Science victory:** the first civilization to research it wins |
| Future Tech | 1000 | Everything else | Repeatable, +5 score each. Only reachable when you keep playing after a victory. |

---

## Unit lines

When you research the tech for the next unit in a line, the older unit can no longer be built. Existing units can be **upgraded** for gold while they stand inside your borders:
- The cost is twice the difference in production cost, with a minimum of 10 gold.
- Upgrading uses the unit's turn.
- The unit keeps its health and any training bonus.

| Line | Units (strength, ranged strength / range, moves) |
|---|---|
| Melee | Warrior 20 → Swordsman 35 → Man-at-Arms 45 → Musketman 55 → Line Infantry 65 → Infantry 70 → Mechanized Infantry 85 |
| Anti-cavalry (+10 against mounted units) | Spearman 25 → Pikeman 41 → Anti-Tank Crew 70 → Modern Anti-Tank 80 |
| Ranged | Archer 15 (25/2) → Crossbowman 30 (40/2) → Field Cannon 50 (60/2) → Machine Gun 65 (75/2) |
| Mounted | Horseman 36, 4 moves → Knight 48, 4 → Cavalry 62, 5 → Tank 80, 4 → Modern Armor 90, 5 |
| Siege (+10 against cities) | Catapult 23 (35/2) → Trebuchet 30 (45/2) → Bombard 43 (55/2) → Artillery 60 (70/2) → Rocket Artillery 70 (85/3) |
| Recon | Scout 10, 3 moves → Ranger 45, 3 moves |
| Civilian | Settler, Builder (never obsolete) |

Production costs rise with each era: 20–40 in the Ancient era up to about 250 in the Information era.

**City defense keeps pace.** A city's base strength is the higher of these two:
- 15 + 2 × population
- (the strongest melee unit its owner can build) − 10 + population

Defensive buildings stack on top.

## Buildings

| Building | Cost | Needs tech | Where | Effect |
|---|---|---|---|---|
| Monument | 30 | — | City center | +2 Culture |
| Granary | 40 | Pottery | City center | +2 Food |
| Shrine | 40 | Astrology | City center | +2 Culture |
| Water Mill | 50 | The Wheel | City center | +1 Food, +1 Production |
| Walls | 60 | Masonry | City center | +100 HP, +10 strength, ranged strike |
| Aqueduct | 70 | Engineering | City center | +2 Food |
| Castle | 100 | Castles | City center, after Walls | +100 HP, +10 strength |
| Star Fort | 140 | Siege Tactics | City center, after Castle | +100 HP, +10 strength |
| Sewer | 160 | Sanitation | City center | +3 Food |
| Library | 50 | Writing | Campus | +2 Science |
| University | 100 | Education | Campus | +4 Science |
| Observatory | 130 | Astronomy | Campus | +3 Science |
| Research Lab | 220 | Chemistry | Campus | +5 Science |
| Market | 50 | Currency | Commercial Hub | +3 Gold |
| Bank | 120 | Banking | Commercial Hub | +4 Gold |
| Stock Exchange | 190 | Economics | Commercial Hub | +6 Gold |
| Barracks | 50 | Bronze Working | Encampment | New units +5 strength |
| Armory | 100 | Military Engineering | Encampment | New units +5 more strength |
| Military Academy | 180 | Military Science | Encampment | New units +5 more strength |
| Workshop | 80 | Apprenticeship | Industrial Zone | +2 Production |
| Factory | 170 | Industrialization | Industrial Zone | +4 Production |
| Power Plant | 230 | Electricity | Industrial Zone | +5 Production |
| Amphitheater | 80 | Construction | Theater Square | +2 Culture |
| Art Museum | 140 | Printing | Theater Square | +3 Culture |
| Broadcast Center | 220 | Radio | Theater Square | +4 Culture |
| Lighthouse | 60 | Celestial Navigation | Harbor | +2 Food |
| Shipyard | 90 | Shipbuilding | Harbor | +3 Production |

## Districts

A city holds one district per 3 population, rounded up. Every district's yield starts at +1 before adjacency bonuses.

| District | Tech | Yield | Adjacency bonus | Placement |
|---|---|---|---|---|
| Campus | Writing | Science | +1 per mountain, +1 per 2 districts | Land |
| Commercial Hub | Currency | Gold | +2 next to coast, +1 per 2 districts | Land |
| Encampment | Bronze Working | — | Military units build 25% faster | Land, not next to the city center |
| Industrial Zone | Apprenticeship | Production | +1 per adjacent mine, +1 per 2 districts | Land |
| Theater Square | Construction | Culture | +1 per 2 districts | Land |
| Harbor | Celestial Navigation | Gold | +2 next to the city center, +1 per adjacent Fish, +1 per 2 districts | **Coast tile** next to land |

The city center counts as a district for adjacency.

## Effect glossary

These are the kinds of bonus a tech can grant. They're data fields in `src/data/techs.js`, and they add together across every tech you've researched.

| Effect | Meaning |
|---|---|
| Resource bonus | Tiles with a given resource yield more |
| Improvement bonus | Farms, mines or lumber mills yield more |
| Terrain bonus | Coast tiles yield more |
| City yield | A flat bonus in every city |
| District bonus | Every district of a type yields more |
| Building bonus | Every building of a type yields more |
| Yield % | A percentage bonus to a yield in every city, applied after the flat bonuses |
| Builder uses | New builders get extra uses |
| Walls HP / city strength | Stronger cities |
| Moves / sight | Every unit moves or sees farther |
| Healing | Units heal more each turn |
| Unit strength | Melee strength, ranged strength or defense for every unit |
| Reveal map | Your whole map becomes explored |
| Victory | Researching the tech wins the game |

## Pacing targets

- A **100-turn** game reaches the Renaissance or Industrial era.
- A **250-turn** game can reach the Future era, and a strong civilization can launch the Offworld Mission.

The AI-vs-AI soak test checks these targets, and the costs above are tuned against it.
