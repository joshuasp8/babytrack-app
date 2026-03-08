import { css } from 'lit';

export const feedInputStyles = css`
    :host {
      display: block;
      margin-bottom: 24px;
    }

    .feed-editor {
      background-color: var(--bg-surface-hover);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
    }
    
    form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 20px;
    }

    .row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      align-items: start;
    }

    .quick-buttons {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      padding-bottom: 4px;
    }

    .btn-chip {
      background: var(--bg-app);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      border-radius: 20px;
      padding: 6px 12px;
      font-size: 0.85rem;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
      flex: 0 0 auto;
    }

    .btn-chip:hover {
      background: var(--bg-surface-hover);
      color: var(--text-primary);
    }

    .btn-chip.active {
      background: var(--primary-color);
      color: #0f172a;
      border-color: var(--primary-color);
    }

    .radio-group {
      display: flex;
      gap: 16px;
      height: 48px; /* Match input height approx */
      align-items: center;
    }

    .radio-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.95rem;
    }

    .radio-label input[type="radio"] {
      accent-color: var(--primary-color);
      width: 18px;
      height: 18px;
    }

    .btn-text {
      background: none;
      border: none;
      color: var(--primary-color);
      cursor: pointer;
      font-size: 0.9rem;
      padding: 0;
      text-decoration: underline;
      text-underline-offset: 4px;
    }

    .cancel-btn {
      color: var(--danger-color) !important;
    }

    .form-actions {
      display: flex;
      justify-content: center; /* Center aligned */
      margin-top: 8px;
    }

    .btn-save {
      width: 100%; /* Default mobile */
      height: 48px;
      font-size: 1rem;
      background-color: var(--primary-color);
      color: var(--text-primary); 
    }
    
    .btn-save:hover {
      background-color: var(--primary-hover);
    }

    @media (min-width: 480px) {
      .btn-save {
        width: auto;
        min-width: 200px; /* Wider button */
      }
    }
    
    /* New Layout Styles */
    .duration-row {
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
    }
    
    .input-small {
      width: 48px;
      padding: 8px;
    }

    .textarea {
      width: auto !important;
    }

    /* Segmented Control */
    .segmented-control {
      display: flex;
      background: var(--bg-app);
      padding: 4px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      gap: 4px;
    }

    .btn-segment {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--text-secondary);
      padding: 6px 12px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
      font-size: 0.9rem;
    }

    .btn-segment:hover {
      color: var(--text-primary);
    }

    .btn-segment.active {
      background: var(--bg-surface-hover);
      color: var(--primary-color);
      box-shadow: var(--shadow-sm);
    }
  `;
