import { LitElement, html, css } from 'lit';
import { sharedStyles } from '../styles/shared-styles.js';
import { TimerLogic } from '../services/timer-logic.js';

export class ActiveFeed extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
        text-align: center;
        padding-top: 2rem;
      }

      .timer-display {
        font-size: 3.5rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        color: var(--text-primary);
        margin: 1rem 0;
        line-height: 1;
      }

      .status-text {
        color: var(--text-secondary);
        font-size: 1.2rem;
        font-weight: 500;
        margin-bottom: 0.5rem;
      }

      .controls {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin: 3rem 0;
        align-items: center;
      }

      .control-row {
        display: flex;
        gap: 16px;
        width: 100%;
        justify-content: center;
      }

      .btn-large {
        padding: 16px 32px;
        font-size: 1.2rem;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        flex: 1;
        max-width: 240px;
      }

      .btn-pause {
        background-color: var(--bg-surface-2);
        color: var(--text-primary);
      }
      
      .btn-resume {
        background-color: var(--primary-color);
        color: white;
      }

      .btn-switch {
        background-color: var(--accent-color-dark);
        color: white;
      }

      .end-section {
        margin-top: auto;
        padding-top: 2rem;
        border-top: 1px solid var(--border-color);
        display: flex;
        width: 100%;
        justify-content: center;
      }

      .btn-end {
        background-color: #ef4444; /* Red-500 */
        color: white;
        width: 100%;
        max-width: 300px;
      }
    `
  ];

  static properties = {
    // The single source of truth for timer state
    timerState: { type: Object }
  };

  constructor() {
    super();
    this.timerState = null;
    this._refreshInterval = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this._startRefreshLoop();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopRefreshLoop();
  }

  _startRefreshLoop() {
    if (this._refreshInterval) return;
    // Just force a re-render every second to update the display time
    this._refreshInterval = setInterval(() => {
      this.requestUpdate();
    }, 1000);
  }

  _stopRefreshLoop() {
    if (this._refreshInterval) {
      clearInterval(this._refreshInterval);
      this._refreshInterval = null;
    }
  }

  _togglePause() {
    if (!this.timerState) return;

    if (this.timerState.lastResumeTime) {
      this.timerState = TimerLogic.pause(this.timerState);
    } else {
      this.timerState = TimerLogic.resume(this.timerState);
    }
    this._notifyStateChange();
  }

  _switchSide() {
    if (!this.timerState) return;
    const newSide = this.timerState.currentSide === 'left' ? 'right' : 'left';
    this.timerState = TimerLogic.switchSide(this.timerState, newSide);
    this._notifyStateChange();
  }

  _notifyStateChange() {
    this.dispatchEvent(new CustomEvent('active-feed-updated', {
      detail: this.timerState,
      bubbles: true,
      composed: true
    }));
  }

  _formatTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  _handleEndFeed() {
    if (confirm('End feeding session?')) {
      // Calculate final values one last time
      const finalDisplay = TimerLogic.getDisplayValues(this.timerState);

      const feedData = {
        startTime: this.timerState.startTime,
        durationMinutes: Math.round(finalDisplay.total / 60),
        durationLeftMinutes: Math.round(finalDisplay.left / 60),
        durationRightMinutes: Math.round(finalDisplay.right / 60),
        amountOz: this.timerState.amountOz || 0,
        type: this.timerState.type,
        // Use the explicit startSide we now track, falling back to currentSide for legacy/safety
        breastSideStartedOn: this.timerState.startSide || this.timerState.currentSide
      };

      this.dispatchEvent(new CustomEvent('feed-completed', {
        detail: feedData,
        bubbles: true,
        composed: true
      }));
    }
  }

  _renderBreastFeedTimers(displayValues) {
    const currentSide = this.timerState.currentSide;
    const currentSideTime = currentSide === 'left' ? displayValues.left : displayValues.right;
    const otherSideTime = currentSide === 'left' ? displayValues.right : displayValues.left;
    const otherSideName = currentSide === 'left' ? 'Right' : 'Left';

    return html`
      <div class="timer-display">
        ${this._formatTime(currentSideTime)}
      </div>
      
      <div class="status-text" style="color: var(--primary-color); margin-bottom: 24px;">
        Current Side: ${currentSide === 'left' ? 'Left' : 'Right'}
      </div>

      <div class="status-text" style="opacity: 0.8; font-size: 1rem;">
        ${otherSideName} side total: ${this._formatTime(otherSideTime)}
      </div>
    `;
  }

  render() {
    if (!this.timerState) return html``;

    const display = TimerLogic.getDisplayValues(this.timerState);
    const isPaused = display.isPaused;

    return html`
      <div class="status-text">
        ${isPaused ? 'Paused' : 'Feeding in progress'}
      </div>
      
      ${this.timerState.type === 'breast' ? this._renderBreastFeedTimers(display) : html`
        <div class="timer-display">
          ${this._formatTime(display.total)}
        </div>
      `}

      <div class="controls">
        <div class="control-row">
          <button class="btn btn-large ${isPaused ? 'btn-resume' : 'btn-pause'}" @click="${this._togglePause}">
            ${isPaused ? '▶ Resume' : '⏸ Pause'}
          </button>
        </div>

        ${this.timerState.type === 'breast' ? html`
          <div class="control-row">
            <button class="btn btn-large btn-switch" @click="${this._switchSide}">
              Switch to ${this.timerState.currentSide === 'left' ? 'Right' : 'Left'}
            </button>
          </div>
        ` : ''}
      </div>

      <div class="end-section">
        <button class="btn btn-large btn-end" @click="${this._handleEndFeed}">
          Finish Feed
        </button>
      </div>
    `;
  }
}

customElements.define('active-feed', ActiveFeed);
