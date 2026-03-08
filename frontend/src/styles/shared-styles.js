import { css } from 'lit';

export const sharedStyles = css`
  /* Utilities */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 16px;
    border-radius: var(--radius-md);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
    font-family: inherit;
    font-size: 0.95rem;
    gap: 8px;
  }

  .btn-primary {
    background-color: var(--primary-color);
    color: var(--text-primary); 
  }

  .btn-primary:hover {
    background-color: var(--primary-hover);
  }

  .btn-secondary {
    background-color: var(--bg-surface-hover);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
  }

  .btn-secondary:hover {
    background-color: #475569; /* Slate 600 */
  }

  .btn-cta {
    background-color: var(--cta-color);
    color: var(--text-primary);
    font-weight: 600;
    font-size: 1.1rem;
  }

  .btn-glossy {
    background: linear-gradient(
      135deg,
      #14b8a6,
      #38bdf8
    );
  }

  .btn-icon {
    padding: 8px;
    aspect-ratio: 1;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 8px;
    text-align: left;
  }

  .label {
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .input,
  .select,
  .textarea {
    background-color: var(--bg-app);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 10px 12px;
    color: var(--text-primary);
    font-family: inherit;
    font-size: 1rem;
    width: 100%;
    transition: border-color 0.2s;
  }

  .input:focus,
  .select:focus,
  .textarea:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  /* Card Utility */
  .card {
    background: var(--bg-surface);
    border-radius: var(--radius-lg);
    padding: 24px;
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--border-color);
  }

  /* Loading Spinner */
  .loader-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    color: var(--text-secondary);
    gap: 16px;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--bg-surface-hover);
    border-top: 4px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
