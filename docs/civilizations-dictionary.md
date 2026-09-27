# Hexhold civilizations dictionary

The design reference for Hexhold's 12 playable civilizations. `src/data/civs.js` implements it, with unique units in `units.js`, unique buildings in `buildings.js` and unique improvements in `terrain.js`. `node tools/docs.mjs` regenerates this page.

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
| Rome | Augustus | Pax Romana | Legion | Bath | Conqueror |
| Egypt | Hatshepsut | Gift of the Nile | Maryannu Chariot Archer | Sphinx | Builder |
| Greece | Pericles | Polis | Hoplite | Acropolis | Builder |
| Persia | Cyrus | Satrapies | Immortal | Pairidaeza | Conqueror |
| China | Qin Shi Huang | Mandate of Heaven | Chu-Ko-Nu | Hanlin Academy | Builder |
| India | Ashoka | Dharma | Varu | Stepwell | Builder |
| Japan | Tokugawa Ieyasu | Meiji Restoration | Samurai | Electronics Factory | Conqueror |
| Korea | Sejong | Hangul | Hwacha | Seowon | Builder |
| Mongolia | Genghis Khan | Horde of the Steppe | Keshig | Ordu | Conqueror |
| England | Elizabeth I | Workshop of the World | Redcoat | Royal Navy Dockyard | Builder |
| France | Louis XIV | Grand Tour | Garde Impériale | Château | Builder |
| Aztec | Moctezuma I | Flower War | Eagle Warrior | Tlachtli | Conqueror |

## Rome

Led by **Augustus**. Color #A3203A, emblem: laurel wreath.

- **Pax Romana:** Every new city starts with a Monument. +1 Production in the capital.
- **Legion** (replaces the Swordsman): Roman heavy infantry. Strength 40 (Swordsman 35). Cost 65 (Swordsman 60).
- **Bath** (building, replaces the Aqueduct): +3 Food, +1 Culture. Cost 70.
- **Cities:** Roma, Antium, Cumae, Neapolis, Ravenna, Arretium, Mediolanum, Ostia, Tarentum, Brundisium, Pompeii, Capua, Verona, Aquileia, Ancona

## Egypt

Led by **Hatshepsut**. Color #D9B23A, emblem: ankh.

- **Gift of the Nile:** Districts build 25% faster.
- **Maryannu Chariot Archer** (replaces the Archer): Fast chariot archers. Strength 18 (Archer 15). Ranged strength 28 (Archer 25). Moves 4 (Archer 2). Cost 45 (Archer 35). Mounted.
- **Sphinx** (improvement, from Craftsmanship): +1 Production, +1 Culture. Flat land without forest.
- **Cities:** Thebes, Memphis, Heliopolis, Elephantine, Alexandria, Pi-Ramesses, Giza, Abydos, Akhetaten, Avaris, Buto, Hierakonpolis, Asyut, Lisht, Tanis

## Greece

Led by **Pericles**. Color #3A9BD9, emblem: Ionic column.

- **Polis:** One extra wildcard policy slot in any government.
- **Hoplite** (replaces the Spearman): Greek citizen spearmen. +10 against mounted units. Strength 30 (Spearman 25). Cost 35 (Spearman 30).
- **Acropolis** (district, replaces the Theater Square): Replaces the Theater Square. +1 Culture.
- **Cities:** Athens, Sparta, Corinth, Argos, Knossos, Mycenae, Pharsalos, Ephesus, Halicarnassus, Rhodes, Eretria, Pergamon, Miletos, Megara, Delphi

## Persia

Led by **Cyrus**. Color #7446B0, emblem: winged disc.

- **Satrapies:** +1 Gold and +1 Culture in every city.
- **Immortal** (replaces the Swordsman): The Persian royal guard. +5 strength when defending. Strength 36 (Swordsman 35). +5 when defending.
- **Pairidaeza** (improvement, from Political Philosophy): +2 Gold, +1 Culture. Flat land without forest.
- **Cities:** Pasargadae, Persepolis, Susa, Ecbatana, Babylon, Bactra, Sardis, Gordium, Tarsus, Rhagae, Merv, Arbela, Pattala, Tyre, Ctesiphon

## China

Led by **Qin Shi Huang**. Color #E8702A, emblem: round coin.

- **Mandate of Heaven:** Eurekas and Inspirations give 55% of a tech or civic instead of 40%.
- **Chu-Ko-Nu** (replaces the Crossbowman): Repeating crossbows. Ranged strength 45 (Crossbowman 40). Cost 85 (Crossbowman 80).
- **Hanlin Academy** (building, replaces the Library): +3 Science, +1 Culture. Cost 50.
- **Cities:** Xi'an, Luoyang, Nanjing, Beijing, Hangzhou, Kaifeng, Chengdu, Guangzhou, Suzhou, Yangzhou, Handan, Linzi, Changsha, Datong, Wuchang

## India

Led by **Ashoka**. Color #1FA394, emblem: twelve-spoked wheel.

- **Dharma:** Cities grow 20% faster. +1 Food in every city.
- **Varu** (replaces the Knight): War elephants: slower than the Knight, but stronger. Strength 54 (Knight 48). Moves 3 (Knight 4). Cost 90 (Knight 85).
- **Stepwell** (improvement, from Irrigation): +2 Food, +1 Culture. Flat land without forest.
- **Cities:** Pataliputra, Delhi, Varanasi, Ujjain, Taxila, Mathura, Kanchipuram, Agra, Madurai, Ayodhya, Hampi, Nalanda, Lothal, Vaishali, Kannauj

## Japan

Led by **Tokugawa Ieyasu**. Color #E24F8A, emblem: torii gate.

- **Meiji Restoration:** Districts get +1 from every neighboring district, not every two.
- **Samurai** (replaces the Man-at-Arms): Fights at full strength even when wounded. Strength 48 (Man-at-Arms 45). No penalty when wounded.
- **Electronics Factory** (building, replaces the Factory): +4 Production, +3 Culture. Cost 170.
- **Cities:** Kyoto, Nara, Kamakura, Edo, Osaka, Nagoya, Sendai, Kanazawa, Hiroshima, Nagasaki, Kagoshima, Himeji, Fukuoka, Kobe, Hakodate

## Korea

Led by **Sejong**. Color #9DB83A, emblem: temple bell.

- **Hangul:** +10% Science.
- **Hwacha** (replaces the Field Cannon): Korean rocket carts. Strength 45 (Field Cannon 50). Ranged strength 67 (Field Cannon 60).
- **Seowon** (district, replaces the Campus): Replaces the Campus. +2 Science.
- **Cities:** Hanyang, Gyeongju, Kaesong, Pyongyang, Busan, Gongju, Buyeo, Jeonju, Gwangju, Daegu, Incheon, Ulsan, Suwon, Wonju, Andong

## Mongolia

Led by **Genghis Khan**. Color #8A5A2E, emblem: ger (felt tent).

- **Horde of the Steppe:** Mounted units +1 move and +3 strength.
- **Keshig** (replaces the Crossbowman): Mounted archers of the imperial guard. Moves 4 (Crossbowman 2). Mounted.
- **Ordu** (building, replaces the Barracks): New military units +8 strength. Cost 45.
- **Cities:** Karakorum, Beshbalik, Turfan, Hovd, Uliastai, Samarkand, Bukhara, Otrar, Almaliq, Sarai, Kashgar, Khanbaliq, Erdene Zuu, Hohhot, Avarga

## England

Led by **Elizabeth I**. Color #5E6A78, emblem: five-petal rose.

- **Workshop of the World:** Industrial Zone buildings +50% yields.
- **Redcoat** (replaces the Line Infantry): Disciplined line infantry. Strength 69 (Line Infantry 65).
- **Royal Navy Dockyard** (district, replaces the Harbor): Replaces the Harbor. +2 Gold and +1 Production.
- **Cities:** London, York, Nottingham, Hastings, Canterbury, Coventry, Warwick, Oxford, Cambridge, Bristol, Norwich, Winchester, Lincoln, Exeter, Chester

## France

Led by **Louis XIV**. Color #3452B4, emblem: fleur-de-lis.

- **Grand Tour:** +50% Tourism and +10% Culture.
- **Garde Impériale** (replaces the Line Infantry): The imperial guard. +5 strength when defending. Strength 67 (Line Infantry 65). +5 when defending.
- **Château** (improvement, from Humanism): +1 Gold, +2 Culture. Flat land without forest.
- **Cities:** Paris, Orléans, Lyon, Troyes, Tours, Marseille, Chartres, Avignon, Rouen, Grenoble, Dijon, Amiens, Reims, Bordeaux, Toulouse

## Aztec

Led by **Moctezuma I**. Color #3F9442, emblem: stepped temple pyramid.

- **Flower War:** Destroying an enemy unit gives Culture toward civics equal to half its strength.
- **Eagle Warrior** (replaces the Warrior): Elite Aztec warriors. Strength 28 (Warrior 20). Cost 25 (Warrior 20).
- **Tlachtli** (building, replaces the Monument): +2 Culture, +2 Gold. Cost 35.
- **Cities:** Tenochtitlan, Texcoco, Tlatelolco, Tlacopan, Xochimilco, Coyoacan, Chalco, Culhuacan, Iztapalapa, Tepeyac, Cholula, Tula, Azcapotzalco, Malinalco, Tlaxcala

