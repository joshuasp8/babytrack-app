import { LitElement, html, css } from 'lit';

/**
 * A self-contained sync error toast notification.
 * Listens for 'sync-error' events on `window` and displays a non-blocking
 * error message to the user. Auto-dismisses after 5 seconds.
 *
 * Usage: Place once in your root component's render template:
 *   <sync-toast></sync-toast>
 */
export class SyncToast extends LitElement {
    static styles = css`
        :host {
            display: block;
        }

        .toast {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%) translateY(0);
            z-index: 1000;
            background: var(--card-bg, #1e293b);
            border: 1px solid var(--danger-color, #ef4444);
            border-radius: var(--radius-md, 10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            padding: 12px 20px;
            display: flex;
            align-items: center;
            gap: 10px;
            max-width: 340px;
            white-space: nowrap;
            animation: toastSlideUp 0.25s ease;
        }

        @keyframes toastSlideUp {
            from { opacity: 0; transform: translateX(-50%) translateY(12px); }
            to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .toast-icon {
            flex-shrink: 0;
            width: 18px;
            height: 18px;
            color: var(--danger-color, #ef4444);
        }

        .toast-text {
            font-size: 0.85rem;
            color: var(--text-primary, #f1f5f9);
            flex: 1;
        }

        .toast-dismiss {
            flex-shrink: 0;
            background: none;
            border: none;
            color: var(--text-secondary, #94a3b8);
            cursor: pointer;
            padding: 0;
            font-size: 1rem;
            line-height: 1;
            transition: color 0.15s;
        }

        .toast-dismiss:hover {
            color: var(--text-primary, #f1f5f9);
        }
    `;

    static properties = {
        _message: { state: true },
    };

    constructor() {
        super();
        this._message = null;
        this._dismissTimer = null;
        this._handleSyncError = this._onSyncError.bind(this);
    }

    connectedCallback() {
        super.connectedCallback();
        window.addEventListener('sync-error', this._handleSyncError);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('sync-error', this._handleSyncError);
        if (this._dismissTimer) clearTimeout(this._dismissTimer);
    }

    _onSyncError(e) {
        this._message = e.detail?.message ?? 'A sync error occurred. Your data was saved locally.';
        if (this._dismissTimer) clearTimeout(this._dismissTimer);
        this._dismissTimer = setTimeout(() => this._dismiss(), 5000);
    }

    _dismiss() {
        this._message = null;
        if (this._dismissTimer) {
            clearTimeout(this._dismissTimer);
            this._dismissTimer = null;
        }
    }

    render() {
        if (!this._message) return html``;
        return html`
            <div class="toast" role="alert" aria-live="assertive">
                <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span class="toast-text">${this._message}</span>
                <button class="toast-dismiss" @click="${this._dismiss}" aria-label="Dismiss">✕</button>
            </div>
        `;
    }
}

customElements.define('sync-toast', SyncToast);
