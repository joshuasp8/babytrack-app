import { LitElement, html, css } from 'lit';
import { sharedStyles } from '../styles/shared-styles.js';
import { formatTime, formatDate } from '../utils/date-utils.js';

export class FeedList extends LitElement {
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
    .breast-breakdown {
        display: flex;
        gap: 8px;
    }
    @media (max-width: 400px) {
        .breast-breakdown {
            flex-direction: column;
            gap: 2px;
        }
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
        feeds: { type: Array },
        expandedDates: { type: Object, state: true }
    };

    constructor() {
        super();
        this.feeds = [];
        this.expandedDates = new Set();
        this._initializedDates = false;
    }


    _handleDelete(id) {
        if (confirm('Are you sure you want to delete this feed?')) {
            this.dispatchEvent(new CustomEvent('feed-deleted', {
                detail: { id },
                bubbles: true,
                composed: true
            }));
        }
    }

    _handleEdit(feed) {
        this.dispatchEvent(new CustomEvent('feed-edited', {
            detail: { feed },
            bubbles: true,
            composed: true
        }));
    }

    render() {
        if (!this.feeds || this.feeds.length === 0) {
            return this._renderEmptyList();
        }

        // Group by date
        const grouped = this.feeds.reduce((acc, feed) => {
            const dateKey = formatDate(feed.startTime);
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(feed);
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
            const feeds = grouped[date];
            const feedCount = feeds.length;
            const totalText = feedCount === 1 ? '1 feed' : `${feedCount} feeds`;
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
                    ${isExpanded ? feeds.map(feed => this._renderHistoryCard(feed)) : ''}
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

    _renderEmptyList() {
        return html`
        <div style="text-align: center; color: var(--text-secondary); padding: 32px;">
            No feeds recorded yet.
        </div>
        `;
    }

    _renderHistoryCard(feed) {
        return html`
            <div class="feed-item">
                <div class="feed-info">
                    <div class="feed-time">${formatTime(feed.startTime)}</div>
                    <div class="feed-details">
                        <span class="badge">${feed.type}</span>
                        ${feed.type !== 'breast' && feed.amountOz > 0 ? html`<span>${feed.amountOz} oz •</span>` : ''}
                        <span>${feed.durationMinutes} min</span>
                        ${feed.type === 'breast' && feed.breastSideStartedOn ? html`<span>•</span>` : ''}
                        ${feed.breastSideStartedOn
                ? html`
                    <div class="breast-breakdown">
                        ${feed.breastSideStartedOn === 'left' ? html`
                            <span>left: ${feed.durationLeftMinutes}</span>
                            <span>right: ${feed.durationRightMinutes}</span>
                        ` : html`
                            <span>right: ${feed.durationRightMinutes}</span>
                            <span>left: ${feed.durationLeftMinutes}</span>
                        `}
                    </div>
                `
                : ''
            }
                    </div>
                    ${feed.notes ? html`<div style="font-size: 0.85em; color: var(--text-secondary); margin-top: 4px;">${feed.notes}</div>` : ''}
                </div>
                
                <div class="action-btns">
                    <button class="action-btn edit-btn" @click="${() => this._handleEdit(feed)}" title="Edit">
                        <pencil-icon />
                    </button>
                    <button class="action-btn delete-btn" @click="${() => this._handleDelete(feed.id)}" title="Delete">
                        <trash-icon />
                    </button>
                </div>
            </div>
        `;
    }
}

customElements.define('feed-list', FeedList);
