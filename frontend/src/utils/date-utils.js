/**
 * Format an ISO date string to time-only display (e.g. "01:08 am").
 * @param {string} isoString
 * @returns {string}
 */
export const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase();
};

/**
 * Format an ISO date string to a relative/short date label.
 * Returns "Today", "Yesterday", or a short date like "Mar 10".
 * @param {string} isoString
 * @returns {string}
 */
export const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    if (date.toDateString() === now.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
};
