/**
 * Service for authentication and user profile management.
 * Handles login (magic link), logout, profile fetching, and local caching.
 */

/** Base URL for the auth API. Change to 'http://localhost:8080' for local dev. */
const AUTH_BASE_URL = 'https://auth.api.joshuaspeight.com/api/v1/auth';
// const AUTH_BASE_URL = 'http://localhost:8080/api/v1/auth';

/** Redirect URL sent with login requests. The auth server redirects here after email verification. */
const REDIRECT_URL = 'https://babytrack.app.joshuaspeight.com';
// const REDIRECT_URL = 'http://localhost:8000';

/** localStorage key for cached user profile. */
const USER_STORAGE_KEY = 'bt-user';

export const AuthService = {

    /**
     * Returns the cached user profile from localStorage.
     * @returns {{ userId: string, email: string } | null}
     */
    getCachedUser() {
        try {
            const stored = localStorage.getItem(USER_STORAGE_KEY);
            return stored ? JSON.parse(stored) : null;
        } catch (e) {
            console.error('Error reading cached user', e);
            return null;
        }
    },

    /**
     * Removes the cached user profile from localStorage.
     */
    clearCachedUser() {
        try {
            localStorage.removeItem(USER_STORAGE_KEY);
        } catch (e) {
            console.error('Error clearing cached user', e);
        }
    },

    /**
     * Fetches the user profile from the /me endpoint.
     * On success, caches the result in localStorage and returns it.
     * On failure, clears the cache and returns null.
     * @returns {Promise<{ userId: string, email: string } | null>}
     */
    async fetchProfile() {
        try {
            const response = await fetch(`${AUTH_BASE_URL}/me`, {
                method: 'GET',
                credentials: 'include',
            });

            if (!response.ok) {
                this.clearCachedUser();
                return null;
            }

            const user = await response.json();
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
            return user;
        } catch (e) {
            console.error('Error fetching profile', e);
            this.clearCachedUser();
            return null;
        }
    },

    /**
     * Sends a login request with the user's email.
     * The server will send a magic link email for verification.
     * @param {string} email
     * @returns {Promise<{ success: boolean, error?: string }>}
     */
    async login(email) {
        try {
            const response = await fetch(`${AUTH_BASE_URL}/login`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, redirectUrl: REDIRECT_URL }),
            });

            if (!response.ok) {
                return { success: false, error: 'Something went wrong. Please try again.' };
            }

            return { success: true };
        } catch (e) {
            console.error('Login error', e);
            return { success: false, error: 'Something went wrong. Please try again.' };
        }
    },

    /**
     * Logs the user out by calling the /logout endpoint and clearing cached data.
     * @returns {Promise<{ success: boolean, error?: string }>}
     */
    async logout() {
        try {
            const response = await fetch(`${AUTH_BASE_URL}/logout`, {
                method: 'POST',
                credentials: 'include',
            });

            this.clearCachedUser();

            if (!response.ok) {
                return { success: false, error: 'Something went wrong. Please try again.' };
            }

            return { success: true };
        } catch (e) {
            console.error('Logout error', e);
            this.clearCachedUser();
            return { success: false, error: 'Something went wrong. Please try again.' };
        }
    },
};
