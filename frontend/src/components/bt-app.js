import { LitElement, html, css } from 'lit';
import { FeedService } from '../services/feed-service.js';
import { SleepService } from '../services/sleep-service.js';
import { TimerLogic } from '../services/timer-logic.js';
import { Feed } from '../models/feed.js';
import { Sleep } from '../models/sleep.js';
import { sharedStyles } from '../styles/shared-styles.js';
import './feed-input.js';
import './feed-list.js';
import './active-feed.js';
import './sleep-input.js';
import './sleep-list.js';
import './active-sleep.js';
import './common/icons.js';
import './common/profile-icon.js';
import './common/sync-toast.js';
import { AuthService } from '../services/auth-service.js';

export class BtApp extends LitElement {
  static styles = [
    sharedStyles,
    css`
    :host {
      display: block;
      max-width: 600px;
      margin: 0 auto;
      padding: 0 20px 20px;
    }

    .app-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 60px;
      padding: 0 20px;
      margin: 0 -20px 20px;
      background: var(--card-bg);
      border-bottom: 1px solid var(--border-color);
    }

    .app-bar-title {
      font-size: 1.35rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.01em;
    }

    header {
      margin-bottom: 24px;
      text-align: center;
    }

    h1 {
      font-size: 2rem;
      background: linear-gradient(to right, var(--primary-color), var(--accent-color));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
      width: fit-content;
      margin-left: auto;
      margin-right: auto;
    }

    .tabs {
      display: flex;
      justify-content: center;
      margin-bottom: 24px;
      background-color: var(--card-bg);
      padding: 4px;
      border-radius: 50px;
      width: fit-content;
      margin-left: auto;
      margin-right: auto;
      border: 1px solid var(--border-color);
    }

    .tab-btn {
      padding: 8px 24px;
      border-radius: 50px;
      background: none;
      border: none;
      color: var(--text-secondary);
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .tab-btn.active {
      background-color: var(--primary-color);
      color: white;
    }
  `];

  static properties = {
    _view: { state: true }, // 'feed' | 'sleep'
    _feeds: { state: true },
    _sleeps: { state: true },
    _editingFeed: { state: true },
    _editingSleep: { state: true },
    _activeFeed: { state: true },
    _activeSleep: { state: true },
    _loading: { state: true },
    _user: { state: true },
  };

  constructor() {
    super();
    this._view = 'feed';
    this._feeds = [];
    this._sleeps = [];
    this._editingFeed = null;
    this._editingSleep = null;
    this._activeFeed = null;
    this._activeSleep = null;
    this._loading = true;
    this._user = AuthService.getCachedUser();
  }

  connectedCallback() {
    super.connectedCallback();

    // Check for active feed in localStorage
    const storedActiveFeed = localStorage.getItem('bt-active-feed');
    if (storedActiveFeed) {
      const parsed = JSON.parse(storedActiveFeed);
      this._activeFeed = TimerLogic.migrate(parsed);
    }

    // Check for active sleep in localStorage
    const storedActiveSleep = localStorage.getItem('bt-active-sleep');
    if (storedActiveSleep) {
      this._activeSleep = JSON.parse(storedActiveSleep);
    }

    // Fetch profile from auth server (updates cache + state) then load feeds
    this._fetchUserProfile();
    this._loadSleeps();
  }

  async _loadFeeds() {
    this._loading = true;
    try {
      this._feeds = await FeedService.getAll();
    } finally {
      this._loading = false;
    }
  }

  async _loadSleeps() {
    this._loading = true;
    try {
      this._sleeps = await SleepService.getAll();
    } finally {
      this._loading = false;
    }
  }

  // --- Auth ---

  async _fetchUserProfile() {
    let currUser = this._user;
    this._loading = true;
    try {
      currUser = await AuthService.fetchProfile();
    } finally {
      this._loading = false;
    }
    if (currUser) {
      // Attempt to migrate local data to server and switch to server mode.
      this._loading = true;
      const result = await FeedService.importAndSwitchToServer();
      this._loading = false;
      if (!result.success) {
        window.dispatchEvent(new CustomEvent('sync-error', {
          detail: { message: result.message }
        }));
      } else {
        // successfully logged in and switched to server mode
        this._user = currUser;
      }
    }
    // Reload feeds from whichever source is now active.
    await this._loadFeeds();
  }

  async _handleUserChanged(e) {
    this._user = e.detail;
    if (!e.detail) {
      // Logged out — revert to local-only mode.
      FeedService.switchToLocal();
    }
    await this._loadFeeds();
  }

  // --- Feed Handlers ---

  async _handleFeedAdded(e) {
    this._loading = true;
    try {
      await FeedService.add(e.detail.feed);
      await this._loadFeeds();
    } finally {
      this._loading = false;
    }
  }

  async _handleFeedDeleted(e) {
    this._loading = true;
    try {
      await FeedService.delete(e.detail.id);
      await this._loadFeeds();
    } finally {
      this._loading = false;
    }
  }

  _handleFeedEditRequest(e) {
    this._editingFeed = e.detail.feed;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async _handleFeedUpdated(e) {
    this._loading = true;
    try {
      await FeedService.update(e.detail.feed);
      await this._loadFeeds();
      this._editingFeed = null;
    } finally {
      this._loading = false;
    }
  }

  _handleEditCancelled() {
    this._editingFeed = null;
    this._editingSleep = null;
  }

  _handleStartActiveFeed(e) {
    const { type, startSide } = e.detail;
    this._activeFeed = TimerLogic.start(type, startSide, new Date());
    this._persistActiveFeed();
  }

  _handleActiveFeedUpdated(e) {
    this._activeFeed = e.detail;
    this._persistActiveFeed();
  }

  async _handleFeedCompleted(e) {
    const feedData = e.detail;
    const newFeed = new Feed({
      startTime: new Date(feedData.startTime),
      durationMinutes: feedData.durationMinutes,
      durationLeftMinutes: feedData.durationLeftMinutes,
      durationRightMinutes: feedData.durationRightMinutes,
      type: feedData.type,
      breastSideStartedOn: feedData.breastSideStartedOn,
      notes: ''
    });

    this._loading = true;
    try {
      await FeedService.add(newFeed);
      await this._loadFeeds();

      this._activeFeed = null;
      localStorage.removeItem('bt-active-feed');
    } finally {
      this._loading = false;
    }
  }

  _persistActiveFeed() {
    localStorage.setItem('bt-active-feed', JSON.stringify(this._activeFeed));
  }

  // --- Sleep Handlers ---

  async _handleSleepAdded(e) {
    this._loading = true;
    try {
      await SleepService.add(e.detail.sleep);
      await this._loadSleeps();
    } finally {
      this._loading = false;
    }
  }

  async _handleSleepUpdated(e) {
    this._loading = true;
    try {
      await SleepService.update(e.detail.sleep);
      await this._loadSleeps();
      this._editingSleep = null;
    } finally {
      this._loading = false;
    }
  }

  async _handleSleepDeleted(e) {
    this._loading = true;
    try {
      await SleepService.delete(e.detail.id);
      await this._loadSleeps();
    } finally {
      this._loading = false;
    }
  }

  _handleSleepEditRequest(e) {
    this._editingSleep = e.detail.sleep;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  _handleStartActiveSleep() {
    this._activeSleep = TimerLogic.start('sleep', null, new Date());
    this._persistActiveSleep();
  }

  // We reuse TimerLogic for sleep duration tracking, treating it as a single interval
  // The 'active-sleep' component drives the visual timer using TimerLogic.getDisplayValues
  // but doesn't necessarily need an update loop back to app unless we add pause/resume later.
  // For now, simple start -> finish.

  async _handleSleepCompleted(e) {
    const sleepData = e.detail;
    const newSleep = new Sleep({
      startTime: new Date(sleepData.startTime),
      durationMinutes: sleepData.durationMinutes,
      notes: ''
    });

    this._loading = true;
    try {
      await SleepService.add(newSleep);
      await this._loadSleeps();

      this._activeSleep = null;
      localStorage.removeItem('bt-active-sleep');
    } finally {
      this._loading = false;
    }
  }

  _persistActiveSleep() {
    localStorage.setItem('bt-active-sleep', JSON.stringify(this._activeSleep));
  }

  // --- Rendering ---

  _renderLoader() {
    return html`
      <div class="loader-container">
        <div class="spinner"></div>
        <p>Syncing...</p>
      </div>
    `;
  }

  render() {
    // Active modes take precedence
    if (this._activeFeed) {
      return this._renderActiveFeedMode();
    }
    if (this._activeSleep) {
      return this._renderActiveSleepMode();
    }

    return html`
      <div class="app-bar">
        <div class="app-bar-title">BabyTrack</div>
        <profile-icon
          .user="${this._user}"
          @user-changed="${this._handleUserChanged}"
        ></profile-icon>
      </div>
      
      <nav class="tabs">
        <button class="tab-btn ${this._view === 'feed' ? 'active' : ''}" 
          @click="${() => this._view = 'feed'}">Feed</button>
        <button class="tab-btn ${this._view === 'sleep' ? 'active' : ''}" 
          @click="${() => this._view = 'sleep'}">Sleep</button>
      </nav>

      <main>
        ${this._loading ? this._renderLoader() : (
        this._view === 'feed' ? this._renderFeedView() : this._renderSleepView()
      )}
      </main>

      <sync-toast></sync-toast>
    `;
  }

  _renderActiveFeedMode() {
    return html`
      <header><h1>BabyTrack</h1></header>
      <main>
        <active-feed
           .timerState="${this._activeFeed}"
           @active-feed-updated="${this._handleActiveFeedUpdated}"
           @feed-completed="${this._handleFeedCompleted}"
        ></active-feed>
      </main>
    `;
  }

  _renderActiveSleepMode() {
    return html`
      <header><h1>BabyTrack</h1></header>
      <main>
        <active-sleep
           .timerState="${this._activeSleep}"
           @sleep-completed="${this._handleSleepCompleted}"
        ></active-sleep>
      </main>
    `;
  }

  _renderFeedView() {
    console.log('bt-app.js: rendering feed view with feeds:', this._feeds);
    return html`
      <feed-input 
          .feed="${this._editingFeed}"
          @feed-added="${this._handleFeedAdded}"
          @feed-updated="${this._handleFeedUpdated}"
          @edit-cancelled="${this._handleEditCancelled}"
          @start-active-feed="${this._handleStartActiveFeed}"
      ></feed-input>
      
      <h3 style="margin: 32px 0 16px 0; color: var(--text-primary);">Feed History</h3>
      <feed-list 
          .feeds="${this._feeds}"
          @feed-deleted="${this._handleFeedDeleted}"
          @feed-edited="${this._handleFeedEditRequest}"
      ></feed-list>
    `;
  }

  _renderSleepView() {
    return html`
      <sleep-input 
          .sleep="${this._editingSleep}"
          @sleep-added="${this._handleSleepAdded}"
          @sleep-updated="${this._handleSleepUpdated}"
          @edit-cancelled="${this._handleEditCancelled}"
          @start-active-sleep="${this._handleStartActiveSleep}"
      ></sleep-input>
      
      <h3 style="margin: 32px 0 16px 0; color: var(--text-primary);">Sleep History</h3>
      <sleep-list 
          .sleeps="${this._sleeps}"
          @sleep-deleted="${this._handleSleepDeleted}"
          @sleep-edited="${this._handleSleepEditRequest}"
      ></sleep-list>
    `;
  }
}

customElements.define('bt-app', BtApp);
