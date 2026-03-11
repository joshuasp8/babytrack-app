import { describe, it, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { FeedService } from '../src/services/feed-service.js';
import { Feed } from '../src/models/feed.js';
import { StorageService } from '../src/services/storage-service.js';
import { FeedApiService } from '../src/services/feed-api-service.js';

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

/** Reset FeedService to local-only mode and clear localStorage between tests. */
function resetService() {
    FeedService.switchToLocal();
    localStorageMock.clear();
}

// ─────────────────────────────────────────────────────────────
// Local-only mode (default)
// ─────────────────────────────────────────────────────────────

describe('FeedService — local mode (default)', () => {
    before(() => { StorageService.latency = 0; });
    beforeEach(resetService);

    it('should start with empty feeds', async () => {
        const feeds = await FeedService.getAll();
        assert.deepStrictEqual(feeds, []);
    });

    it('should add a feed to localStorage', async () => {
        const feed = new Feed({ durationMinutes: 15 });
        await FeedService.add(feed);

        const feeds = await FeedService.getAll();
        assert.strictEqual(feeds.length, 1);
        assert.strictEqual(feeds[0].id, feed.id);
        assert.strictEqual(feeds[0].durationMinutes, 15);
    });

    it('should sort feeds by date descending', async () => {
        const feedOld = new Feed({ startTime: new Date('2023-01-01T10:00:00Z') });
        const feedNew = new Feed({ startTime: new Date('2023-01-02T10:00:00Z') });

        await FeedService.add(feedOld);
        await FeedService.add(feedNew);

        const feeds = await FeedService.getAll();
        assert.strictEqual(feeds.length, 2);
        assert.strictEqual(feeds[0].id, feedNew.id);
        assert.strictEqual(feeds[1].id, feedOld.id);
    });

    it('should delete a feed from localStorage', async () => {
        const feed = new Feed();
        await FeedService.add(feed);
        await FeedService.delete(feed.id);

        const feeds = await FeedService.getAll();
        assert.strictEqual(feeds.length, 0);
    });

    it('should update a feed in localStorage', async () => {
        const feed = new Feed({ durationMinutes: 15, notes: 'Original' });
        await FeedService.add(feed);

        const updatedFeed = new Feed({ id: feed.id, durationMinutes: 30, notes: 'Updated' });
        await FeedService.update(updatedFeed);

        const feeds = await FeedService.getAll();
        assert.strictEqual(feeds.length, 1);
        assert.strictEqual(feeds[0].durationMinutes, 30);
        assert.strictEqual(feeds[0].notes, 'Updated');
        assert.strictEqual(feeds[0].id, feed.id);
    });

    it('should retrieve a specific feed by id', async () => {
        const feed = new Feed({
            startTime: new Date('2023-01-01T10:00:00Z'),
            durationMinutes: 15,
            durationLeftMinutes: 10,
            durationRightMinutes: 5,
            type: 'breast',
            breastSideStartedOn: 'left',
            notes: 'Test feed'
        });
        await FeedService.add(feed);

        const retrieved = await FeedService.get(feed.id);
        assert.strictEqual(retrieved.id, feed.id);
        assert.strictEqual(retrieved.durationMinutes, 15);
        assert.strictEqual(retrieved.notes, 'Test feed');
    });

    it('should not call FeedApiService when in local mode', async () => {
        let apiCalled = false;
        const origCreate = FeedApiService.create;
        FeedApiService.create = async () => { apiCalled = true; };

        const feed = new Feed();
        await FeedService.add(feed);

        FeedApiService.create = origCreate;
        assert.strictEqual(apiCalled, false, 'FeedApiService.create should NOT be called in local mode');
    });

    it('isServerMode() returns false by default', () => {
        assert.strictEqual(FeedService.isServerMode(), false);
    });
});

// ─────────────────────────────────────────────────────────────
// Server mode
// ─────────────────────────────────────────────────────────────

describe('FeedService — server mode', () => {
    const serverStore = [];

    before(() => { StorageService.latency = 0; });

    beforeEach(() => {
        resetService();
        serverStore.length = 0;
        FeedService._useServer = true;

        // Default API stubs for server mode
        FeedApiService.getAll = async () => [...serverStore];
        FeedApiService.create = async (feedData) => {
            const created = { ...feedData, id: crypto.randomUUID() };
            serverStore.push(created);
            return created;
        };
        FeedApiService.update = async (id, data) => {
            const i = serverStore.findIndex(f => f.id === id);
            if (i !== -1) serverStore[i] = { ...data, id };
            return serverStore[i];
        };
        FeedApiService.delete = async (id) => {
            const i = serverStore.findIndex(f => f.id === id);
            if (i !== -1) serverStore.splice(i, 1);
            return true;
        };
    });

    afterEach(() => {
        // Restore to avoid polluting other test suites
        resetService();
    });

    it('isServerMode() returns true', () => {
        assert.strictEqual(FeedService.isServerMode(), true);
    });

    it('getAll() delegates to FeedApiService', async () => {
        serverStore.push({ id: 'srv-1', startTime: new Date().toISOString(), durationMinutes: 10 });

        const feeds = await FeedService.getAll();
        assert.strictEqual(feeds.length, 1);
        assert.strictEqual(feeds[0].id, 'srv-1');
    });

    it('add() uses FeedApiService.create() and server generates id', async () => {
        const feed = new Feed({ durationMinutes: 20 });
        const result = await FeedService.add(feed);

        assert.ok(result.id, 'returned feed should have an id');
        assert.strictEqual(serverStore.length, 1);
        assert.strictEqual(serverStore[0].durationMinutes, 20);
        // Server should have assigned the id (may differ from client's original)
        assert.ok(serverStore[0].id);
    });

    it('add() does NOT write to localStorage', async () => {
        const feed = new Feed({ durationMinutes: 20 });
        await FeedService.add(feed);

        assert.strictEqual(localStorageMock.getItem('babytrack_feeds'), null, 'should not touch localStorage');
    });

    it('update() delegates to FeedApiService.update()', async () => {
        const feed = { id: 'srv-1', startTime: new Date().toISOString(), durationMinutes: 10 };
        serverStore.push(feed);

        const updated = new Feed({ id: 'srv-1', durationMinutes: 25, notes: 'updated' });
        await FeedService.update(updated);

        assert.strictEqual(serverStore[0].durationMinutes, 25);
    });

    it('delete() delegates to FeedApiService.delete()', async () => {
        serverStore.push({ id: 'srv-1', startTime: new Date().toISOString(), durationMinutes: 10 });
        await FeedService.delete('srv-1');

        assert.strictEqual(serverStore.length, 0);
    });

    it('switchToLocal() reverts to local mode', () => {
        FeedService.switchToLocal();
        assert.strictEqual(FeedService.isServerMode(), false);
    });
});

// ─────────────────────────────────────────────────────────────
// switchToServer
// ─────────────────────────────────────────────────────────────

describe('FeedService.switchToServer', () => {
    before(() => { StorageService.latency = 0; });

    beforeEach(() => {
        resetService();
        // Default no-op stubs
        FeedApiService.getAll = async () => [];
        FeedApiService.importFeeds = async () => ({ imported: 0, skipped: 0 });
    });

    afterEach(resetService);

    it('wipes local, switches to server mode', async () => {
        const feed = new Feed({ durationMinutes: 10 });
        await FeedService.add(feed);

        FeedService.switchToServer();

        assert.strictEqual(FeedService.isServerMode(), true);
        assert.strictEqual(localStorageMock.getItem('babytrack_feeds'), null, 'local storage should be wiped');
    });
});
