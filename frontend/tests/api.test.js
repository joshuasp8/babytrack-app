
import assert from 'node:assert';
import { test, describe, before, after, mock } from 'node:test';
import { api } from '../services/api.js';

// Mock global fetch
global.fetch = mock.fn(async () => {
    return {
        ok: true,
        json: async () => ([])
    };
});

describe('API Service', () => {

    test('getAll calls correct endpoint', async () => {
        global.fetch.mock.restore();
        global.fetch = mock.fn(async () => Promise.resolve({ ok: true, json: async () => [] }));

        await api.getAll();

        assert.strictEqual(global.fetch.mock.calls[0].arguments[0], '/api/v1/todos');
    });

    test('create sends POST request with title', async () => {
        global.fetch.mock.restore();
        global.fetch = mock.fn(async () => Promise.resolve({ ok: true, json: async () => ({}) }));

        await api.create('Buy milk');

        const call = global.fetch.mock.calls[0];
        assert.strictEqual(call.arguments[0], '/api/v1/todos');
        assert.strictEqual(call.arguments[1].method, 'POST');
        assert.deepStrictEqual(JSON.parse(call.arguments[1].body), { title: 'Buy milk' });
    });

    test('update sends PUT request', async () => {
        global.fetch.mock.restore();
        global.fetch = mock.fn(async () => Promise.resolve({ ok: true, json: async () => ({}) }));

        await api.update('123', { completed: true });

        const call = global.fetch.mock.calls[0];
        assert.strictEqual(call.arguments[0], '/api/v1/todos/123');
        assert.strictEqual(call.arguments[1].method, 'PUT');
    });

    test('delete sends DELETE request', async () => {
        global.fetch.mock.restore();
        global.fetch = mock.fn(async () => Promise.resolve({ ok: true }));

        await api.delete('123');

        const call = global.fetch.mock.calls[0];
        assert.strictEqual(call.arguments[0], '/api/v1/todos/123');
        assert.strictEqual(call.arguments[1].method, 'DELETE');
    });
});
