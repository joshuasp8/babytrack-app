import { LitElement, html, css } from 'lit';
import { sharedStyles } from '../styles/shared-styles.js';
import { formatTime, formatDate } from '../utils/date-utils.js';

export class SleepList extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
      }
      .feed-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        margin-bottom: 12px;
        background: var(--bg-surface);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
      }
      .feed-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
      }
      .feed-time {
          font-weight: 600;
          color: var(--text-primary);
      }
      .feed-details {
          font-size: 0.9em;
          color: var(--text-secondary);
          display: flex;
          gap: 8px;
          align-items: center;
      }
      .badge {
          font-size: 0.75rem;
          padding: 2px 8px;
          border-radius: 12px;
          background: var(--bg-surface-hover);
          color: var(--primary-color);
          font-weight: 500;
          text-transform: uppercase;
      }
      .action-btns {
          display: flex;
          align-self: flex-end;
      }
      .action-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding-left: 8px;
          padding-right: 8px;
          border-radius: 50%;
          transition: background 0.2s, color 0.2s;
      }
      .action-btn:hover {
          background: var(--bg-surface-hover);
          color: var(--text-primary);
      }
      .delete-btn:hover {
          background: rgba(239, 68, 68, 0.1) !important;
          color: #ef4444 !important;
      }
      .edit-btn:hover {
          background: rgba(59, 130, 246, 0.1) !important;
          color: var(--primary-color) !important;
      }
      .date-header {
        font-weight: 600;
        color: var(--text-primary);
        margin-top: 16px;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        padding: 8px;
        margin-left: -8px;
        margin-right: -8px;
        border-radius: var(--radius-md);
        transition: background 0.2s;
      }
      .date-header:hover {
          background: var(--bg-surface-hover);
      }
      .date-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
      }
      .chevron {
          color: var(--text-secondary);
          display: flex;
          align-items: center;
      }
    `];

  static properties = {
    sleeps: { type: Array },
    expandedDates: { type: Object, state: true }
  };

  constructor() {
    super();
    this.sleeps = [];
    this.expandedDates = new Set();
    this._initializedDates = false;
  }



  _handleEdit(sleep) {
    this.dispatchEvent(new CustomEvent('sleep-edited', {
      detail: { sleep },
      bubbles: true,
      composed: true
    }));
  }

  _handleDelete(id) {
    if (confirm('Are you sure you want to delete this sleep entry?')) {
      this.dispatchEvent(new CustomEvent('sleep-deleted', {
        detail: { id },
        bubbles: true,
        composed: true
      }));
    }
  }

  render() {
    if (!this.sleeps || this.sleeps.length === 0) {
      return html`
        <div class="empty-state">
          <p>No sleep sessions recorded yet.</p>
        </div>
      `;
    }

    // Group by date
    const grouped = this.sleeps.reduce((acc, sleep) => {
      const dateKey = formatDate(sleep.startTime);
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(sleep);
      return acc;
    }, {});

    const dates = Object.keys(grouped);
        
    // Auto-expand the most recent date on first render
    if (!this._initializedDates && dates.length > 0) {
        this.expandedDates.add(dates[0]);
        this._initializedDates = true;
    }

    return html`
      <div class="list-container">
        ${dates.map(date => {
      const sleeps = grouped[date];
      const totalMinutes = sleeps.reduce((sum, s) => sum + s.durationMinutes, 0);
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      const totalText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      const isExpanded = this.expandedDates.has(date);

      return html`
              <div class="date-header" @click="${() => this._toggleDate(date)}">
                  <div class="date-header-left">
                      <span class="chevron">
                          ${isExpanded ? html`<chevron-down-icon></chevron-down-icon>` : html`<chevron-right-icon></chevron-right-icon>`}
                      </span>
                      <span>${date}</span>
                  </div>
                  <span style="font-weight: 400; color: var(--text-secondary); font-size: 0.9em;">${totalText}</span>
              </div>
              ${isExpanded ? sleeps.map(sleep => this._renderSleepItem(sleep)) : ''}
            `;
    })}
      </div>
    `;
  }

  _toggleDate(date) {
    if (this.expandedDates.has(date)) {
        this.expandedDates.delete(date);
    } else {
        this.expandedDates.add(date);
    }
    this.requestUpdate();
  }

  _renderSleepItem(sleep) {
    return html`
      <div class="card feed-item">
        <div class="feed-main">
          <div class="feed-info">
            <div class="feed-time">
              ${formatTime(sleep.startTime)}
            </div>
            <div class="feed-details">
              <span class="badge">🌙</span> ${sleep.durationMinutes}m
            </div>
            ${sleep.notes ? html`<div class="feed-notes">${sleep.notes}</div>` : ''}
          </div>
        </div>
         <div class="action-btns">
           <button class="action-btn edit-btn" @click="${() => this._handleEdit(sleep)}">
             <pencil-icon />
           </button>
           <button class="action-btn delete-btn" @click="${() => this._handleDelete(sleep.id)}">
             <trash-icon />
           </button>
         </div>
      </div>
    `;
  }
}

customElements.define('sleep-list', SleepList);
