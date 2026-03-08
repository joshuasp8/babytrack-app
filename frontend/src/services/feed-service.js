import { StorageService } from './storage-service.js';
import { FeedApiService } from './feed-api-service.js';
import { Feed } from '../models/feed.js';

const STORAGE_KEY = 'babytrack_feeds';

/**
 * Service for managing feeds.
 *
 * Operates in one of two modes:
 * - Local-only (default, logged-out): all reads/writes go to localStorage.
 * - Server mode (logged-in): all reads/writes go to the backend API.
 *
 * The transition from local → server is triggered by `importAndSwitchToServer()`,
 * which bulk-imports local data, wipes localStorage, and enables server mode.
 * Call `switchToLocal()` on logout to revert.
 */
export const FeedService = {
    /** @type {boolean} */
    _useServer: false,

    /**
     * Returns true when the service is operating in server mode.
     * @returns {boolean}
     */
    isServerMode() {
        return this._useServer;
    },

    /**
     * Retrieves all feeds, from either localStorage or the server.
     * @returns {Promise<Array<Feed>>} Sorted by startTime descending (newest first).
     */
    async getAll() {
        console.log('feed-service.js: FeedService.getAll() called, useServer:', this._useServer);
        if (this._useServer) {
            const feeds = await FeedApiService.getAll();
            return (feeds || []).sort((a, b) => new Date(b.startTime).valueOf() - new Date(a.startTime).valueOf());
            console.log('feed-service.js: FeedService.getAll() completed');
        }
        const feeds = (await StorageService.getAsync(STORAGE_KEY)) || [];
        return feeds.sort((a, b) => new Date(b.startTime).valueOf() - new Date(a.startTime).valueOf());
    },

    /**
     * Retrieves a specific feed by ID.
     * @param {string} id - The ID of the feed to retrieve.
     * @returns {Promise<Feed | undefined>} The feed object if found, otherwise undefined.
     */
    async get(id) {
        const feeds = await this.getAll();
        return feeds.find(f => f.id === id);
    },

    /**
     * Adds a new feed.
     * - Server mode: POSTs to the create endpoint (server generates ID).
     * - Local mode: writes to localStorage.
     * @param {Feed} feed - The feed to add.
     * @returns {Promise<Feed>} The persisted feed (server-assigned if in server mode).
     */
    async add(feed) {
        if (this._useServer) {
            const created = await FeedApiService.create(feed);
            return new Feed(created);
        }
        const feeds = await this.getAll();
        feeds.push(feed);
        await StorageService.saveAsync(STORAGE_KEY, feeds);
        return feed;
    },

    /**
     * Updates an existing feed.
     * - Server mode: PUTs to the server.
     * - Local mode: updates localStorage.
     * @param {Feed} updatedFeed - The feed with updated values (must have ID).
     * @returns {Promise<void>}
     */
    async update(updatedFeed) {
        if (this._useServer) {
            await FeedApiService.update(updatedFeed.id, updatedFeed);
            return;
        }
        const feeds = await this.getAll();
        const index = feeds.findIndex(f => f.id === updatedFeed.id);
        if (index !== -1) {
            feeds[index] = updatedFeed;
            await StorageService.saveAsync(STORAGE_KEY, feeds);
        }
    },

    /**
     * Deletes a feed.
     * - Server mode: sends DELETE to the server.
     * - Local mode: removes from localStorage.
     * @param {string} id - The ID of the feed to delete.
     * @returns {Promise<void>}
     */
    async delete(id) {
        if (this._useServer) {
            await FeedApiService.delete(id);
            return;
        }
        const feeds = await this.getAll();
        const updatedFeeds = feeds.filter(f => f.id !== id);
        await StorageService.saveAsync(STORAGE_KEY, updatedFeeds);
    },

    /**
     * Performs the one-time migration from local-only to server mode.
     *
     * Steps:
     * 1. Fetch server feeds. If that fails, bail out (stay local).
     * 2. If server already has data: skip import, wipe local, enable server mode.
     * 3. If server is empty and local has data: bulk import.
     *    - If import fails or has skips: stay local, return failure.
     *    - On clean import: wipe local, enable server mode.
     * 4. If both server and local are empty: nothing to import, enable server mode.
     *
     * @returns {Promise<{ success: boolean, message?: string }>}
     */
    async importAndSwitchToServer() {
        try {
            const serverFeeds = await FeedApiService.getAll();

            if (serverFeeds === null) {
                // Cannot reach server — stay local.
                return { success: false, message: 'Could not reach the server. Your data is saved locally and will sync on next login.' };
            }

            if (serverFeeds.length === 0) {
                // Server is empty — check if we have local data to import.
                const localFeeds = await this.getAll();

                if (localFeeds.length > 0) {
                    console.log(`[FeedService] Server is empty. Importing ${localFeeds.length} local feeds...`);
                    const result = await FeedApiService.importFeeds(localFeeds);

                    if (!result) {
                        return { success: false, message: 'Import failed. Your data is saved locally and will retry on next login.' };
                    }

                    if (result.skipped > 0) {
                        const msg = `Import incomplete: ${result.skipped} of ${localFeeds.length} feeds could not be imported. Your data is saved locally.`;
                        console.warn(`[FeedService] ${msg}`);
                        return { success: false, message: msg };
                    }

                    console.log(`[FeedService] Import complete: ${result.imported} imported.`);
                }
            } else {
                console.log(`[FeedService] Server already has ${serverFeeds.length} feeds. Skipping import.`);
            }

            // Wipe local feed data and switch to server mode.
            StorageService.clear(STORAGE_KEY);
            this._useServer = true;
            return { success: true };

        } catch (e) {
            console.error('[FeedService] importAndSwitchToServer failed:', e);
            return { success: false, message: 'An unexpected error occurred during import. Your data is saved locally.' };
        }
    },

    /**
     * Switches back to local-only mode (e.g. on logout).
     */
    switchToLocal() {
        this._useServer = false;
    },
};
