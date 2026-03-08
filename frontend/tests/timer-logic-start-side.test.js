import { test } from 'node:test';
import assert from 'node:assert';
import { TimerLogic } from '../src/services/timer-logic.js';

test('Bug Reproduction: Starting side lost after switch', async (t) => {
    await t.test('State should retain original starting side after switching', () => {
        const start = new Date();
        // Start on RIGHT
        let state = TimerLogic.start('breast', 'right', start);

        assert.strictEqual(state.currentSide, 'right');
        // We expect some property to hold the starting side. 
        // Currently it doesn't exist, so we can't assert it yet, 
        // but this test serves to demonstrate what we WANT.
        // Let's assume the property SHOULD be 'startSide'.
        
        // Switch to LEFT
        const switchTime = new Date(start.getTime() + 10000);
        state = TimerLogic.switchSide(state, 'left', switchTime);

        assert.strictEqual(state.currentSide, 'left', 'Current side should be left');
        
        // This is what we want to be true to fix the bug:
        // The UI uses 'currentSide' when ending, which is wrong.
        // It should use a persistent 'startSide'.
        
        if (state.startSide === undefined) {
             // Fails if the property isn't implemented
             throw new Error('startSide property is missing from state');
        }

        assert.strictEqual(state.startSide, 'right', 'Original start side should still be right');
    });
});
