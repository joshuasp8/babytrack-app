/**
 * API client for the BabyTrack feed backend.
 * Mirrors the server's REST endpoints for feeds.
 *
 * For logged-in users, all feed CRUD flows through these methods.
 * On 5XX errors, requests are retried up to MAX_RETRIES times with
 * exponential backoff. On permanent failure, an Error is thrown to
 * the caller so the UI can react appropriately.
 */

import { Feed } from '../models/feed.js';

/** Base URL for the feed API. Change to the prod URL when deploying. */
const FEED_API_BASE_URL = ''; // served from same origin
// const FEED_API_BASE_URL = 'https://babytrack.app.joshuaspeight.com';
// const FEED_API_BASE_URL = 'http://localhost:8081';

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

export const FeedApiService = {

    /**
     * Retrieves all feeds for the authenticated user from the server.
     * @returns {Promise<Array<Feed>|null>} Array of feed objects, or null on error.
     */
    async getAll() {
        try {
            const response = await fetchWithRetry(`${FEED_API_BASE_URL}/api/v1/feeds`, {
                method: 'GET',
                credentials: 'include',
            });
            if (!response.ok) return null;
            return await response.json();
        } catch (e) {
            console.error('[FeedApiService] getAll failed:', e);
            return null;
        }
    },

    /**
     * Creates a new feed on the server. The server generates the ID.
     * @param {Object} feedData - The feed fields (startTime, durationMinutes, type, etc.).
     * @returns {Promise<Object>} The created feed object from the server.
     * @throws {Error} If the request fails.
     */
    async create(feedData) {
        const response = await fetchWithRetry(`${FEED_API_BASE_URL}/api/v1/feeds`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(feedData),
        });
        if (!response.ok) {
            throw new Error(`Failed to create feed: ${response.status}`);
        }
        return await response.json();
    },

    /**
     * Bulk-imports feeds from localStorage to the server (idempotent upsert).
     * Use this for both initial data migration AND new creates, to keep UUIDs in sync.
     * @param {Array<Object>} feeds - Array of feed objects to import.
     * @returns {Promise<{imported: number, skipped: number}|null>}
     */
    async importFeeds(feeds) {
        try {
            const response = await fetchWithRetry(`${FEED_API_BASE_URL}/api/v1/feeds/import`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feeds }),
            });
            if (!response.ok) {
                dispatchSyncError('Failed to sync new feed to server.');
                return null;
            }
            return await response.json();
        } catch (e) {
            console.error('[FeedApiService] importFeeds failed after retries:', e);
            dispatchSyncError('Failed to sync new feed to server.');
            return null;
        }
    },

    /**
     * Updates an existing feed on the server.
     * @param {string} id - The UUID of the feed to update.
     * @param {Object} feedData - The updated feed fields.
     * @returns {Promise<Object|null>} The updated feed, or null on error.
     */
    async update(id, feedData) {
        try {
            const response = await fetchWithRetry(`${FEED_API_BASE_URL}/api/v1/feeds/${id}`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(feedData),
            });
            if (!response.ok) {
                dispatchSyncError('Failed to sync feed update to server.');
                return null;
            }
            return await response.json();
        } catch (e) {
            console.error('[FeedApiService] update failed after retries:', e);
            dispatchSyncError('Failed to sync feed update to server.');
            return null;
        }
    },

    /**
     * Deletes a feed on the server.
     * @param {string} id - The UUID of the feed to delete.
     * @returns {Promise<boolean>} True on success, false on error.
     */
    async delete(id) {
        try {
            const response = await fetchWithRetry(`${FEED_API_BASE_URL}/api/v1/feeds/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (!response.ok) {
                dispatchSyncError('Failed to sync feed deletion to server.');
                return false;
            }
            return true;
        } catch (e) {
            console.error('[FeedApiService] delete failed after retries:', e);
            dispatchSyncError('Failed to sync feed deletion to server.');
            return false;
        }
    },
};
