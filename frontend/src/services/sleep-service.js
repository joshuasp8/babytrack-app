import { StorageService } from './storage-service.js';
import { Sleep } from '../models/sleep.js';

const STORAGE_KEY = 'babytrack_sleeps';

/**
 * Service for managing sleep sessions.
 */
export const SleepService = {
    /**
     * Retrieves all sleep sessions from storage.
     * @returns {Promise<Array<Sleep>>} An array of sleep objects sorted by startTime descending (newest first).
     */
    async getAll() {
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
     * Adds a new sleep session to storage.
     * @param {Sleep} sleep - The sleep session to add.
     * @returns {Promise<void>}
     */
    async add(sleep) {
        const sleeps = await this.getAll();
        sleeps.push(sleep);
        await StorageService.saveAsync(STORAGE_KEY, sleeps);
    },

    /**
     * Updates an existing sleep session.
     * @param {Sleep} updatedSleep - The sleep session with updated values (must have ID).
     * @returns {Promise<void>}
     */
    async update(updatedSleep) {
        const sleeps = await this.getAll();
        const index = sleeps.findIndex(s => s.id === updatedSleep.id);

        if (index !== -1) {
            sleeps[index] = updatedSleep;
            await StorageService.saveAsync(STORAGE_KEY, sleeps);
        }
    },

    /**
     * Deletes a sleep session from storage.
     * @param {string} id - The ID of the sleep session to delete.
     * @returns {Promise<void>}
     */
    async delete(id) {
        const sleeps = await this.getAll();
        const updatedSleeps = sleeps.filter(s => s.id !== id);
        await StorageService.saveAsync(STORAGE_KEY, updatedSleeps);
    }
};
