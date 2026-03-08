# BabyTrack 🍼

A specialized infant stats tracker built with modern web standards. Focuses on speed, intuitive design, and a premium dark-mode aesthetic.

## Features

-   **Feed Tracking**: Log breast, bottle, or formula feeds.
    -   **Smart Inputs**: Quick "Now" or "X mins ago" buttons for start time.
    -   **Progressive Disclosure**: Detailed input fields (like custom time or duration) are hidden by default to keep the UI clean.
    -   **Quick Durations**: Preset duration buttons (10m, 15m, etc.) with manual override.
    -   **Streamlined Controls**: Segmented buttons for feed type selection (Breast/Bottle/Formula).
-   **Sleep Tracking**: Monitor sleep sessions with ease.
    -   **Live Timer**: Track sleep in real-time with a dedicated wake-up action.
    -   **Daily Totals**: History headers automatically calculate and display total sleep duration for each day.
    -   **Quick Logs**: Log previous sleep sessions with preset duration chips.
-   **Tabbed Navigation**: Seamlessly switch between Feed and Sleep tracking modes via a native-feeling tab bar.
-   **Live Feed Tracking**: Real-time timer for active feeding sessions.
    -   **Smart Side Tracking**: For breastfeeding, tracks time per side independently and pauses automatically when switching.
    -   **Robust Persistence**: Sessions ensure timer accuracy even if the tab is closed, the browser sleeps, or the device restarts.
    -   **Focus Mode**: A dedicated "in-progress" view minimizes distractions during the feed.
-   **History**: View a chronological list of recent feeds with details and notes.
-   **Edit Capabilities**: Fix mistakes by editing previous entries (change duration, notes, etc.).
-   **Profile & Authentication**: Optional user accounts with magic link login.
    -   **Self-Contained Components**: Reusable `<profile-icon>` and `<login-modal>` components that can be dropped into any app.
    -   **Magic Link Flow**: Email-only authentication with verification links (no passwords).
    -   **Cross-Domain Cookies**: Supports authentication across different domains using `credentials: 'include'`.
-   **Persistence**: Logged-out users store data in the browser's localStorage. On first login, local data is automatically imported to the server and localStorage is cleared. Logged-in users read and write directly against the backend API.
-   **Premium UI**: A polished dark theme using modern CSS variables and glassmorphism touches.

## Tech Stack

-   **Framework**: [Lit](https://lit.dev/) (loaded from local vendor file, no build step required).
-   **Styling**: Vanilla CSS with a structured design system.
-   **Build**: None! Runs directly in modern browsers. ES Modules are used natively.
-   **Testing**: Native Node.js test runner (`node --test`).

## Getting Started

Since there is no build step, you just need to serve the files locally.

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/babytrack.git
    cd babytrack
    ```

2.  **Start a local server**
    You can use any static file server. We recommend `serve`:
    ```bash
    npx serve .
    ```
    Or Python:
    ```bash
    python3 -m http.server
    ```

3.  **Open in Browser**
    Visit `http://localhost:3000` (or whatever port your server uses).

## Development

-   **Components**: Located in `src/components/`.
-   **Services**: Logic lives in `src/services/`.
-   **Tests**: Run unit tests with:
    ```bash
    npm test
    ```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for more details on the architecture and contribution guidelines.
