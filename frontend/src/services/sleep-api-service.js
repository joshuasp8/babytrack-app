/**
 * API client for the BabyTrack sleep backend.
 * Mirrors the server's REST endpoints for sleeps.
 *
 * For logged-in users, all sleep CRUD flows through these methods.
 * On 5XX errors, requests are retried up to MAX_RETRIES times with
 * exponential backoff. On permanent failure, an Error is thrown to
 * the caller so the UI can react appropriately.
 */

import { Sleep } from '../models/sleep.js';

/** Base URL for the sleep API. Change to the prod URL when deploying. */
const SLEEP_API_BASE_URL = ''; // served from same origin

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

/**
 * Fetches a URL with automatic retry on 5XX errors.
 * @param {string} url
 * @param {RequestInit} options
 * @returns {Promise<Response>} The successful response.
 * @throws {Error} If all retries are exhausted or a non-5XX error occurs.
 */
async function fetchWithRetry(url, options) {
    let lastError;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        if (attempt > 0) {
            const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        try {
            const response = await fetch(url, options);
            // Only retry on server errors (5XX). Client errors (4XX) are final.
            if (response.status >= 500) {
                lastError = new Error(`Server error: ${response.status}`);
                continue;
            }
            return response;
        } catch (networkError) {
            // Network failures (e.g. offline) are not retried — just fail fast.
            throw networkError;
        }
    }
    throw lastError;
}

/**
 * Dispatches a 'sync-error' event on `window` so the toast component can
 * surface a message to the user after all retries have been exhausted.
 * @param {string} message
 */
function dispatchSyncError(message) {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sync-error', { detail: { message } }));
    }
}

export const SleepApiService = {

    /**
     * Retrieves all sleeps for the authenticated user from the server.
     * @returns {Promise<Array<Sleep>|null>} Array of sleep objects, or null on error.
     */
    async getAll() {
        try {
            const response = await fetchWithRetry(`${SLEEP_API_BASE_URL}/api/v1/sleeps`, {
                method: 'GET',
                credentials: 'include',
            });
            if (!response.ok) return null;
            return await response.json();
        } catch (e) {
            console.error('[SleepApiService] getAll failed:', e);
            return null;
        }
    },

    /**
     * Creates a new sleep on the server. The server generates the ID.
     * @param {Object} sleepData - The sleep fields.
     * @returns {Promise<Object>} The created sleep object from the server.
     * @throws {Error} If the request fails.
     */
    async create(sleepData) {
        const response = await fetchWithRetry(`${SLEEP_API_BASE_URL}/api/v1/sleeps`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sleepData),
        });
        if (!response.ok) {
            throw new Error(`Failed to create sleep: ${response.status}`);
        }
        return await response.json();
    },

    /**
     * Bulk-imports sleeps from localStorage to the server (idempotent upsert).
     * @param {Array<Object>} sleeps - Array of sleep objects to import.
     * @returns {Promise<{imported: number, skipped: number}|null>}
     */
    async importSleeps(sleeps) {
        try {
            const response = await fetchWithRetry(`${SLEEP_API_BASE_URL}/api/v1/sleeps/import`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sleeps }),
            });
            if (!response.ok) {
                dispatchSyncError('Failed to sync new sleep to server.');
                return null;
            }
            return await response.json();
        } catch (e) {
            console.error('[SleepApiService] importSleeps failed after retries:', e);
            dispatchSyncError('Failed to sync new sleep to server.');
            return null;
        }
    },

    /**
     * Updates an existing sleep on the server.
     * @param {string} id - The UUID of the sleep to update.
     * @param {Object} sleepData - The updated sleep fields.
     * @returns {Promise<Object|null>} The updated sleep, or null on error.
     */
    async update(id, sleepData) {
        try {
            const response = await fetchWithRetry(`${SLEEP_API_BASE_URL}/api/v1/sleeps/${id}`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sleepData),
            });
            if (!response.ok) {
                dispatchSyncError('Failed to sync sleep update to server.');
                return null;
            }
            return await response.json();
        } catch (e) {
            console.error('[SleepApiService] update failed after retries:', e);
            dispatchSyncError('Failed to sync sleep update to server.');
            return null;
        }
    },

    /**
     * Deletes a sleep on the server.
     * @param {string} id - The UUID of the sleep to delete.
     * @returns {Promise<boolean>} True on success, false on error.
     */
    async delete(id) {
        try {
            const response = await fetchWithRetry(`${SLEEP_API_BASE_URL}/api/v1/sleeps/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (!response.ok) {
                dispatchSyncError('Failed to sync sleep deletion to server.');
                return false;
            }
            return true;
        } catch (e) {
            console.error('[SleepApiService] delete failed after retries:', e);
            dispatchSyncError('Failed to sync sleep deletion to server.');
            return false;
        }
    },
};
