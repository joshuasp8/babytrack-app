import { LitElement, html, css } from 'lit';
import { sharedStyles } from '../styles/shared-styles.js';

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
      .action-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 8px;
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
        margin-bottom: 4px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    `];

  static properties = {
    sleeps: { type: Array }
  };

  constructor() {
    super();
    this.sleeps = [];
  }

  _formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase();
  }

  _formatDate(isoString) {
    const date = new Date(isoString);
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
      const dateKey = this._formatDate(sleep.startTime);
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(sleep);
      return acc;
    }, {});

    return html`
      <div class="list-container">
        ${Object.keys(grouped).map(date => {
      const sleeps = grouped[date];
      const totalMinutes = sleeps.reduce((sum, s) => sum + s.durationMinutes, 0);
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      const totalText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

      return html`
              <div class="date-header">
                  <span>${date}</span>
                  <span style="font-weight: 400; color: var(--text-secondary); font-size: 0.9em;">${totalText}</span>
              </div>
              ${sleeps.map(sleep => this._renderSleepItem(sleep))}
            `;
    })}
      </div>
    `;
  }

  _renderSleepItem(sleep) {
    return html`
      <div class="card feed-item">
        <div class="feed-main">
          <div class="feed-info">
            <div class="feed-time">
              ${this._formatTime(sleep.startTime)}
            </div>
            <div class="feed-details">
              <span class="badge">🌙</span> ${sleep.durationMinutes}m
            </div>
            ${sleep.notes ? html`<div class="feed-notes">${sleep.notes}</div>` : ''}
          </div>
        </div>
         <div class="feed-actions">
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
