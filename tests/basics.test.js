import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng, rand, seedFromText } from '../src/core/rng.js';
import { neighbors, distance, within, toPixel, fromPixel, neighbor } from '../src/core/hex.js';
import { generateMap } from '../src/core/mapgen.js';
import { createGame, serialize, deserialize } from '../src/core/state.js';
import { passable } from '../src/core/pathfind.js';
import { flatMap } from './helpers.js';

test('the same seed gives the same random sequence', () => {
  const a = makeRng(99);
  const b = makeRng(99);
  for (let i = 0; i < 50; i++) assert.equal(a(), b());
  const s1 = { rng: 7 };
  const s2 = { rng: 7 };
  for (let i = 0; i < 50; i++) assert.equal(rand(s1), rand(s2));
  assert.equal(seedFromText('42'), 42);
  assert.equal(seedFromText('banana'), seedFromText(' banana '));
});

test('hex neighbors are symmetric and one step away', () => {
  const map = flatMap(12, 9);
  for (let i = 0; i < map.tiles.length; i++) {
    for (const n of neighbors(map, i)) {
      assert.equal(distance(map, i, n), 1);
      assert.ok(neighbors(map, n).includes(i), `${n} should list ${i} as a neighbor`);
    }
  }
  const center = 4 * 12 + 6;
  assert.equal(neighbors(map, center).length, 6);
  assert.equal(within(map, center, 1).length, 7);
  assert.equal(within(map, center, 2).length, 19);
  // Opposite directions undo each other.
  for (let d = 0; d < 6; d++) assert.equal(neighbor(map, neighbor(map, center, d), (d + 3) % 6), center);
});

test('pixel conversion finds the tile under its own center', () => {
  const map = flatMap(10, 8);
  for (let i = 0; i < map.tiles.length; i++) {
    const [x, y] = toPixel(map, i, 30);
    assert.equal(fromPixel(map, x, y, 30), i);
    assert.equal(fromPixel(map, x + 8, y - 6, 30), i);
  }
  assert.equal(fromPixel(map, -500, -500, 30), -1);
});

test('map generation is deterministic and gives spaced, reachable starts', () => {
  const a = generateMap(1234, 36, 22, 4);
  const b = generateMap(1234, 36, 22, 4);
  assert.deepEqual(a.starts, b.starts);
  assert.equal(JSON.stringify(a.map), JSON.stringify(b.map));
  assert.equal(a.starts.length, 4);
  for (let i = 0; i < a.starts.length; i++) {
    assert.ok(passable(a.map.tiles[a.starts[i]]));
    for (let j = i + 1; j < a.starts.length; j++) assert.ok(distance(a.map, a.starts[i], a.starts[j]) >= 5);
  }
  // Every start must be reachable from every other over land.
  const seen = new Set([a.starts[0]]);
  const stack = [a.starts[0]];
  while (stack.length) {
    for (const n of neighbors(a.map, stack.pop())) {
      if (!seen.has(n) && passable(a.map.tiles[n])) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  for (const s of a.starts) assert.ok(seen.has(s), 'start should be on the shared continent');
});

test('many seeds all generate playable maps', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const { starts } = generateMap(seed * 101, 28, 18, 4);
    assert.equal(starts.length, 4);
  }
});

test('a game survives a save and load unchanged', () => {
  const s = createGame({ seed: 77, size: 'small', rivals: 3 });
  const text = serialize(s);
  const back = deserialize(text);
  assert.equal(serialize(back), text);
  assert.ok(!text.includes('"_'), 'caches must not be saved');
});

test('loading rejects files that are not saves', () => {
  assert.throws(() => deserialize('hello'), /isn't a Hexhold save/);
  assert.throws(() => deserialize('{"version":99,"map":{},"players":[]}'), /newer version/);
});

test('a new game gives everyone a settler, a warrior and a scout', () => {
  const s = createGame({ seed: 5, rivals: 2 });
  for (const p of s.players) {
    const types = Object.values(s.units).filter((u) => u.owner === p.id).map((u) => u.type).sort();
    assert.deepEqual(types, ['scout', 'settler', 'warrior']);
  }
  assert.equal(s.players.filter((p) => p.human).length, 1);
});
