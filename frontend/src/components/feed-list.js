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
        feeds: { type: Array }
    };

    constructor() {
        super();
        this.feeds = [];
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

        return html`
        <div class="list-container">
            ${Object.keys(grouped).map(date => {
                const feeds = grouped[date];
                const feedCount = feeds.length;
                const totalText = feedCount === 1 ? '1 feed' : `${feedCount} feeds`;

                return html`
                    <div class="date-header">
                        <span>${date}</span>
                        <span style="font-weight: 400; color: var(--text-secondary); font-size: 0.9em;">${totalText}</span>
                    </div>
                    ${feeds.map(feed => this._renderHistoryCard(feed))}
                `;
            })}
        </div>
        `;
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
                        ${feed.type !== 'breast' && feed.amountOz > 0 ? html`<span>${feed.amountOz} oz &middot; ` : html`<span>`}
                        ${feed.durationMinutes} min
                        ${feed.breastSideStartedOn
                ? feed.breastSideStartedOn === 'left' ? html`<span>(left: ${feed.durationLeftMinutes} right: ${feed.durationRightMinutes})</span>` 
                : html`<span>(right: ${feed.durationRightMinutes} left: ${feed.durationLeftMinutes})</span>`
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
