# Hexhold victories and history

The design reference for how a game of Hexhold is won, how tourism works, and what goes into each civilization's history. The code is in `src/core/victory.js`, `src/core/tourism.js` and `src/core/history.js`, and the numbers in `src/data/rules.js`.

## Ways to win

The first of these to happen ends the game.

| Victory | How |
|---|---|
| Domination | Hold every original capital, or be the last civilization standing |
| Science | Be first to research Offworld Mission, the last tech of the Future era |
| Culture | Draw more visiting tourists from every other civilization than it has tourists at home |
| Score | Have the highest score when the turn limit ends |

You lose if you lose all your cities and settlers. The winner can keep playing after any victory.

## Culture victory

**Domestic tourists.** Every civilization has 1 domestic tourist for each 100 culture it has ever produced.

**Tourism** builds up every turn toward each civilization you have met. Every 200 tourism toward a civilization draws 1 visitor from it.

**Winning.** When your visitors from every living civilization outnumber that civilization's domestic tourists, you win. The History screen (R) shows where you stand against each one.

**Where tourism comes from:**
- 1 per turn for each Theater Square building (Amphitheater, Art Museum, Broadcast Center)
- 20% of all your culture, once you complete the **Humanism** civic

**What multiplies it:**

| Source | Tourism |
|---|---|
| Flight, Radio, Computers (techs) | +25% each |
| Cultural Heritage (civic) | +50% |
| Social Media (civic) | +25% |
| Heritage Tourism (wildcard card) | +50% |
| Online Communities (wildcard card) | +75% |
| France's Grand Tour | +50% |

Most multipliers arrive late, so culture victories come late too. Against a rival with strong culture of its own, a culture victory needs about twice that rival's lifetime culture, plus the late multipliers.

You're told when your culture comes to dominate another civilization's, when a rival's culture dominates yours, and when a rival dominates all but one civilization.

## Eurekas and Inspirations

Almost every tech has a **Eureka** goal and almost every civic an **Inspiration** goal. The goals are listed in the two dictionaries and on each card in the trees, with progress.

- Meeting a goal gives 40% of that tech's or civic's cost at once, whether or not you're researching it. China's Mandate of Heaven makes it 55%.
- Goals are checked after every action and at the end of every round.
- Goals count your whole empire. Examples: cities founded, buildings and districts built, units trained, enemies destroyed, civilizations met, the government you run, how much of the map you have explored, and your tourism.

## History

Every civilization's **historic moments** are recorded on the History screen's Timeline. Each moment is worth points of the Historic moments score, 1 score per point. The table is Hexhold's own design.

| Moment | Points | World first |
|---|---|---|
| Founding a city (the first is the capital) | 1 | — |
| Meeting a civilization | 1 | — |
| Your first district of each kind | 1 | 3 for the first in the world |
| Entering a new era (techs) | 1 | 3 for the first civilization in the world |
| Adopting a government | 1 the first time for each tier, then 0 | 2 for the first civilization to reach a tier |
| A city growing to 10 or 20 | 1 | 3 for the first city in the world |
| Training the first of your unique unit | 1 | — |
| Making peace | 1 | — |
| Capturing a city | 2, or 4 for an original capital | — |
| Your culture coming to dominate another civilization's | 2 | — |
| Declaring war, being declared on, losing a city, a civilization falling, winning | 0 (recorded only) | — |

The Timeline shows your own history, or the history of every civilization you have met. At the end of the game you can see everyone's.
