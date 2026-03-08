import { test } from 'node:test';
import assert from 'node:assert';
import { TimerLogic } from '../src/services/timer-logic.js';

test('TimerLogic Refactor', async (t) => {
    await t.test('start() should initialize correctly', () => {
        const now = new Date();
        const state = TimerLogic.start('breast', 'left', now);

        assert.strictEqual(state.startTime, now.toISOString());
        assert.strictEqual(state.lastResumeTime, now.toISOString());
        assert.strictEqual(state.accumulated.total, 0);
        assert.strictEqual(state.currentSide, 'left');
    });

    await t.test('getDisplayValues() should calculate elapsed time when running', () => {
        const start = new Date();
        const state = TimerLogic.start('bottle', null, start);

        // 5 seconds later
        const now = new Date(start.getTime() + 5000);
        const display = TimerLogic.getDisplayValues(state, now);

        assert.strictEqual(display.total, 5);
        assert.strictEqual(display.isPaused, false);
    });

    await t.test('pause() should bank time and clear lastResumeTime', () => {
        const start = new Date();
        let state = TimerLogic.start('breast', 'left', start);

        // Pause after 10s
        const pauseTime = new Date(start.getTime() + 10000);
        state = TimerLogic.pause(state, pauseTime);

        assert.strictEqual(state.lastResumeTime, null);
        assert.strictEqual(state.accumulated.total, 10);
        assert.strictEqual(state.accumulated.left, 10);

        // Check display values while paused (should remain 10)
        const later = new Date(pauseTime.getTime() + 5000);
        const display = TimerLogic.getDisplayValues(state, later);
        assert.strictEqual(display.total, 10);
        assert.strictEqual(display.isPaused, true);
    });

    await t.test('resume() should restart tracking', () => {
        const start = new Date();
        let state = TimerLogic.start('breast', 'left', start);

        // Pause at 10s
        const pauseTime = new Date(start.getTime() + 10000);
        state = TimerLogic.pause(state, pauseTime);

        // Resume at 20s (10s gap)
        const resumeTime = new Date(start.getTime() + 20000);
        state = TimerLogic.resume(state, resumeTime);

        assert.strictEqual(state.lastResumeTime, resumeTime.toISOString());
        // Accumulated should still be 10 until more time passes
        assert.strictEqual(state.accumulated.total, 10);

        // Check 5s after resume
        const checkTime = new Date(resumeTime.getTime() + 5000);
        const display = TimerLogic.getDisplayValues(state, checkTime);

        // 10s banked + 5s active = 15s total
        assert.strictEqual(display.total, 15);
        assert.strictEqual(display.left, 15);
    });

    await t.test('switchSide() should pause and switch', () => {
        const start = new Date();
        let state = TimerLogic.start('breast', 'left', start);

        // Switch at 10s
        const switchTime = new Date(start.getTime() + 10000);
        state = TimerLogic.switchSide(state, 'right', switchTime);

        // Should be paused
        assert.strictEqual(state.lastResumeTime, null);
        assert.strictEqual(state.currentSide, 'right');
        assert.strictEqual(state.accumulated.left, 10);
        assert.strictEqual(state.accumulated.right, 0);

        // Resume immediately
        state = TimerLogic.resume(state, switchTime);

        // Check 5s later
        const checkTime = new Date(switchTime.getTime() + 5000);
        const display = TimerLogic.getDisplayValues(state, checkTime);

        assert.strictEqual(display.total, 15); // 10s left + 5s right
        assert.strictEqual(display.left, 10);
        assert.strictEqual(display.right, 5);
    });
});
