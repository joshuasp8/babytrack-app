/**
 * Represents a single feeding event.
 * @param {string} id - The unique identifier of the feed.
 * @param {string} startTime - The start time of the feed (ISO string).
 * @param {number} durationMinutes - The duration of the feed in minutes.
 * @param {number} durationLeftMinutes - The duration of the left side of the feed in minutes.
 * @param {number} durationRightMinutes - The duration of the right side of the feed in minutes.
 * @param {'breast'|'bottle'|'formula'} type - The type of feed.
 * @param {'left'|'right'|null} breastSideStartedOn - The side of the breast to feed from.
 * @param {number} amountOz - The amount of ounces consumed during the feed.
 * @param {string} notes - Any notes about the feed.
 */
export class Feed {
  constructor({
    id = crypto.randomUUID(),
    startTime = new Date(),
    durationMinutes = 0,
    durationLeftMinutes = 0,
    durationRightMinutes = 0,
    amountOz = 0,
    type = 'breast',
    breastSideStartedOn = null,
    notes = ''
  } = {}) {
    this.id = id;
    this.startTime =
      startTime instanceof Date
        ? startTime.toISOString()
        : startTime;
    this.durationMinutes = durationMinutes;
    this.durationLeftMinutes = durationLeftMinutes;
    this.durationRightMinutes = durationRightMinutes;
    this.amountOz = amountOz;
    this.type = type;
    this.breastSideStartedOn = breastSideStartedOn;
    this.notes = notes;
  }
}
