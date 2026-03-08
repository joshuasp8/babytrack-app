/**
 * Service for interacting with the browser's localStorage.
 */
export const StorageService = {

    /**
     * The latency to add to storage operations (in milliseconds).
     * Used to simulate network latency and test the loading state.
     * @type {number}
     */
    latency: 200,

    /**
     * Retrieves data from localStorage.
     * @param {string} key - The key to retrieve data for.
     * @returns {any} The data stored under the key, or null if not found.
     */
    get(key) {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : null;
        } catch (e) {
            console.error(`Error loading key "${key}" from storage`, e);
            return null;
        }
    },

    /**
     * Saves data to localStorage.
     * @param {string} key - The key to save data under.
     * @param {any} data - The data to save.
     */
    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error(`Error saving key "${key}" to storage`, e);
        }
    },

    /**
     * Clears data from localStorage.
     * @param {string} key - The key to clear data for.
     */
    clear(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error(`Error clearing key "${key}" from storage`, e);
        }
    },

    /**
     * Retrieves data from localStorage asynchronously with a delay.
     * @param {string} key - The key to retrieve data for.
     * @returns {Promise<any>} The data stored under the key, or null if not found.
     */
    async getAsync(key) {
        if (this.latency > 0) {
            await new Promise(resolve => setTimeout(resolve, this.latency));
        }
        return this.get(key);
    },

    /**
     * Saves data to localStorage asynchronously with a delay.
     * @param {string} key - The key to save data under.
     * @param {any} data - The data to save.
     * @returns {Promise<void>}
     */
    async saveAsync(key, data) {
        if (this.latency > 0) {
            await new Promise(resolve => setTimeout(resolve, this.latency));
        }
        this.save(key, data);
    },

    /**
     * Clears data from localStorage asynchronously with a delay.
     * @param {string} key - The key to clear data for.
     * @returns {Promise<void>}
     */
    async clearAsync(key) {
        if (this.latency > 0) {
            await new Promise(resolve => setTimeout(resolve, this.latency));
        }
        this.clear(key);
    }
};
