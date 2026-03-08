import { test, describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { AuthService } from '../src/services/auth-service.js';

// --- Mocks ---

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

/** Helper to install a mock fetch that resolves with the given response. */
function mockFetch(status, body = null) {
    global.fetch = async () => ({
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
    });
}

/** Helper to install a mock fetch that rejects (network error). */
function mockFetchError(errorMessage = 'Network error') {
    global.fetch = async () => { throw new Error(errorMessage); };
}

// --- Tests ---

describe('AuthService', () => {

    beforeEach(() => {
        localStorageMock.clear();
    });

    afterEach(() => {
        delete global.fetch;
    });

    // --- getCachedUser ---

    describe('getCachedUser', () => {
        it('should return null when no data is stored', () => {
            const user = AuthService.getCachedUser();
            assert.strictEqual(user, null);
        });

        it('should return parsed user when data exists', () => {
            const expected = { userId: 'abc-123', email: 'test@example.com' };
            localStorageMock.setItem('bt-user', JSON.stringify(expected));

            const user = AuthService.getCachedUser();
            assert.deepStrictEqual(user, expected);
        });

        it('should return null on corrupted data', () => {
            localStorageMock.setItem('bt-user', 'not-json');

            const user = AuthService.getCachedUser();
            assert.strictEqual(user, null);
        });
    });

    // --- clearCachedUser ---

    describe('clearCachedUser', () => {
        it('should remove bt-user from localStorage', () => {
            localStorageMock.setItem('bt-user', JSON.stringify({ email: 'a@b.com' }));
            AuthService.clearCachedUser();

            assert.strictEqual(localStorageMock.getItem('bt-user'), null);
        });
    });

    // --- fetchProfile ---

    describe('fetchProfile', () => {
        it('should persist and return user on 200', async () => {
            const expectedUser = { userId: 'abc-123', email: 'test@example.com' };
            mockFetch(200, expectedUser);

            const user = await AuthService.fetchProfile();

            assert.deepStrictEqual(user, expectedUser);
            assert.deepStrictEqual(
                JSON.parse(localStorageMock.getItem('bt-user')),
                expectedUser
            );
        });

        it('should clear cache and return null on 401', async () => {
            localStorageMock.setItem('bt-user', JSON.stringify({ email: 'old@test.com' }));
            mockFetch(401);

            const user = await AuthService.fetchProfile();

            assert.strictEqual(user, null);
            assert.strictEqual(localStorageMock.getItem('bt-user'), null);
        });

        it('should clear cache and return null on network error', async () => {
            localStorageMock.setItem('bt-user', JSON.stringify({ email: 'old@test.com' }));
            mockFetchError();

            const user = await AuthService.fetchProfile();

            assert.strictEqual(user, null);
            assert.strictEqual(localStorageMock.getItem('bt-user'), null);
        });
    });

    // --- login ---

    describe('login', () => {
        it('should return success on 200', async () => {
            mockFetch(200);

            const result = await AuthService.login('test@example.com');

            assert.deepStrictEqual(result, { success: true });
        });

        it('should send email and redirectUrl in request body', async () => {
            let capturedBody = null;
            global.fetch = async (url, options) => {
                capturedBody = JSON.parse(options.body);
                return { ok: true, status: 200 };
            };

            await AuthService.login('test@example.com');

            assert.strictEqual(capturedBody.email, 'test@example.com');
            assert.ok(capturedBody.redirectUrl, 'redirectUrl should be present');
        });

        it('should use credentials include', async () => {
            let capturedOptions = null;
            global.fetch = async (url, options) => {
                capturedOptions = options;
                return { ok: true, status: 200 };
            };

            await AuthService.login('test@example.com');

            assert.strictEqual(capturedOptions.credentials, 'include');
        });

        it('should return error on 400', async () => {
            mockFetch(400);

            const result = await AuthService.login('bad@example.com');

            assert.strictEqual(result.success, false);
            assert.ok(result.error);
        });

        it('should return error on network failure', async () => {
            mockFetchError();

            const result = await AuthService.login('test@example.com');

            assert.strictEqual(result.success, false);
            assert.ok(result.error);
        });
    });

    // --- logout ---

    describe('logout', () => {
        it('should clear cache and return success on 200', async () => {
            localStorageMock.setItem('bt-user', JSON.stringify({ email: 'a@b.com' }));
            mockFetch(200);

            const result = await AuthService.logout();

            assert.deepStrictEqual(result, { success: true });
            assert.strictEqual(localStorageMock.getItem('bt-user'), null);
        });

        it('should clear cache even on 500', async () => {
            localStorageMock.setItem('bt-user', JSON.stringify({ email: 'a@b.com' }));
            mockFetch(500);

            const result = await AuthService.logout();

            assert.strictEqual(result.success, false);
            assert.ok(result.error);
            assert.strictEqual(localStorageMock.getItem('bt-user'), null);
        });

        it('should clear cache and return error on network failure', async () => {
            localStorageMock.setItem('bt-user', JSON.stringify({ email: 'a@b.com' }));
            mockFetchError();

            const result = await AuthService.logout();

            assert.strictEqual(result.success, false);
            assert.ok(result.error);
            assert.strictEqual(localStorageMock.getItem('bt-user'), null);
        });
    });
});
