import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import { formatFeedTime } from '../src/utils/date-utils.js';

describe('date-utils', () => {
    it('should format a valid date string correctly', () => {
        // Fixed date: Jan 24, 2025, 1:28 PM
        // Note: Months are 0-indexed in JS Date constructor if using (year, month, ...), but string parsing is standard.
        // toLocaleString('en-US') uses the system's time zone by default unless timeZone is specified.
        const dateStr = '2025-01-24T13:28:00';
        const result = formatFeedTime(dateStr);

        assert.strictEqual(result, 'Fri Jan 24 1:28 PM');
    });

    it('should return empty string for null/undefined', () => {
        assert.strictEqual(formatFeedTime(null), '');
        assert.strictEqual(formatFeedTime(undefined), '');
    });

    it('should handle invalid date strings gracefully (or let Date handle it)', () => {
        // invalid date usually results in "Invalid Date"
        const result = formatFeedTime('invalid-date');
        assert.strictEqual(result, 'Invalid Date');
    });
});
