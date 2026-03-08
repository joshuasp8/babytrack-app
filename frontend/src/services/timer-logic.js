/**
 * Logic for managing active feed timer state.
 * Uses a "banked time + delta" approach to prevent drift.
 */
export class TimerLogic {
    /**
     * Creates the initial state for a new feed.
     */
    static start(type, startSide, now = new Date()) {
        return {
            startTime: now.toISOString(),
            type: type,
            lastResumeTime: now.toISOString(), // Starts running immediately
            accumulated: {
                total: 0,
                left: 0,
                right: 0
            },
            currentSide: startSide || (type === 'breast' ? 'left' : null),
            startSide: startSide || (type === 'breast' ? 'left' : null)
        };
    }

    /**
     * Migrates legacy state formats to the new schema to prevent crashes.
     */
    static migrate(state) {
        if (!state) return null;
        // Already valid and has the new field
        if (state.accumulated && state.startSide !== undefined) return state;

        // Intermediate schema: has accumulated but missing startSide
        if (state.accumulated) {
            return {
                ...state,
                startSide: state.currentSide // Best guess for in-flight migrations
            };
        }

        // Migrate old state to new format
        return {
            startTime: state.startTime,
            type: state.type,
            // If was paused, null. If running, assume running since last interactions or now.
            // Logic: If it was running in old model, we switch it to running now.
            // We might lose specific drift from the exact moment of migration, but it prevents crash.
            lastResumeTime: state.isPaused ? null : (state.lastUpdated || new Date().toISOString()),
            accumulated: {
                total: state.elapsedSeconds || 0,
                left: state.leftSeconds || 0,
                right: state.rightSeconds || 0
            },
            currentSide: state.currentSide,
            startSide: state.currentSide || (state.type === 'breast' ? 'left' : null)
        };
    }

    /**
     * Pauses the timer, banking the elapsed time since last resume.
     */
    static pause(state, now = new Date()) {
        if (!state.lastResumeTime) return state; // Already paused

        const deltaMs = now.getTime() - new Date(state.lastResumeTime).getTime();
        const deltaSeconds = Math.max(0, Math.floor(deltaMs / 1000));

        const newState = {
            ...state,
            lastResumeTime: null,
            accumulated: {
                ...state.accumulated,
                total: state.accumulated.total + deltaSeconds
            }
        };

        if (state.type === 'breast' && state.currentSide) {
            newState.accumulated[state.currentSide] += deltaSeconds;
        }

        return newState;
    }

    /**
     * Resumes the timer by setting the last resume time.
     */
    static resume(state, now = new Date()) {
        if (state.lastResumeTime) return state; // Already running

        return {
            ...state,
            lastResumeTime: now.toISOString()
        };
    }

    /**
     * Switches the active side. Automatically pauses the timer (no auto-resume).
     */
    static switchSide(state, newSide, now = new Date()) {
        // First, pause/bank current progress
        let newState = TimerLogic.pause(state, now);

        // Then switch side
        newState.currentSide = newSide;

        // Ensure it stays paused (lastResumeTime is null from pause())
        return newState;
    }

    /**
     * Calculates the current display values (totals) based on state and current time.
     */
    static getDisplayValues(state, now = new Date()) {
        // Safety check for invalid state to prevent crashes
        if (!state || !state.accumulated) {
            return { total: 0, left: 0, right: 0, isPaused: true };
        }

        if (!state.lastResumeTime) {
            // If paused, just return accumulated
            return {
                total: state.accumulated.total,
                left: state.accumulated.left,
                right: state.accumulated.right,
                isPaused: true
            };
        }

        // If running, calculate delta
        const deltaMs = now.getTime() - new Date(state.lastResumeTime).getTime();
        const deltaSeconds = Math.max(0, Math.floor(deltaMs / 1000));

        const total = state.accumulated.total + deltaSeconds;
        let left = state.accumulated.left;
        let right = state.accumulated.right;

        if (state.type === 'breast' && state.currentSide) {
            if (state.currentSide === 'left') left += deltaSeconds;
            if (state.currentSide === 'right') right += deltaSeconds;
        }

        return {
            total,
            left,
            right,
            isPaused: false
        };
    }
}
