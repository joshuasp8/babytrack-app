import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { SleepService } from '../src/services/sleep-service.js';
import { StorageService } from '../src/services/storage-service.js';
import { Sleep } from '../src/models/sleep.js';
import { SleepApiService } from '../src/services/sleep-api-service.js';

// --- localStorage mock ---
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = value.toString(); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; },
    };
})();

global.localStorage = localStorageMock;

// --- helpers ---

function resetService() {
    SleepService.switchToLocal();
    localStorageMock.clear();
}

// ─────────────────────────────────────────────────────────────
// Local-only mode (default)
// ─────────────────────────────────────────────────────────────

describe('SleepService — local mode (default)', () => {
    beforeEach(() => {
        resetService();
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

    test('isServerMode() returns false by default', () => {
        assert.strictEqual(SleepService.isServerMode(), false);
    });
});

// ─────────────────────────────────────────────────────────────
// Server mode
// ─────────────────────────────────────────────────────────────

describe('SleepService — server mode', () => {
    const serverStore = [];

    beforeEach(() => {
        resetService();
        serverStore.length = 0;
        SleepService._useServer = true;

        mock.method(StorageService, 'saveAsync', async (key, data) => {
            localStorage.setItem(key, JSON.stringify(data));
        });
        mock.method(StorageService, 'getAsync', async (key) => {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        });

        // Default API stubs for server mode
        mock.method(SleepApiService, 'getAll', async () => [...serverStore]);
        mock.method(SleepApiService, 'create', async (data) => {
            const created = { ...data, id: crypto.randomUUID() };
            serverStore.push(created);
            return created;
        });
        mock.method(SleepApiService, 'update', async (id, data) => {
            const i = serverStore.findIndex(s => s.id === id);
            if (i !== -1) serverStore[i] = { ...data, id };
            return serverStore[i];
        });
        mock.method(SleepApiService, 'delete', async (id) => {
            const i = serverStore.findIndex(s => s.id === id);
            if (i !== -1) serverStore.splice(i, 1);
            return true;
        });
    });

    afterEach(() => {
        resetService();
        mock.reset();
    });

    test('isServerMode() returns true', () => {
        assert.strictEqual(SleepService.isServerMode(), true);
    });

    test('getAll() delegates to SleepApiService', async () => {
        serverStore.push({ id: 'srv-1', startTime: new Date().toISOString(), durationMinutes: 10 });

        const sleeps = await SleepService.getAll();
        assert.strictEqual(sleeps.length, 1);
        assert.strictEqual(sleeps[0].id, 'srv-1');
    });

    test('add() uses SleepApiService.create() and server generates id', async () => {
        const sleep = new Sleep({ startTime: new Date().toISOString(), durationMinutes: 60, notes: 'Server nap' });
        const result = await SleepService.add(sleep);

        assert.ok(result.id);
        assert.strictEqual(serverStore.length, 1);
        assert.strictEqual(serverStore[0].durationMinutes, 60);
        assert.ok(serverStore[0].id);
    });

    test('add() does NOT write to localStorage', async () => {
        const sleep = new Sleep({ startTime: new Date().toISOString(), durationMinutes: 60 });
        await SleepService.add(sleep);

        assert.strictEqual(localStorageMock.getItem('babytrack_sleeps'), null);
    });

    test('update() delegates to SleepApiService.update()', async () => {
        const sleep = { id: 'srv-1', startTime: new Date().toISOString(), durationMinutes: 60 };
        serverStore.push(sleep);

        const updated = new Sleep({ id: 'srv-1', startTime: new Date().toISOString(), durationMinutes: 90, notes: 'updated' });
        await SleepService.update(updated);

        assert.strictEqual(serverStore[0].durationMinutes, 90);
    });

    test('delete() delegates to SleepApiService.delete()', async () => {
        serverStore.push({ id: 'srv-1', startTime: new Date().toISOString(), durationMinutes: 60 });
        await SleepService.delete('srv-1');

        assert.strictEqual(serverStore.length, 0);
    });
});

// ─────────────────────────────────────────────────────────────
// importAndSwitchToServer
// ─────────────────────────────────────────────────────────────

describe('SleepService.importAndSwitchToServer', () => {
    beforeEach(() => {
        resetService();
        mock.method(StorageService, 'saveAsync', async (key, data) => {
            localStorage.setItem(key, JSON.stringify(data));
        });
        mock.method(StorageService, 'getAsync', async (key) => {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        });
    });

    afterEach(() => {
        resetService();
        mock.reset();
    });

    test('switches to server, clears local if no local data', async () => {
        // Just mock empty returns
        mock.method(SleepApiService, 'getAll', async () => []);
        
        await SleepService.importAndSwitchToServer();

        assert.strictEqual(SleepService.isServerMode(), true);
    });

    test('imports to server and clears local if local data exists and server empty', async () => {
        const sleep = new Sleep({ startTime: new Date().toISOString(), durationMinutes: 60 });
        await SleepService.add(sleep);

        mock.method(SleepApiService, 'getAll', async () => []); // empty server
        let importCalledTimes = 0;
        mock.method(SleepApiService, 'importSleeps', async (items) => {
            importCalledTimes++;
            return { imported: items.length, skipped: 0 };
        });

        await SleepService.importAndSwitchToServer();

        assert.strictEqual(SleepService.isServerMode(), true);
        assert.strictEqual(importCalledTimes, 1);
        assert.strictEqual(localStorageMock.getItem('babytrack_sleeps'), null, 'local storage wiped');
    });

    test('ignores local storage and does not import if server data exists', async () => {
        const sleep = new Sleep({ startTime: new Date().toISOString(), durationMinutes: 60 });
        await SleepService.add(sleep); // have local data

        mock.method(SleepApiService, 'getAll', async () => [ { id: 'srv-1' } ]); // non-empty server
        let importCalledTimes = 0;
        mock.method(SleepApiService, 'importSleeps', async (items) => {
            importCalledTimes++;
            return { imported: items.length, skipped: 0 };
        });

        await SleepService.importAndSwitchToServer();

        assert.strictEqual(SleepService.isServerMode(), true);
        assert.strictEqual(importCalledTimes, 0, 'import not called');
        assert.ok(localStorageMock.getItem('babytrack_sleeps'), 'local storage preserved');
    });
});
