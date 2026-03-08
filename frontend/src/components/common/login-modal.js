import { LitElement, html, css } from 'lit';
import { sharedStyles } from '../../styles/shared-styles.js';
import { AuthService } from '../../services/auth-service.js';

/**
 * A modal dialog for the email-only magic link login flow.
 * Handles: email input → submission → "check your email" success message.
 *
 * @fires modal-closed - When the user closes the modal (X or Done).
 * @fires login-submitted - After a successful login API call. Detail: { email }.
 */
export class LoginModal extends LitElement {
    static styles = [
        sharedStyles,
        css`
        :host {
            display: block;
        }

        .overlay {
            position: fixed;
            inset: 0;
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .modal-card {
            background: var(--bg-surface);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg);
            padding: 32px 28px 28px;
            width: 90%;
            max-width: 400px;
            position: relative;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            animation: slideUp 0.25s ease;
        }

        @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        .close-btn {
            position: absolute;
            top: 12px;
            right: 12px;
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            padding: 4px;
            line-height: 1;
            font-size: 1.4rem;
            transition: color 0.2s;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .close-btn:hover {
            color: var(--text-primary);
            background: var(--bg-surface-hover);
        }

        .modal-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 8px;
        }

        .modal-subtitle {
            font-size: 0.875rem;
            color: var(--text-secondary);
            margin-bottom: 24px;
            line-height: 1.4;
        }

        .login-btn {
            width: 100%;
            padding: 12px;
            font-size: 1rem;
            margin-top: 8px;
        }

        .login-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .error-message {
            color: var(--danger-color);
            font-size: 0.85rem;
            margin-top: 12px;
            padding: 8px 12px;
            background: rgba(239, 68, 68, 0.1);
            border-radius: var(--radius-md);
            border: 1px solid rgba(239, 68, 68, 0.2);
        }

        /* --- Success State --- */

        .success-content {
            text-align: center;
            padding: 16px 0;
        }

        .envelope-icon {
            width: 64px;
            height: 64px;
            margin: 0 auto 20px;
            color: var(--primary-color);
        }

        .success-title {
            font-size: 1.15rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 12px;
        }

        .success-message {
            font-size: 0.875rem;
            color: var(--text-secondary);
            line-height: 1.5;
            margin-bottom: 24px;
        }

        .done-btn {
            width: 100%;
            padding: 12px;
            font-size: 1rem;
        }
    `];

    static properties = {
        open: { type: Boolean },
        _email: { state: true },
        _status: { state: true },    // 'idle' | 'submitting' | 'success' | 'error'
        _errorMessage: { state: true },
    };

    constructor() {
        super();
        this.open = false;
        this._email = '';
        this._status = 'idle';
        this._errorMessage = '';
    }

    /** Reset modal state when it opens. */
    updated(changedProps) {
        if (changedProps.has('open') && this.open) {
            this._email = '';
            this._status = 'idle';
            this._errorMessage = '';
        }
    }

    _close() {
        this.dispatchEvent(new CustomEvent('modal-closed'));
    }

    async _handleSubmit(e) {
        e.preventDefault();
        if (!this._email.trim()) return;

        this._status = 'submitting';
        this._errorMessage = '';

        const result = await AuthService.login(this._email.trim());

        if (result.success) {
            this._status = 'success';
            this.dispatchEvent(new CustomEvent('login-submitted', {
                detail: { email: this._email.trim() },
            }));
        } else {
            this._status = 'error';
            this._errorMessage = result.error;
        }
    }

    render() {
        if (!this.open) return html``;

        return html`
            <div class="overlay" @click="${this._handleOverlayClick}">
                <div class="modal-card" @click="${(e) => e.stopPropagation()}">
                    <button class="close-btn" @click="${this._close}" aria-label="Close">✕</button>
                    ${this._status === 'success'
                ? this._renderSuccess()
                : this._renderForm()}
                </div>
            </div>
        `;
    }

    _renderForm() {
        const isSubmitting = this._status === 'submitting';
        return html`
            <div class="modal-title">Log In</div>
            <div class="modal-subtitle">Enter your email and we'll send you a verification link.</div>
            <form @submit="${this._handleSubmit}">
                <div class="input-group">
                    <label class="label" for="login-email">Email</label>
                    <input
                        id="login-email"
                        class="input"
                        type="email"
                        placeholder="you@example.com"
                        .value="${this._email}"
                        @input="${(e) => this._email = e.target.value}"
                        ?disabled="${isSubmitting}"
                        required
                    />
                </div>
                <button
                    type="submit"
                    class="btn btn-primary login-btn"
                    ?disabled="${isSubmitting || !this._email.trim()}"
                >
                    ${isSubmitting ? 'Sending...' : 'Log In'}
                </button>
            </form>
            ${this._errorMessage ? html`
                <div class="error-message">${this._errorMessage}</div>
            ` : ''}
        `;
    }

    _renderSuccess() {
        return html`
            <div class="success-content">
                <svg class="envelope-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                    <path d="M22 4L12 13L2 4"></path>
                </svg>
                <div class="success-title">Check Your Email</div>
                <div class="success-message">
                    We've sent a verification link to <strong>${this._email}</strong>.
                    Click the link in the email to complete your login.
                </div>
                <button class="btn btn-primary done-btn" @click="${this._close}">Done</button>
            </div>
        `;
    }

    _handleOverlayClick(e) {
        if (e.target === e.currentTarget) {
            this._close();
        }
    }
}

customElements.define('login-modal', LoginModal);
