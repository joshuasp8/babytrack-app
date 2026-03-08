import { LitElement, html, css } from 'lit';
import { Sleep } from '../models/sleep.js';
import { sharedStyles } from '../styles/shared-styles.js';
import { feedInputStyles } from '../styles/feed-input-styles.js'; // Reusing feed styles for now

export class SleepInput extends LitElement {
    static styles = [sharedStyles, feedInputStyles];

    static properties = {
        sleep: { type: Sleep },
        _isExpanded: { state: true },
        _showSetupModal: { state: true },
        _startTime: { state: true },
        _duration: { state: true },
        _notes: { state: true },
        _showDurationInput: { state: true },
        _showNotes: { state: true }
    };

    constructor() {
        super();
        this._resetState();
    }

    updated(changedProperties) {
        if (changedProperties.has('sleep') && this.sleep) {
            this._setStateFromSleep(this.sleep);
        } else if (changedProperties.has('sleep') && !this.sleep) {
            this._resetState();
        }
    }

    _resetState() {
        this.sleep = null;
        this._startTime = '';
        this._isExpanded = false;
        this._showSetupModal = false;
        this._duration = 30; // Default sleep duration
        this._notes = '';
        this._showDurationInput = false;
        this._showNotes = false;
        this.requestUpdate();
    }

    _setStateFromSleep(sleep) {
        this._isExpanded = true;
        this._setStartTime(sleep.startTime);
        this._duration = sleep.durationMinutes;
        this._showDurationInput = ![15, 30, 45, 60, 90, 120].includes(sleep.durationMinutes);
        this._notes = sleep.notes || '';
        this._showNotes = !!sleep.notes;
    }

    _setStartTime(startTime) {
        const date = new Date(startTime);
        const localIsoString = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
            .toISOString().slice(0, 16);
        this._startTime = localIsoString;
    }

    _handleSubmit(e) {
        e.preventDefault();

        let sleepData = {
            startTime: new Date(this._startTime),
            durationMinutes: this._duration,
            notes: this._notes
        };

        if (this.sleep) {
            sleepData = { ...sleepData, id: this.sleep.id };
        }

        this.dispatchEvent(new CustomEvent(this.sleep ? 'sleep-updated' : 'sleep-added', {
            detail: { sleep: new Sleep(sleepData) },
            bubbles: true,
            composed: true
        }));

        this._resetState();
    }

    _cancelEdit() {
        this._resetState();
        this.dispatchEvent(new CustomEvent('edit-cancelled', {
            bubbles: true,
            composed: true
        }));
    }

    render() {
        if (!this._isExpanded && !this._showSetupModal) {
            return this._renderCollapsedState();
        }

        if (this._showSetupModal) {
            return this._renderSetupModal();
        }

        return html`
      <div class="card feed-editor">
        ${this._renderEditorHeader()}
        <form @submit="${(e) => this._handleSubmit(e)}">
          ${this._renderTimeInput()}
          ${this._renderDurationInput()}
          ${this._renderNotesSection()}
          ${this._renderFormSubmitSection()}
        </form>
      </div>
    `;
    }

    _renderSetupModal() {
        return html`
    <div class="card feed-editor">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3>Start Sleep Session</h3>
        <button class="btn-icon" style="color: var(--text-secondary); background: none; border: none; cursor: pointer;" 
                @click="${() => this._showSetupModal = false}" title="Close">
          ${this._renderCloseIcon()}
        </button>
      </div>

      <form @submit="${(e) => this._handleStartTiming(e)}">
         <div class="form-actions" style="margin-top: 24px;">
            <button type="submit" class="btn btn-cta" style="width: 100%; font-size: 1.2rem; min-height: 48px;">
              ▶ Start Timing
            </button>
         </div>
      </form>
    </div>
    `;
    }

    _handleStartTiming(e) {
        e.preventDefault();
        this.dispatchEvent(new CustomEvent('start-active-sleep', {
            bubbles: true,
            composed: true
        }));
        this._showSetupModal = false;
        this._resetState();
    }

    _renderCollapsedState() {
        return html`
        <div style="display: flex; gap: 12px; margin-bottom: 12px;">
           <button class="btn btn-cta" style="flex: 1; min-height: 48px; border: none;" 
              @click="${() => this._showSetupModal = true}">
            ▶ Start Sleep
          </button>
        </div>
        <button class="btn btn-primary" style="width: 100%; margin-bottom: 24px;" @click="${() => this._isExpanded = true}">
          <span style="font-size: 1.2rem; font-weight: 600;">+</span> Log Previous Sleep
        </button>
      `;
    }

    _renderEditorHeader() {
        return html`
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h3>${this.sleep ? 'Edit Sleep Session' : 'Log Sleep Session'}</h3>
      <button class="btn-icon" style="color: var(--text-secondary); background: none; border: none; cursor: pointer;" 
              @click="${this.sleep ? this._cancelEdit.bind(this) : () => this._isExpanded = false}" title="Close">
        ${this._renderCloseIcon()}
      </button>
    </div>
    `;
    }

    _renderCloseIcon() {
        return html`
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
    `;
    }

    _renderTimeInput() {
        if (!this._startTime) {
            const now = new Date();
            this._startTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000))
                .toISOString().slice(0, 16);
        }

        return html`
    <div class="input-group">
      <label class="label" for="startTime">Start Time</label>
      <div style="display: flex; margin-top: 8px; align-items: center; gap: 8px;">
        <input class="input" type="datetime-local" id="startTime" name="startTime" required
        .value="${this._startTime}"
        @change="${(e) => this._setStartTime(e.target.value)}"/>
      </div>
    </div>
    `;
    }

    _renderDurationInput() {
        return html`
    <div class="input-group">
      <label class="label" for="durationMinutes">Duration</label>
              
      <div class="duration-row">
        <!-- Quick Duration Buttons -->
        ${!this._showDurationInput ? html`
          <div class="quick-buttons">
            ${[15, 30, 45, 60, 90, 120].map(mins => html`
              <button type="button" 
                class="btn-chip ${this._duration == mins ? 'active' : ''}" 
                @click="${() => { this._duration = mins; }}">
                ${mins}m
              </button>
            `)}
            <button type="button" 
              class="btn-chip ${this._showDurationInput ? 'active' : ''}" 
              @click="${() => this._showDurationInput = true}">
              Custom
            </button>
          </div>
        ` : ''}

        <!-- Input Field (Secondary) -->
        ${this._showDurationInput ? html`
          <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
            <input class="input input-small" type="number" id="durationMinutes" 
              .value="${this._duration}" 
              @input="${(e) => this._duration = parseInt(e.target.value)}"
              min="1" required>
            <span class="label" style="font-weight: 400; font-size: 0.9em;">min</span>
            <button type="button" class="btn-text cancel-btn" style="font-size: 0.8rem; margin-left: auto;" @click="${() => this._showDurationInput = false}">Cancel</button>
          </div>
        ` : ''}
      </div>
    </div>
    `;
    }

    _renderNotesSection() {
        if (!this._showNotes) {
            return html`
      <div class="notes-section">
        <button type="button" class="btn-text" @click="${() => this._showNotes = true}">
          + Add Note
        </button>
      </div>
      `;
        }

        return html`
    <div class="notes-section">
      <div class="input-group">
        <label class="label" for="notes">Notes</label>
        <textarea class="textarea" id="notes" name="notes" rows="2" placeholder="Add details..."
        .value="${this._notes}" @input="${(e) => this._notes = e.target.value}"></textarea>
      </div>
    </div>
    `;
    }

    _renderFormSubmitSection() {
        return html`
    <div class="form-actions" style="gap: 12px;">
      <button type="submit" class="btn btn-primary btn-save">
        ${this.sleep ? 'Update Sleep' : 'Save Sleep'}
      </button>
    </div>
    `;
    }
}

customElements.define('sleep-input', SleepInput);
