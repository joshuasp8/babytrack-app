import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatTime, formatDate } from '../src/utils/date-utils.js';

// ─────────────────────────────────────────────────────────────
// formatTime
// ─────────────────────────────────────────────────────────────

describe('formatTime', () => {
    it('should return a lowercase time string', () => {
        const result = formatTime('2025-01-24T13:28:00');
        // 1:28 PM → "01:28 pm" (exact format depends on locale/platform)
        assert.ok(result.includes('28'), `Expected time containing "28", got "${result}"`);
        assert.strictEqual(result, result.toLowerCase(), 'should be lowercase');
    });

    it('should return empty string for null/undefined', () => {
        assert.strictEqual(formatTime(null), '');
        assert.strictEqual(formatTime(undefined), '');
    });

    it('should return "Invalid Date" for bad input', () => {
        assert.strictEqual(formatTime('not-a-date'), 'Invalid Date');
    });
});

// ─────────────────────────────────────────────────────────────
// formatDate
// ─────────────────────────────────────────────────────────────

describe('formatDate', () => {
    it('should return "Today" for today\'s date', () => {
        const now = new Date();
        assert.strictEqual(formatDate(now.toISOString()), 'Today');
    });

    it('should return "Yesterday" for yesterday\'s date', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        assert.strictEqual(formatDate(yesterday.toISOString()), 'Yesterday');
    });

    it('should return a short date for older dates', () => {
        const old = new Date('2024-06-15T10:00:00');
        const result = formatDate(old.toISOString());
        // Should contain month and day, e.g. "Jun 15"
        assert.ok(result.includes('Jun'), `Expected month "Jun" in "${result}"`);
        assert.ok(result.includes('15'), `Expected day "15" in "${result}"`);
    });

    it('should return empty string for null/undefined', () => {
        assert.strictEqual(formatDate(null), '');
        assert.strictEqual(formatDate(undefined), '');
    });

    it('should return "Invalid Date" for bad input', () => {
        assert.strictEqual(formatDate('not-a-date'), 'Invalid Date');
    });
});
