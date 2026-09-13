import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { canonicalJson, checksum } from './integrity';
import { defaultUserData } from './userData';
import { UserDataStore } from './userDataStore';
import {
  STORAGE_KEY,
  LEGACY_KEYS,
  decodeDocument,
  loadUserData,
  readSnapshot,
  saveUserData,
  type WithLock,
} from './storage';

class MemoryStorage {
  values = new Map<string, string>();
  failRead = false;
  failWrite = false;
  dropWrite = false;
  corruptWrite = false;
  writes = 0;
  getItem(key: string) {
    if (this.failRead) throw new DOMException('Denied', 'SecurityError');
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failWrite) throw new DOMException('Full', 'QuotaExceededError');
    this.writes++;
    if (!this.dropWrite)
      this.values.set(key, this.corruptWrite ? value.slice(0, -1) : value);
  }
}
function serialLock(): WithLock {
  let queue = Promise.resolve();
  return (work) => {
    const result = queue.then(work);
    queue = result.then(
      () => {},
      () => {},
    );
    return result;
  };
}
async function open(storage: MemoryStorage, lock = serialLock()) {
  return new UserDataStore(
    storage,
    lock,
    'en',
    await loadUserData(storage, 'en'),
  );
}

test('canonical SHA-256 is deterministic across key order and detects content changes', async () => {
  const value = { z: [2, 1], a: '课程\n"' };
  const canonical = '{"a":"课程\\n\\\"","z":[2,1]}';
  assert.equal(canonicalJson(value), canonical);
  assert.equal(
    (await checksum(value)).value,
    createHash('sha256').update(canonical, 'utf8').digest('hex'),
  );
  assert.deepEqual(
    await checksum(value),
    await checksum({ a: value.a, z: value.z }),
  );
  assert.notDeepEqual(
    await checksum(value),
    await checksum({ ...value, z: [1, 2] }),
  );
  assert.throws(() => canonicalJson({ value: undefined }));
});

test('legacy schedule and all preferences migrate together without deleting originals', async () => {
  const storage = new MemoryStorage();
  const data = defaultUserData('en');
  storage.setItem(LEGACY_KEYS[0], JSON.stringify(data.schedule));
  storage.setItem(LEGACY_KEYS[1], 'zh-TW');
  storage.setItem(LEGACY_KEYS[2], 'dark');
  storage.setItem(LEGACY_KEYS[3], '{"showRemarks":true,"showWeekend":false}');
  const original = readSnapshot(storage);
  const store = await open(storage);
  assert.equal(storage.getItem(STORAGE_KEY), null);
  assert.equal(store.getSnapshot().status, 'local');
  assert.equal(store.getSnapshot().data.preferences.locale, 'zh-Hant');
  await store.update((current) => ({
    ...current,
    preferences: { ...current.preferences, theme: 'light' },
  }));
  assert.equal(store.getSnapshot().status, 'saved');
  const document = await decodeDocument(storage.getItem(STORAGE_KEY)!);
  assert.deepEqual(document.data.schedule, data.schedule);
  assert.deepEqual(document.data.preferences, {
    locale: 'zh-Hant',
    theme: 'light',
    display: { showRemarks: true, showWeekend: false },
  });
  for (const key of LEGACY_KEYS)
    assert.equal(storage.getItem(key), original[key]);
  // An old tab cannot overwrite the migrated snapshot through its old keys.
  storage.setItem(LEGACY_KEYS[2], 'system');
  await store.checkExternal();
  assert.equal(store.getSnapshot().status, 'saved');
});

test('quota failures retain all edits and retry only reports saved after verification', async () => {
  const storage = new MemoryStorage();
  const store = await open(storage);
  storage.failWrite = true;
  const states: string[] = [];
  store.subscribe(() => states.push(store.getSnapshot().status));
  await store.update((data) => ({
    ...data,
    preferences: { ...data.preferences, theme: 'dark' },
  }));
  assert.equal(store.getSnapshot().status, 'failed');
  assert.equal(store.getSnapshot().dirty, true);
  assert.equal(store.getSnapshot().data.preferences.theme, 'dark');
  assert.equal(states.includes('saved'), false);
  storage.failWrite = false;
  await store.retry();
  assert.equal(store.getSnapshot().status, 'saved');
  assert.equal(store.getSnapshot().dirty, false);
  assert.equal(
    (await decodeDocument(storage.getItem(STORAGE_KEY)!)).data.preferences
      .theme,
    'dark',
  );
});

test('silent dropped and corrupted writes never report saved', async () => {
  for (const failure of ['dropWrite', 'corruptWrite'] as const) {
    const storage = new MemoryStorage();
    const store = await open(storage);
    storage[failure] = true;
    await store.update((data) => data);
    assert.equal(store.getSnapshot().status, 'failed');
    assert.equal(store.getSnapshot().dirty, true);
  }
});

test('denied storage opens safely and preserves edits until access returns', async () => {
  const storage = new MemoryStorage();
  storage.failRead = true;
  const store = await open(storage);
  assert.equal(store.getSnapshot().status, 'unavailable');
  assert.equal(store.getSnapshot().canExport, false);
  await store.update((data) => ({
    ...data,
    preferences: { ...data.preferences, theme: 'dark' },
  }));
  assert.equal(store.getSnapshot().canExport, true);
  storage.failRead = false;
  await store.retry();
  assert.equal(store.getSnapshot().status, 'saved');
});

test('recovered storage access cannot overwrite data that was previously unreadable', async () => {
  const storage = new MemoryStorage();
  storage.setItem(
    LEGACY_KEYS[0],
    JSON.stringify(defaultUserData('en').schedule),
  );
  storage.failRead = true;
  const store = await open(storage);
  await store.update((data) => data);
  storage.failRead = false;
  await store.retry();
  assert.equal(store.getSnapshot().status, 'conflict');
  assert.equal(storage.getItem(STORAGE_KEY), null);
});

test('malformed, tampered, and future saved data are preserved and block autosave', async () => {
  const source = new MemoryStorage();
  await saveUserData(
    source,
    serialLock(),
    readSnapshot(source),
    defaultUserData('en'),
  );
  const valid = JSON.parse(source.getItem(STORAGE_KEY)!);
  const tampered = structuredClone(valid);
  tampered.data.preferences.theme = 'dark';
  for (const raw of [
    '{',
    'null',
    JSON.stringify(tampered),
    JSON.stringify({ ...valid, version: 2 }),
  ]) {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, raw);
    const store = await open(storage);
    assert.equal(store.getSnapshot().status, 'corrupt');
    assert.equal(store.getSnapshot().canExport, false);
    await store.update((data) => data);
    assert.equal(storage.getItem(STORAGE_KEY), raw);
    assert.equal(store.recoverySnapshot()[STORAGE_KEY], raw);
    assert.equal(store.getSnapshot().dirty, true);
  }
});

test('invalid legacy preferences are retained rather than silently reset and migrated', async () => {
  for (const [key, value] of [
    [LEGACY_KEYS[1], 'bad'],
    [LEGACY_KEYS[2], 'bad'],
    [LEGACY_KEYS[3], '{"showWeekend":"false"}'],
  ]) {
    const storage = new MemoryStorage();
    storage.setItem(key, value);
    const loaded = await loadUserData(storage, 'en');
    assert.equal(loaded.issue, 'corrupt');
    assert.equal(loaded.baseline[key], value);
  }
});

test('two simultaneous tab saves commit exactly one snapshot and retain the loser', async () => {
  const storage = new MemoryStorage();
  const lock = serialLock();
  const a = await open(storage, lock),
    b = await open(storage, lock);
  await Promise.all([
    a.update((data) => ({
      ...data,
      preferences: { ...data.preferences, theme: 'dark' },
    })),
    b.update((data) => ({
      ...data,
      preferences: { ...data.preferences, locale: 'zh-Hant' },
    })),
  ]);
  assert.deepEqual([a.getSnapshot().status, b.getSnapshot().status].sort(), [
    'conflict',
    'saved',
  ]);
  assert.equal(storage.writes, 1);
  assert.equal(b.getSnapshot().data.preferences.locale, 'zh-Hant');
  assert.equal(b.getSnapshot().dirty, true);
  await b.retry();
  assert.equal(storage.writes, 1);
  await b.reload();
  assert.equal(b.getSnapshot().data.preferences.theme, 'dark');
  assert.equal(b.getSnapshot().dirty, false);
});

test('rapid edits in one tab drain the queue and persist the latest complete state', async () => {
  const storage = new MemoryStorage();
  const store = await open(storage);
  await Promise.all([
    store.update((data) => ({
      ...data,
      preferences: { ...data.preferences, theme: 'dark' },
    })),
    store.update((data) => ({
      ...data,
      preferences: { ...data.preferences, locale: 'zh-Hans' },
    })),
    store.update((data) => ({
      ...data,
      preferences: {
        ...data.preferences,
        display: { showWeekend: false, showRemarks: true },
      },
    })),
  ]);
  const saved = await decodeDocument(storage.getItem(STORAGE_KEY)!);
  assert.deepEqual(saved.data, store.getSnapshot().data);
  assert.equal(saved.data.preferences.locale, 'zh-Hans');
  assert.equal(saved.data.preferences.theme, 'dark');
  assert.equal(store.getSnapshot().dirty, false);
});

test('external clear and edits detected on focus pause further writes', async () => {
  const storage = new MemoryStorage();
  const store = await open(storage);
  await store.update((data) => data);
  storage.values.clear();
  await store.checkExternal();
  assert.equal(store.getSnapshot().status, 'conflict');
  await store.update((data) => data);
  assert.equal(storage.getItem(STORAGE_KEY), null);
});

test('confirmed restore replaces corrupt data atomically, and stale previews cannot overwrite', async () => {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, '{broken');
  const store = await open(storage);
  const expected = store.captureRestoreBaseline();
  const restored = defaultUserData('zh-Hant', false);
  assert.equal(await store.restore(restored, expected), true);
  assert.deepEqual(
    (await decodeDocument(storage.getItem(STORAGE_KEY)!)).data,
    restored,
  );
  assert.equal(await store.restore(defaultUserData('en'), expected), false);
  assert.equal(store.getSnapshot().status, 'conflict');
  assert.deepEqual(store.getSnapshot().data, restored);
});

test('failed restore preserves current data and cannot unlock corrupt autosave', async () => {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, '{broken');
  const store = await open(storage);
  const original = structuredClone(store.getSnapshot().data);
  storage.failWrite = true;
  assert.equal(
    await store.restore(
      defaultUserData('zh-Hant'),
      store.captureRestoreBaseline(),
    ),
    false,
  );
  assert.deepEqual(store.getSnapshot().data, original);
  storage.failWrite = false;
  await store.update((data) => data);
  assert.equal(storage.getItem(STORAGE_KEY), '{broken');
});
