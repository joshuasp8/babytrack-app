# BabyTrack Agent Guidelines

## Tech Stack & Architecture
- **Frontend + Backend**: The app talks to a Go backend for authentication and feed data. Auth lives at a separate service (`AUTH_BASE_URL`); feed CRUD lives at `FEED_API_BASE_URL`. See `src/services/`.
- **Lit (No Build)**: Use `lit` import from `src/vendor/`. No build step (e.g., Babel/Webpack) is used.
- **Web Components**: Use Lit for reactivity.
- **Styling**: Vanilla CSS in `src/styles/main.css`.
- **Global Styles**: The root component `bt-app` usually disables Shadow DOM (`createRenderRoot() { return this; }`) to let global styles cascade.

## Design & Aesthetics
- **Premium Feel**: Dark mode default. Use `var(--primary-color)` (Sky Blue) for actions.
- **Polished UI**:
    -   **Cards**: Use rounded corners (`--radius-lg`) and subtle borders.
    -   **Buttons**: Primary buttons should be prominent (e.g., full width or centered suitable for mobile). Avoid default grey buttons.
    -   **Form Layout**: Group related inputs (Date/Time, Type/Side) into rows for better density.
-   **Interactive**: Collapsible sections (like "Add Feed") keep the UI clean.

## Development Workflow
-   **Atomic Steps**: Create styles -> Create Component -> Integrate.
-   **Browser Verification**: Always verify UI changes in the browser to catch CSS issues (like Shadow DOM blocking).
-   **Testing**: Use `node --test` for logic/services.

## Lessons Learned & Best Practices
-   **Shadow DOM vs Styles**: While Light DOM is easier for global styles, it breaks style encapsulation. The robust solution is to use a `shared-styles.js` module for common utilities.
-   **Date Inputs**: `datetime-local` inputs work well but need careful conversion to/from JS Date objects. Use `date.toISOString().slice(0, 16)` for the `value` attribute.
-   **UI Polish & UX Patterns**:
    -   **Progressive Disclosure**: Hide complex inputs (like manual datetime/duration) behind "Custom" buttons or until needed. Keeps the primary UI clean.
    -   **Segmented Controls**: Prefer segmented buttons over dropdowns for small sets of mutually exclusive options (e.g. < 5 items).
    -   **Center the main action** on forms.
    -   **Smart Defaults**: Pre-select common options.
-   **LocalStorage with JSON**: Wrap `localStorage` calls in a try-catch block and handle JSON parsing to prevent crashes on corrupted data.
-   **Node Test Runner**: Great for logic testing without a heavy harness. Requires a manual mock for `localStorage` if running in Node.
-   **Edit Flow Pattern**: For editing items in a list:
    -   Child (`feed-list`) emits request event (`feed-edited`).
    -   Parent (`bt-app`) captures event and passes object to Form component (`feed-input`) via property.
    -   Form component populates state, handles persistence on save, emits completion event (`feed-updated`), and parent clears the selected object.
-   **Component Decomposition**: For components with complex rendering logic (like `feed-input.js`), prefer breaking the `render()` method into smaller helper methods (e.g., `_renderHeader()`, `_renderForm()`) or separate sub-components. This improves readability significantly over monolithic render functions.
-   **Live Tracking UX**:
    -   **Split Timers**: For multi-stage activities (like breastfeeding left/right), show the *current* activity's timer as the primary focus, but keep the *total* context visible.
    -   **Auto-Pause**: When a user switches context (e.g., switches sides), auto-pausing the timer reduces anxiety and ensures cleaner data capture.
    -   **Rounding Perception**: Users expect standard rounding (30s threshold) for durations rather than ceiling or floor. `Math.round(seconds / 60)` feels most natural for "minutes" displays.
-   **Robust Timer Architecture**:
    -   **Avoid Intervals for State**: Do not rely on `setInterval` to increment a counter, as it drifts when the browser sleeps (mobile/background).
    -   **Banked + Delta Pattern**: Instead, store `banked` time (from previous runs) and a `lastResumeTime`. Calculate `currentElapsed = banked + (now - lastResumeTime)` dynamically on every render frame. This is drift-proof.
    -   **Shared Logic for Different Types**: The `TimerLogic` class is flexible enough to handle different tracking types. For simple single-interval tracking (like sleep), treat it as a "breast" feed with only one side or abstract the side-specific logic to remain generic.
    -   **State Migration**: Always assume `localStorage` data might be old. Implement a static `migrate(state)` method in your service to upgrade legacy shapes to the current schema before using them.
-   **SVG Icons Management**: To improve component readability, extract complex SVG paths into a dedicated `icons.js` component. Define them as small Lit templates or simple functional components. 
-   **Aggregate List Headers**: When grouping items by date (like in `sleep-list.js`), use the header to display useful aggregates (e.g., "Total Daily Sleep"). This provides immediate value at the top of each section.
-   **Two-Mode Data Layer** (`FeedService`):
    -   `FeedService` operates in one of two modes controlled by `_useServer` (default `false`).
    -   **Local mode** (logged out): reads/writes go to `localStorage` with a 200ms simulated latency. No API calls are made.
    -   **Server mode** (logged in): all CRUD delegates entirely to `FeedApiService`. localStorage is not touched.
    -   Call `FeedService.importAndSwitchToServer()` after login to perform the one-time migration: it bulk-imports local feeds, wipes `localStorage`, and flips `_useServer = true`. If the import has any skipped records or errors, the service stays in local mode and returns `{ success: false, message }` so the caller can surface a toast.
    -   Call `FeedService.switchToLocal()` on logout to revert to local mode.
    -   **Sleep data** is local-only for now and is not affected by this pattern.
-   **Cross-Domain Authentication**:
    -   Use `credentials: 'include'` in all `fetch` calls to send cookies across domains.
    -   Cache user data in `localStorage` for instant UI updates, but always validate with the server on load.
    -   For magic link flows, send a `redirectUrl` in the login request so the auth server knows where to redirect after email verification.
-   **App Bar Design Patterns**:
    -   Use negative margins (`margin: 0 -20px`) to break out of a max-width container and create full-width bars.
    -   Left-align titles, right-align actions (like profile icons) for a balanced, Material-style layout.
    -   Use flexbox (`align-items: center`) for vertical centering instead of manual margin hacks.
    -   Subtle bottom borders (`border-bottom: 1px solid var(--border-color)`) provide structure without heaviness.
-   **Portable Component Design**:
    -   Build components to be self-contained and reusable across projects (e.g., `<profile-icon>`, `<login-modal>`).
    -   Compose complex components internally rather than requiring parent orchestration (e.g., `<login-modal>` rendered inside `<profile-icon>`).
    -   Use custom events for communication and properties for configuration to keep the API clean and flexible.

## Project Structure
-   `src/components/`: UI Components (Lit).
-   `src/services/`: Business logic and data persistence.
-   `src/types/`: (Optional) JSDoc types.
-   `tests/`: Unit tests.
