import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { SleepService } from '../src/services/sleep-service.js';
import { StorageService } from '../src/services/storage-service.js';
import { Sleep } from '../src/models/sleep.js';

// Mock localStorage if not available (e.g. running in Node)
if (typeof localStorage === 'undefined') {
    global.localStorage = {
        store: {},
        getItem(key) { return this.store[key] || null; },
        setItem(key, value) { this.store[key] = value; },
        removeItem(key) { delete this.store[key]; },
        clear() { this.store = {}; }
    };
}

describe('SleepService', () => {
    beforeEach(() => {
        localStorage.clear();
        // Since StorageService might have internal state or caching if modified later, 
        // we ensure a clean slate. For now, it uses localStorage directly.
        mock.method(StorageService, 'saveAsync', async (key, data) => {
            localStorage.setItem(key, JSON.stringify(data));
        });
        mock.method(StorageService, 'getAsync', async (key) => {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        });
    });

    afterEach(() => {
        mock.reset();
    });

    test('add() should add a new sleep session', async () => {
        const sleep = new Sleep({
            startTime: new Date().toISOString(),
            durationMinutes: 60,
            notes: 'Good nap'
        });

        await SleepService.add(sleep);

        const sleeps = await SleepService.getAll();
        assert.strictEqual(sleeps.length, 1);
        assert.strictEqual(sleeps[0].id, sleep.id);
        assert.strictEqual(sleeps[0].notes, 'Good nap');
    });

    test('getAll() should return sleeps sorted by date (newest first)', async () => {
        const older = new Sleep({ startTime: '2023-01-01T10:00:00Z', durationMinutes: 30 });
        const newer = new Sleep({ startTime: '2023-01-01T12:00:00Z', durationMinutes: 45 });

        await SleepService.add(older);
        await SleepService.add(newer);

        const sleeps = await SleepService.getAll();
        assert.strictEqual(sleeps.length, 2);
        assert.strictEqual(sleeps[0].id, newer.id);
        assert.strictEqual(sleeps[1].id, older.id);
    });

    test('update() should update an existing sleep session', async () => {
        const sleep = new Sleep({ startTime: new Date().toISOString(), durationMinutes: 30 });
        await SleepService.add(sleep);

        const updatedSleep = { ...sleep, durationMinutes: 90, notes: 'Extended nap' };
        await SleepService.update(updatedSleep);

        const storedSleep = await SleepService.get(sleep.id);
        assert.strictEqual(storedSleep.durationMinutes, 90);
        assert.strictEqual(storedSleep.notes, 'Extended nap');
    });

    test('delete() should remove a sleep session', async () => {
        const sleep = new Sleep({ startTime: new Date().toISOString(), durationMinutes: 30 });
        await SleepService.add(sleep);

        let sleeps = await SleepService.getAll();
        assert.strictEqual(sleeps.length, 1);

        await SleepService.delete(sleep.id);

        sleeps = await SleepService.getAll();
        assert.strictEqual(sleeps.length, 0);
    });

    test('get() should return undefined for non-existent ID', async () => {
        const sleep = await SleepService.get('non-existent-id');
        assert.strictEqual(sleep, undefined);
    });
});
