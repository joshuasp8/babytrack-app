/**
 * Represents a sleep session.
 */
export class Sleep {
    /**
     * @param {Object} data
     * @param {string} [data.id] - Unique identifier
     * @param {Date|string} data.startTime - Start time of the sleep
     * @param {number} data.durationMinutes - Total duration in minutes
     * @param {string} [data.notes] - Optional notes
     */
    constructor(data) {
        this.id = data.id || crypto.randomUUID();
        this.startTime = new Date(data.startTime).toISOString();
        this.durationMinutes = data.durationMinutes || 0;
        this.notes = data.notes || '';
    }
}
