// Playable civilizations (see docs/civilizations-dictionary.md). Each has a historical leader, a
// color and emblem (so players are never told apart by color alone), real city names, and three
// unique traits:
//   ability: an empire-wide bonus, as `effect` (the same fields as tech effects, core/effects.js)
//   unit:    a unique unit in data/units.js (its `civ` field) that replaces a standard one
//   infra:   a unique building (data/buildings.js), improvement (data/terrain.js) or a renamed,
//            stronger district (`districtNames` here, with its bonus in `effect`)
// `personality` steers the AI: builders favor growth, science and culture; conquerors favor armies.

const civ = (name, leader, color, emblem, personality, ability, cities, extra = {}) => ({ name, leader, color, emblem, personality, ability, cities, ...extra });

export const CIVS = {
  rome: civ('Rome', 'Augustus', '#A3203A', 'laurel', 'conqueror',
    { name: 'Pax Romana', text: 'Every new city starts with a Monument. +1 Production in the capital.', effect: { freeBuildings: ['monument'], capitalYield: { prod: 1 } } },
    ['Roma', 'Antium', 'Cumae', 'Neapolis', 'Ravenna', 'Arretium', 'Mediolanum', 'Ostia', 'Tarentum', 'Brundisium', 'Pompeii', 'Capua', 'Verona', 'Aquileia', 'Ancona'],
    { unit: 'legion', infra: { kind: 'building', key: 'bath' } }),
  egypt: civ('Egypt', 'Hatshepsut', '#D9B23A', 'ankh', 'builder',
    { name: 'Gift of the Nile', text: 'Districts build 25% faster.', effect: { prodBonus: { district: 25 } } },
    ['Thebes', 'Memphis', 'Heliopolis', 'Elephantine', 'Alexandria', 'Pi-Ramesses', 'Giza', 'Abydos', 'Akhetaten', 'Avaris', 'Buto', 'Hierakonpolis', 'Asyut', 'Lisht', 'Tanis'],
    { unit: 'maryannu', infra: { kind: 'improvement', key: 'sphinx' } }),
  greece: civ('Greece', 'Pericles', '#3A9BD9', 'column', 'builder',
    { name: 'Polis', text: 'One extra wildcard policy slot in any government.', effect: { extraSlots: { wildcard: 1 } } },
    ['Athens', 'Sparta', 'Corinth', 'Argos', 'Knossos', 'Mycenae', 'Pharsalos', 'Ephesus', 'Halicarnassus', 'Rhodes', 'Eretria', 'Pergamon', 'Miletos', 'Megara', 'Delphi'],
    { unit: 'hoplite', infra: { kind: 'district', key: 'theater' }, districtNames: { theater: 'Acropolis' }, infraEffect: { districtBonus: { theater: { culture: 1 } } }, infraText: 'Replaces the Theater Square. +1 Culture.' }),
  persia: civ('Persia', 'Cyrus', '#7446B0', 'wingedDisc', 'conqueror',
    { name: 'Satrapies', text: '+1 Gold and +1 Culture in every city.', effect: { cityYield: { gold: 1, culture: 1 } } },
    ['Pasargadae', 'Persepolis', 'Susa', 'Ecbatana', 'Babylon', 'Bactra', 'Sardis', 'Gordium', 'Tarsus', 'Rhagae', 'Merv', 'Arbela', 'Pattala', 'Tyre', 'Ctesiphon'],
    { unit: 'immortal', infra: { kind: 'improvement', key: 'pairidaeza' } }),
  china: civ('China', 'Qin Shi Huang', '#E8702A', 'coin', 'builder',
    { name: 'Mandate of Heaven', text: 'Eurekas and Inspirations give 55% of a tech or civic instead of 40%.', effect: { boostPct: 15 } },
    ["Xi'an", 'Luoyang', 'Nanjing', 'Beijing', 'Hangzhou', 'Kaifeng', 'Chengdu', 'Guangzhou', 'Suzhou', 'Yangzhou', 'Handan', 'Linzi', 'Changsha', 'Datong', 'Wuchang'],
    { unit: 'chukonu', infra: { kind: 'building', key: 'hanlin' } }),
  india: civ('India', 'Ashoka', '#1FA394', 'wheel', 'builder',
    { name: 'Dharma', text: 'Cities grow 20% faster. +1 Food in every city.', effect: { growthPct: 20, cityYield: { food: 1 } } },
    ['Pataliputra', 'Delhi', 'Varanasi', 'Ujjain', 'Taxila', 'Mathura', 'Kanchipuram', 'Agra', 'Madurai', 'Ayodhya', 'Hampi', 'Nalanda', 'Lothal', 'Vaishali', 'Kannauj'],
    { unit: 'varu', infra: { kind: 'improvement', key: 'stepwell' } }),
  japan: civ('Japan', 'Tokugawa Ieyasu', '#E24F8A', 'torii', 'conqueror',
    { name: 'Meiji Restoration', text: 'Districts get +1 from every neighboring district, not every two.', effect: { fullAdjacency: true } },
    ['Kyoto', 'Nara', 'Kamakura', 'Edo', 'Osaka', 'Nagoya', 'Sendai', 'Kanazawa', 'Hiroshima', 'Nagasaki', 'Kagoshima', 'Himeji', 'Fukuoka', 'Kobe', 'Hakodate'],
    { unit: 'samurai', infra: { kind: 'building', key: 'electronics' } }),
  korea: civ('Korea', 'Sejong', '#9DB83A', 'bell', 'builder',
    { name: 'Hangul', text: '+10% Science.', effect: { yieldPct: { science: 10 } } },
    ['Hanyang', 'Gyeongju', 'Kaesong', 'Pyongyang', 'Busan', 'Gongju', 'Buyeo', 'Jeonju', 'Gwangju', 'Daegu', 'Incheon', 'Ulsan', 'Suwon', 'Wonju', 'Andong'],
    { unit: 'hwacha', infra: { kind: 'district', key: 'campus' }, districtNames: { campus: 'Seowon' }, infraEffect: { districtBonus: { campus: { science: 2 } } }, infraText: 'Replaces the Campus. +2 Science.' }),
  mongolia: civ('Mongolia', 'Genghis Khan', '#8A5A2E', 'ger', 'conqueror',
    { name: 'Horde of the Steppe', text: 'Mounted units +1 move and +3 strength.', effect: { classMoves: { mounted: 1 }, classStrength: { mounted: 3 } } },
    ['Karakorum', 'Beshbalik', 'Turfan', 'Hovd', 'Uliastai', 'Samarkand', 'Bukhara', 'Otrar', 'Almaliq', 'Sarai', 'Kashgar', 'Khanbaliq', 'Erdene Zuu', 'Hohhot', 'Avarga'],
    { unit: 'keshig', infra: { kind: 'building', key: 'ordu' } }),
  england: civ('England', 'Elizabeth I', '#5E6A78', 'rose', 'builder',
    { name: 'Workshop of the World', text: 'Industrial Zone buildings +50% yields.', effect: { buildingPct: { industrial: 50 } } },
    ['London', 'York', 'Nottingham', 'Hastings', 'Canterbury', 'Coventry', 'Warwick', 'Oxford', 'Cambridge', 'Bristol', 'Norwich', 'Winchester', 'Lincoln', 'Exeter', 'Chester'],
    { unit: 'redcoat', infra: { kind: 'district', key: 'harbor' }, districtNames: { harbor: 'Royal Navy Dockyard' }, infraEffect: { districtBonus: { harbor: { gold: 2, prod: 1 } } }, infraText: 'Replaces the Harbor. +2 Gold and +1 Production.' }),
  france: civ('France', 'Louis XIV', '#3452B4', 'fleur', 'builder',
    { name: 'Grand Tour', text: '+50% Tourism and +10% Culture.', effect: { tourismPct: 50, yieldPct: { culture: 10 } } },
    ['Paris', 'Orléans', 'Lyon', 'Troyes', 'Tours', 'Marseille', 'Chartres', 'Avignon', 'Rouen', 'Grenoble', 'Dijon', 'Amiens', 'Reims', 'Bordeaux', 'Toulouse'],
    { unit: 'garde', infra: { kind: 'improvement', key: 'chateau' } }),
  aztec: civ('Aztec', 'Moctezuma I', '#3F9442', 'pyramid', 'conqueror',
    { name: 'Flower War', text: 'Destroying an enemy unit gives Culture toward civics equal to half its strength.', effect: { killCulture: 50 } },
    ['Tenochtitlan', 'Texcoco', 'Tlatelolco', 'Tlacopan', 'Xochimilco', 'Coyoacan', 'Chalco', 'Culhuacan', 'Iztapalapa', 'Tepeyac', 'Cholula', 'Tula', 'Azcapotzalco', 'Malinalco', 'Tlaxcala'],
    { unit: 'eagle', infra: { kind: 'building', key: 'tlachtli' } }),
};

export const CIV_KEYS = Object.keys(CIVS);

// Saves from before version 4 stored the civilization as an index into the old four civs.
export const LEGACY_CIVS = ['rome', 'greece', 'aztec', 'persia'];

// A district's name for a civilization (unique districts are renamed standard ones).
export const districtNameFor = (civKey, key, fallback) => CIVS[civKey]?.districtNames?.[key] || fallback;
