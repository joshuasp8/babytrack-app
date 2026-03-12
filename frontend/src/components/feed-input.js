import { LitElement, html, css } from 'lit';
import { Feed } from '../models/feed.js';
import { sharedStyles } from '../styles/shared-styles.js';
import { feedInputStyles } from '../styles/feed-input-styles.js';

export class FeedInput extends LitElement {
  static styles = [sharedStyles, feedInputStyles];

  static properties = {
    feed: { type: Feed },
    _isExpanded: { state: true },
    _showSetupModal: { state: true },
    _startTime: { state: true },
    _type: { type: String },
    _breastSideStartedOn: { type: String },
    _amountOz: { state: true },
    _duration: { state: true },
    _durationLeft: { state: true },
    _durationRight: { state: true },
    _notes: { state: true },
    _showDurationInput: { state: true },
    _showAmountInput: { state: true },
    _showDurationLeftInput: { state: true },
    _showDurationRightInput: { state: true },
    _showNotes: { state: true }
  };

  constructor() {
    super();
    this._resetState();
  }

  updated(changedProperties) {
    if (changedProperties.has('feed') && this.feed) {
      this._setStateFromFeed(this.feed);
    } else if (changedProperties.has('feed') && !this.feed) {
      this._resetState();
    }
  }

  _resetState() {
    /**
     * The feed being edited, if any. Null for a new feed.
     * @type {Feed | null}
     */
    this.feed = null;
    /**
     * ISO 8601 datetime-local string representing the start time of the feed.
     * @type {string}
     */
    this._startTime = '';
    /**
     * Type of feed, can be 'breast', 'bottle', or 'formula'.
     * @type {'breast' | 'bottle' | 'formula'}
     */
    this._type = 'breast';
    /**
     * Breast side started on, can be 'left' or 'right'.
     * @type {'left' | 'right'}
     */
    this._breastSideStartedOn = 'left';
    /**
     * Amount of ounces consumed during the feed.
     * @type {number}
     */
    this._amountOz = 0;
    /**
     * Whether the feed input form is expanded. When false, the form is collapsed.
     * @type {boolean}
     */
    this._isExpanded = false;
    /**
     * Whether the start feed setup modal is visible.
     * @type {boolean}
     */
    this._showSetupModal = false;
    /**
     * Duration is the total duration of the feed in minutes.
     * @type {number}
     */
    this._duration = 15;
    /**
     * Duration left is the duration of the left side of the feed in minutes.
     * @type {number}
     */
    this._durationLeft = 0;
    /**
     * Duration right is the duration of the right side of the feed in minutes.
     * @type {number}
     */
    this._durationRight = 0;
    /**
     * Notes for the feed.
     * @type {string}
     */
    this._notes = '';
    /**
     * Whether the duration input is visible.
     * @type {boolean}
     */
    this._showDurationInput = false;
    /**
     * Whether the amount input is visible.
     * @type {boolean}
     */
    this._showAmountInput = false;
    /**
     * Whether the duration left input is visible.
     * @type {boolean}
     */
    this._showDurationLeftInput = false;
    /**
     * Whether the duration right input is visible.
     * @type {boolean}
     */
    this._showDurationRightInput = false;
    /**
     * Whether the notes input is visible.
     * @type {boolean}
     */
    this._showNotes = false;

    this.requestUpdate();
  }

  /**
   * Populates the form state with the given feed data. This happens on an edit request.
   * @param {Feed} feed 
   */
  _setStateFromFeed(feed) {
    this._isExpanded = true;

    this._setStartTime(feed.startTime);

    this._type = feed.type;
    this._breastSideStartedOn = feed.breastSideStartedOn || 'left';

    this._duration = feed.durationMinutes;
    this._showDurationInput = ![10, 15, 20, 30, 45, 60].includes(feed.durationMinutes);

    this._amountOz = feed.amountOz;
    this._showAmountInput = ![2, 3, 4, 5, 6, 8].includes(feed.amountOz);

    this._durationLeft = feed.durationLeftMinutes;
    this._showDurationLeftInput = ![0, 5, 10, 15, 20, 30].includes(feed.durationLeftMinutes);

    this._durationRight = feed.durationRightMinutes;
    this._showDurationRightInput = ![0, 5, 10, 15, 20, 30].includes(feed.durationRightMinutes);

    this._notes = feed.notes || '';
    this._showNotes = !!feed.notes;
  }

  _setStartTime(startTime) {
    // Adjust from feed ISO string back to local datetime-local format
    const date = new Date(startTime);
    const localIsoString = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
      .toISOString().slice(0, 16);
    this._startTime = localIsoString;
  }

  /**
   * Handles the save action of the feed input form.
   * Performs a create/update of a Feed based on the current internal state.
   * @param {*} e 
   */
  _handleSubmit(e) {
    e.preventDefault();

    const durationLeftMinutes = this._type === 'breast' ? this._durationLeft : 0;
    const durationRightMinutes = this._type === 'breast' ? this._durationRight : 0;
    const durationMinutes = this._type === 'breast' ? durationLeftMinutes + durationRightMinutes : this._duration;

    let feedData = {
      startTime: new Date(this._startTime),
      durationMinutes: durationMinutes,
      durationLeftMinutes: durationLeftMinutes,
      durationRightMinutes: durationRightMinutes,
      amountOz: this._type !== 'breast' ? this._amountOz : 0,
      type: this._type,
      breastSideStartedOn: this._type === 'breast' ? this._breastSideStartedOn : null,
      notes: this._notes
    };

    // if feed exists then this is an update, retain the id
    if (this.feed) {
      feedData = { ...feedData, id: this.feed.id }
    }

    this.dispatchEvent(new CustomEvent(this.feed ? 'feed-updated' : 'feed-added', {
      detail: { feed: new Feed(feedData) },
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
    // Return collapsed state if not expanded and not in setup modal
    if (!this._isExpanded && !this._showSetupModal) {
      return this._renderCollapsedState();
    }

    if (this._showSetupModal) {
      return this._renderSetupModal();
    }

    // Otherwise, return expanded editor
    return html`
      <div class="card feed-editor">
        ${this._renderEditorHeader()}
        <form @submit="${(e) => this._handleSubmit(e)}">
          ${this._renderTimeInput()}
          ${this._renderTypeSelector()}
          ${this._type !== 'breast' ? this._renderAmountInput() : ''}
          ${this._type === 'breast' ? this._renderBreastDurationInput() : this._renderDurationInput()}
          ${this._renderNotesSection()}
          ${this._renderFormSubmitSection()}
        </form>
      </div>
    `;
  }

  // Setup Modal
  _renderSetupModal() {
    return html`
    <div class="card feed-editor">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3>Start Feeding Session</h3>
        <button class="btn-icon" style="color: var(--text-secondary); background: none; border: none; cursor: pointer;" 
                @click="${() => this._showSetupModal = false}" title="Close">
          ${this._renderCloseIcon()}
        </button>
      </div>

      <form @submit="${(e) => this._handleStartTiming(e)}">
         ${this._renderTypeSelector()}
         ${this._type !== 'breast' ? this._renderAmountInput('Target Amount', true) : ''}
         
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
    this.dispatchEvent(new CustomEvent('start-active-feed', {
      detail: {
        type: this._type,
        startSide: this._type === 'breast' ? this._breastSideStartedOn : null,
        amountOz: this._type !== 'breast' ? this._amountOz : 0
      },
      bubbles: true,
      composed: true
    }));
    this._showSetupModal = false;
    this._resetState(); // Reset inputs for next time
  }

  // Collapsed state
  _renderCollapsedState() {
    return html`
        <div style="display: flex; gap: 12px; margin-bottom: 12px;">
           <button class="btn btn-cta" style="flex: 1; min-height: 48px; border: none;" 
              @click="${() => this._showSetupModal = true}">
            ▶ Start Feed
          </button>
        </div>
        <button class="btn btn-primary" style="width: 100%; margin-bottom: 24px;" @click="${() => this._isExpanded = true}">
          <span style="font-size: 1.2rem; font-weight: 600;">+</span> Log Previous Feed
        </button>
      `;
  }

  // Editor Header
  _renderEditorHeader() {
    return html`
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h3>${this.feed ? 'Edit Feeding Session' : 'Log Feeding Session'}</h3>
      <button class="btn-icon" style="color: var(--text-secondary); background: none; border: none; cursor: pointer;" 
              @click="${this.feed ? this._cancelEdit.bind(this) : () => this._isExpanded = false}" title="Close">
        ${this._renderCloseIcon()}
      </button>
    </div>
    `;
  }

  // Close Icon (X)
  _renderCloseIcon() {
    return html`
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
    `;
  }

  // Start Time Input
  _renderTimeInput() {
    if (!this._startTime) {
      // default to current time
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

  // Type Selector (Breast, Bottle, Formula)
  _renderTypeSelector() {
    return html`
    <div class="row">
      <div class="input-group">
        <label class="label">Type</label>
        <div class="segmented-control">
          ${['breast', 'bottle', 'formula'].map(t => html`
            <button type="button" 
              class="btn-segment ${this._type === t ? 'active' : ''}" 
              @click="${() => this._type = t}">
              ${t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          `)}
        </div>
      </div>

      ${this._type === 'breast' ? this._renderBreastStartingSideSelector() : ''} 
    </div>
    `;
  }

  // Breast Starting Side Selector (Left/Right)
  _renderBreastStartingSideSelector() {
    return html`
    <div class="input-group">
      <label class="label">Starting Side</label>
      <div class="radio-group">
        <label class="radio-label">
          <input type="radio" name="breastSideStartedOn" value="left" 
            ?checked="${this._breastSideStartedOn === 'left'}"
            @change="${() => this._breastSideStartedOn = 'left'}">
          <span>Left</span>
        </label>
        <label class="radio-label">
          <input type="radio" name="breastSideStartedOn" value="right"
            ?checked="${this._breastSideStartedOn === 'right'}"
            @change="${() => this._breastSideStartedOn = 'right'}">
          <span>Right</span>
        </label>
      </div>
    </div>`;
  }

  // Amount Input (for bottle and formula)
  _renderAmountInput(label = 'Amount', isModal = false) {
    // In modal we don't need custom input toggle logic usually, but let's reuse it consistently.
    return html`
    <div class="input-group">
      <label class="label" for="amountOz">${label}</label>
              
      <div class="duration-row">
        <!-- Quick Amount Buttons -->
        ${!this._showAmountInput ? html`
          <div class="quick-buttons">
            ${[2, 3, 4, 5, 6, 8].map(oz => html`
              <button type="button" 
                class="btn-chip ${this._amountOz == oz ? 'active' : ''}" 
                @click="${() => { this._amountOz = oz; }}">
                ${oz}oz
              </button>
            `)}
            <button type="button" 
              class="btn-chip ${this._showAmountInput ? 'active' : ''}" 
              @click="${() => this._showAmountInput = true}">
              Custom
            </button>
          </div>
        ` : ''}

        <!-- Input Field (Secondary) -->
        ${this._showAmountInput ? html`
          <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
            <input class="input input-small" type="number" id="amountOz" step="0.5" 
              .value="${this._amountOz}" 
              @input="${(e) => this._amountOz = parseFloat(e.target.value)}"
              min="0" max="20" required>
            <span class="label" style="font-weight: 400; font-size: 0.9em;">oz</span>
            <button type="button" class="btn-text cancel-btn" style="font-size: 0.8rem; margin-left: auto;" @click="${() => this._showAmountInput = false}">Cancel</button>
          </div>
        ` : ''}
      </div>
    </div>
    `;
  }

  // Standard Duration Input (for bottle and formula)
  _renderDurationInput() {
    return html`
    <div class="input-group">
      <label class="label" for="durationMinutes">Duration</label>
              
      <div class="duration-row">
        <!-- Quick Duration Buttons -->
        ${!this._showDurationInput ? html`
          <div class="quick-buttons">
            ${[10, 15, 20, 30, 45, 60].map(mins => html`
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

  _renderBreastDurationInput() {
    return html`
      <div class="input-group">
        <label class="label" for="durationLeftMinutes">Duration Left</label>
              
        <div class="duration-row">
          <!-- Quick Duration Buttons -->
          ${!this._showDurationLeftInput ? html`
            <div class="quick-buttons">
              ${[0, 5, 10, 15, 20, 30].map(mins => html`
                <button type="button" 
                  class="btn-chip ${this._durationLeft == mins ? 'active' : ''}" 
                  @click="${() => { this._durationLeft = mins; }}">
                  ${mins}m
                </button>
              `)}
              <button type="button" 
                class="btn-chip ${this._showDurationLeftInput ? 'active' : ''}" 
                @click="${() => this._showDurationLeftInput = true}">
                Custom
              </button>
            </div>
          ` : ''}

          <!-- Input Field (Secondary) -->
          ${this._showDurationLeftInput ? html`
            <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
              <input class="input input-small" type="number" id="durationLeftMinutes" 
                .value="${this._durationLeft}" 
                @input="${(e) => this._durationLeft = parseInt(e.target.value)}"
                min="0" required>
              <span class="label" style="font-weight: 400; font-size: 0.9em;">min</span>
              <button type="button" class="btn-text cancel-btn" style="font-size: 0.8rem; margin-left: auto;" @click="${() => this._showDurationLeftInput = false}">Cancel</button>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Duration Right Section -->
      <div class="input-group">
        <label class="label" for="durationRightMinutes">Duration Right</label>
              
        <div class="duration-row">
          <!-- Quick Duration Buttons -->
          ${!this._showDurationRightInput ? html`
            <div class="quick-buttons">
              ${[0, 5, 10, 15, 20, 30].map(mins => html`
                <button type="button" 
                  class="btn-chip ${this._durationRight == mins ? 'active' : ''}" 
                  @click="${() => { this._durationRight = mins; }}">
                  ${mins}m
                </button>
              `)}
              <button type="button" 
                class="btn-chip ${this._showDurationRightInput ? 'active' : ''}" 
                @click="${() => this._showDurationRightInput = true}">
                Custom
              </button>
            </div>
          ` : ''}

          <!-- Input Field (Secondary) -->
          ${this._showDurationRightInput ? html`
            <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
              <input class="input input-small" type="number" id="durationRightMinutes" 
                .value="${this._durationRight}" 
                @input="${(e) => this._durationRight = parseInt(e.target.value)}"
                min="0" required>
              <span class="label" style="font-weight: 400; font-size: 0.9em;">min</span>
              <button type="button" class="btn-text cancel-btn" style="font-size: 0.8rem; margin-left: auto;" @click="${() => this._showDurationRightInput = false}">Cancel</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  _renderNotesSection() {
    // render collapsed state if _showNotes is false
    if (!this._showNotes) {
      return html`
      <div class="notes-section">
        <button type="button" class="btn-text" @click="${() => this._showNotes = true}">
          + Add Note
        </button>
      </div>
      `;
    }

    // otherwise render expanded state
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
        ${this.feed ? 'Update Feed' : 'Save Feed'}
      </button>
    </div>
    `;
  }
}

customElements.define('feed-input', FeedInput);
