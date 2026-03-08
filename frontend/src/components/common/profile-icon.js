import { LitElement, html, css } from 'lit';
import { sharedStyles } from '../../styles/shared-styles.js';
import { AuthService } from '../../services/auth-service.js';
import './login-modal.js';

/**
 * A self-contained profile icon component with context menu and login modal.
 * Shows a person icon when logged out, or the first letter of the user's email when logged in.
 *
 * @property {Object|null} user - The current user object { email, userId } or null.
 * @fires user-changed - When user state changes (login submitted or logout). Detail: user | null.
 */
export class ProfileIcon extends LitElement {
    static styles = [
        sharedStyles,
        css`
        :host {
            display: block;
            position: relative;
        }

        /* --- Avatar Button --- */

        .avatar-btn {
            width: 38px;
            height: 38px;
            border-radius: 50%;
            border: 2px solid var(--border-color);
            background: var(--bg-surface);
            color: var(--text-secondary);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            padding: 0;
            font-family: inherit;
            font-size: 1rem;
            font-weight: 600;
        }

        .avatar-btn:hover {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
        }

        .avatar-btn.logged-in {
            background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
            color: white;
            border-color: transparent;
        }

        .avatar-btn.logged-in:hover {
            box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.25);
        }

        .avatar-letter {
            text-transform: uppercase;
            line-height: 1;
        }

        .person-icon {
            width: 20px;
            height: 20px;
        }

        /* --- Context Menu --- */

        .menu-backdrop {
            position: fixed;
            inset: 0;
            z-index: 99;
        }

        .context-menu {
            position: absolute;
            top: calc(100% + 8px);
            right: 0;
            min-width: 200px;
            background: var(--bg-surface);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
            z-index: 100;
            overflow: hidden;
            animation: menuSlideIn 0.15s ease;
        }

        @keyframes menuSlideIn {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .menu-header {
            padding: 12px 16px;
            border-bottom: 1px solid var(--border-color);
        }

        .menu-email {
            font-size: 0.8rem;
            color: var(--text-secondary);
            word-break: break-all;
        }

        .menu-item {
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;
            padding: 12px 16px;
            background: none;
            border: none;
            color: var(--text-primary);
            font-size: 0.9rem;
            font-family: inherit;
            cursor: pointer;
            text-align: left;
            transition: background-color 0.15s;
        }

        .menu-item:hover {
            background: var(--bg-surface-hover);
        }

        .menu-item-icon {
            width: 18px;
            height: 18px;
            color: var(--text-secondary);
        }

        .menu-item.danger {
            color: var(--danger-color);
        }

        .menu-item.danger .menu-item-icon {
            color: var(--danger-color);
        }

        .error-toast {
            padding: 8px 16px;
            font-size: 0.8rem;
            color: var(--danger-color);
            background: rgba(239, 68, 68, 0.08);
            border-top: 1px solid var(--border-color);
        }
    `];

    static properties = {
        user: { type: Object },
        _menuOpen: { state: true },
        _showLoginModal: { state: true },
        _logoutError: { state: true },
    };

    constructor() {
        super();
        this.user = null;
        this._menuOpen = false;
        this._showLoginModal = false;
        this._logoutError = '';
    }

    _toggleMenu() {
        this._menuOpen = !this._menuOpen;
        this._logoutError = '';
    }

    _closeMenu() {
        this._menuOpen = false;
        this._logoutError = '';
    }

    _openLogin() {
        this._menuOpen = false;
        this._showLoginModal = true;
    }

    _handleModalClosed() {
        this._showLoginModal = false;
    }

    _handleLoginSubmitted() {
        // The login was submitted (magic link sent).
        // User won't actually be logged in until they click the email link and revisit.
        // No user-changed event here — that happens after the redirect + /me call.
    }

    async _handleLogout() {
        this._logoutError = '';
        const result = await AuthService.logout();
        if (result.success) {
            this._menuOpen = false;
            this.dispatchEvent(new CustomEvent('user-changed', {
                detail: null,
                bubbles: true,
                composed: true,
            }));
        } else {
            this._logoutError = result.error;
        }
    }

    render() {
        const isLoggedIn = !!this.user;
        return html`
            <button
                class="avatar-btn ${isLoggedIn ? 'logged-in' : ''}"
                @click="${this._toggleMenu}"
                aria-label="Profile menu"
                aria-expanded="${this._menuOpen}"
            >
                ${isLoggedIn
                ? html`<span class="avatar-letter">${this.user.email[0]}</span>`
                : this._renderPersonIcon()}
            </button>

            ${this._menuOpen ? html`
                <div class="menu-backdrop" @click="${this._closeMenu}"></div>
                <div class="context-menu">
                    ${isLoggedIn ? this._renderLoggedInMenu() : this._renderLoggedOutMenu()}
                </div>
            ` : ''}

            <login-modal
                .open="${this._showLoginModal}"
                @modal-closed="${this._handleModalClosed}"
                @login-submitted="${this._handleLoginSubmitted}"
            ></login-modal>
        `;
    }

    _renderLoggedOutMenu() {
        return html`
            <button class="menu-item" @click="${this._openLogin}">
                <svg class="menu-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                    <polyline points="10 17 15 12 10 7"></polyline>
                    <line x1="15" y1="12" x2="3" y2="12"></line>
                </svg>
                Log In
            </button>
        `;
    }

    _renderLoggedInMenu() {
        return html`
            <div class="menu-header">
                <div class="menu-email">${this.user.email}</div>
            </div>
            <button class="menu-item danger" @click="${this._handleLogout}">
                <svg class="menu-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Log Out
            </button>
            ${this._logoutError ? html`
                <div class="error-toast">${this._logoutError}</div>
            ` : ''}
        `;
    }

    _renderPersonIcon() {
        return html`
            <svg class="person-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
            </svg>
        `;
    }
}

customElements.define('profile-icon', ProfileIcon);
