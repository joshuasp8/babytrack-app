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
        if (this._useServer) {
            const feeds = await FeedApiService.getAll();
            return (feeds || []).sort((a, b) => new Date(b.startTime).valueOf() - new Date(a.startTime).valueOf());
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
     * Wipes local feed data and switch to server mode.
     */
    switchToServer() {
        StorageService.clear(STORAGE_KEY);
        this._useServer = true;
    },

    /**
     * Switches back to local-only mode (e.g. on logout).
     */
    switchToLocal() {
        this._useServer = false;
    },
};
