import { LitElement, html, css } from 'lit';
import { TimerLogic } from '../services/timer-logic.js';

export class ActiveSleep extends LitElement {
    static styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: var(--bg-color);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .timer-container {
      text-align: center;
      width: 100%;
      max-width: 400px;
      padding: 20px;
    }

    .main-timer {
      font-size: 5rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      margin: 20px 0;
      color: var(--text-primary);
    }

    .controls {
      display: flex;
      gap: 16px;
      justify-content: center;
      margin-top: 32px;
    }

    .btn-large {
        padding: 16px 32px;
        font-size: 1.2rem;
        border-radius: 50px;
    }
    
    .status-text {
        font-size: 1.2rem;
        color: var(--text-secondary);
        margin-bottom: 8px;
    }
  `;

    static properties = {
        timerState: { type: Object },
        _now: { state: true }
    };

    constructor() {
        super();
        this._now = new Date();
    }

    connectedCallback() {
        super.connectedCallback();
        this._interval = setInterval(() => {
            this._now = new Date();
        }, 1000);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        clearInterval(this._interval);
    }

    _formatValidation(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    _handleFinish() {
        // Calculate final duration logic
        const { total } = TimerLogic.getDisplayValues(this.timerState, this._now);

        // Emit completion
        this.dispatchEvent(new CustomEvent('sleep-completed', {
            detail: {
                startTime: this.timerState.startTime,
                durationMinutes: Math.max(0, Math.round(total / 60))
            },
            bubbles: true,
            composed: true
        }));
    }

    render() {
        if (!this.timerState) return html``;

        const { total } = TimerLogic.getDisplayValues(this.timerState, this._now);

        return html`
      <div class="timer-container">
        <div class="status-text">Baby is sleeping...</div>
        
        <div class="main-timer">
          ${this._formatValidation(total)}
        </div>

        <div class="controls">
          <button class="btn btn-primary btn-large" @click="${this._handleFinish}">
            Wake Up
          </button>
        </div>
      </div>
    `;
    }
}

customElements.define('active-sleep', ActiveSleep);
