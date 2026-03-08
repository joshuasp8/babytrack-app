# Contributing to BabyTrack

We welcome contributions! Please follow these guidelines to ensure consistency and maintainability.

## Architecture Philosophy
-   **No Frameworks (Complex)**: We use Lit elements for reactive components, but avoid heavy frameworks like React/Angular.
-   **No Build Steps**: The code should run directly in a modern browser.
-   **Premium Aesthetics**: Design matters. Use the defined CSS variables in `main.css`.
-   **Global Styles Strategy**: We use valid **Shadow DOM** for strict encapsulation.
    -   Common tokens (colors, radius) are defined in `main.css` as CSS Variables (which inherit).
    -   Common utility classes (like `.btn`, `.input`) are extracted into `src/styles/shared-styles.js` and imported into components via `static styles = [sharedStyles, css\`...\`]`.
    -   This ensures styles work correctly across the Shadow Boundary without potentially leaky Light DOM hacks.

## Coding Standards
-   **Naming**: Use explicit, descriptive names for classes, variables, and files. Avoid abbreviations.
-   **Logic Separation**: Keep business logic (calculations, filtering) in `src/services/` and UI logic in `src/components/`.
-   **State Management**:
    -   Child components can emit custom events (like `feed-added`) to request state changes.
    -   The parent app element (`bt-app`) handles these events, updates the single source of truth (Services), and passes data back down.
    -   Parents "command" via properties/methods, children "notify" via events.
-   **Render Decomposition**: Avoid monolithic `render()` methods. Break complex HTML structures into small, descriptive helper methods (e.g. `_renderHeader()`) to keep the main render flow readable.
-   **View State Management**:
    -   The main app (`bt-app`) acts as a router/orchestrator. It conditionally renders views (e.g., `active-feed` vs `main-views`) based on high-level state.
    -   A dedicated tab navigation allows users to switch between different tracking domains (e.g., Feed, Sleep) within the main view.
    -   Persistence of *interim* state (like a running timer) should be handled explicitly.
    -   **State Migration**: When changing the structure of persisted state (e.g., in `localStorage`), always implement a migration strategy (like `TimerLogic.migrate()`) to safely upgrade legacy data on load. Do not assume user data matches the current schema.
-   **Reusable UI Elements**: For small, purely visual elements like icons, use the `src/components/common/icons.js` module. This keeps SVG bloat out of main component files.
-   **Self-Contained Components**: When building reusable components (like auth flows, modals, or widgets):
    -   Design them to be portable across projects with minimal dependencies.
    -   Compose complex components internally (e.g., `<login-modal>` rendered inside `<profile-icon>`) rather than requiring parent orchestration.
    -   Use custom events for communication (`user-changed`, `modal-closed`) to keep the API clean.
    -   Avoid hardcoded app-specific logic; use properties for configuration.

## Testing
-   **Unit Tests**: Run `npm test` (uses [Node.js native test runner](https://nodejs.org/api/test.html)).
-   **Mocking**: For browser APIs like `localStorage`, ensure tests provide a mock (see `tests/feed-service.test.js`).

## Workflow
1.  Make small, atomic changes.
2.  Verify your changes in the browser.
3.  Run the test suite.
