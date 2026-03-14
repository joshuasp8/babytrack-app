import { StorageService } from './storage-service.js';
import { SleepApiService } from './sleep-api-service.js';
import { Sleep } from '../models/sleep.js';

const STORAGE_KEY = 'babytrack_sleeps';

/**
 * Service for managing sleep sessions.
 *
 * Operates in one of two modes:
 * - Local-only (default, logged-out): all reads/writes go to localStorage.
 * - Server mode (logged-in): all reads/writes go to the backend API.
 *
 * The transition from local -> server is triggered by `importAndSwitchToServer()`,
 * which bulk-imports local data if needed, clears localStorage, and enables server mode.
 * Call `switchToLocal()` on logout to revert.
 */
export const SleepService = {
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
     * Retrieves all sleep sessions from storage or server.
     * @returns {Promise<Array<Sleep>>} An array of sleep objects sorted by startTime descending (newest first).
     */
    async getAll() {
        if (this._useServer) {
            const sleeps = await SleepApiService.getAll();
            return (sleeps || []).sort((a, b) => new Date(b.startTime).valueOf() - new Date(a.startTime).valueOf());
        }
        /**
         * @type {Array<Sleep>}
         */
        const sleeps = (await StorageService.getAsync(STORAGE_KEY)) || [];
        return sleeps.sort((a, b) => new Date(b.startTime).valueOf() - new Date(a.startTime).valueOf());
    },

    /**
     * Retrieves a specific sleep session by ID.
     * @param {string} id - The ID of the sleep session to retrieve.
     * @returns {Promise<Sleep | undefined>} The sleep object if found, otherwise undefined.
     */
    async get(id) {
        const sleeps = await this.getAll();
        return sleeps.find(s => s.id === id);
    },

    /**
     * Adds a new sleep session to storage or server.
     * @param {Sleep} sleep - The sleep session to add.
     * @returns {Promise<Sleep>}
     */
    async add(sleep) {
        if (this._useServer) {
            const created = await SleepApiService.create(sleep);
            return new Sleep(created);
        }
        const sleeps = await this.getAll();
        sleeps.push(sleep);
        await StorageService.saveAsync(STORAGE_KEY, sleeps);
        return sleep;
    },

    /**
     * Updates an existing sleep session.
     * @param {Sleep} updatedSleep - The sleep session with updated values (must have ID).
     * @returns {Promise<void>}
     */
    async update(updatedSleep) {
        if (this._useServer) {
            await SleepApiService.update(updatedSleep.id, updatedSleep);
            return;
        }
        const sleeps = await this.getAll();
        const index = sleeps.findIndex(s => s.id === updatedSleep.id);

        if (index !== -1) {
            sleeps[index] = updatedSleep;
            await StorageService.saveAsync(STORAGE_KEY, sleeps);
        }
    },

    /**
     * Deletes a sleep session from storage or server.
     * @param {string} id - The ID of the sleep session to delete.
     * @returns {Promise<void>}
     */
    async delete(id) {
        if (this._useServer) {
            await SleepApiService.delete(id);
            return;
        }
        const sleeps = await this.getAll();
        const updatedSleeps = sleeps.filter(s => s.id !== id);
        await StorageService.saveAsync(STORAGE_KEY, updatedSleeps);
    },

    /**
     * Switches to local-only mode (e.g. on logout).
     */
    switchToLocal() {
        this._useServer = false;
    },

    /**
     * Switches to server mode, importing local records if necessary.
     */
    async importAndSwitchToServer() {
        this._useServer = true;

        const localSleeps = await StorageService.getAsync(STORAGE_KEY);
        
        // If there's nothing in local storage, we can safely exit.
        if (!localSleeps || localSleeps.length === 0) {
            StorageService.clear(STORAGE_KEY);
            return;
        }

        // Fetch server sleeps to see if an import is needed
        const serverSleeps = await SleepApiService.getAll();
        const hasServerSleeps = serverSleeps && serverSleeps.length > 0;

        if (!hasServerSleeps) {
            // Import local sleeps
            const result = await SleepApiService.importSleeps(localSleeps);
            if (result && result.skipped === 0) {
                // Import was entirely successful
                StorageService.clear(STORAGE_KEY);
            }
        }
    }
};
