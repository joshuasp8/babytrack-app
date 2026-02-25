import { LitElement, html, css } from 'lit';
import { Todo } from '../models/todo.js';

class TodoItem extends LitElement {
    static properties = {
        todo: { type: Object }
    };

    static styles = css`
        .item {
            background: var(--surface-color, #1e1e1e);
            padding: 16px;
            border-radius: var(--radius, 8px);
            display: flex;
            align-items: center;
            justify-content: space-between;
            border: 1px solid var(--border-color, #333);
        }
        .title {
            flex-grow: 1;
            margin: 0 16px;
            color: var(--text-primary, #fff);
            text-decoration: none;
        }
        .title.completed {
            text-decoration: line-through;
            color: var(--text-secondary, #b0b0b0);
        }
        .actions {
            display: flex;
            gap: 8px;
        }
        button {
            background: none;
            border: 1px solid var(--border-color, #333);
            color: var(--text-primary, #fff);
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        button:hover {
            background: rgba(255, 255, 255, 0.1);
        }
        .btn-delete {
            color: var(--error-color, #cf6679);
            border-color: var(--error-color, #cf6679);
        }
        .btn-delete:hover {
            background: rgba(207, 102, 121, 0.1);
        }
        .checkbox {
            width: 20px;
            height: 20px;
            cursor: pointer;
            accent-color: var(--primary-color, #bb86fc);
        }
    `;

    render() {
        if (!this.todo) return html``;

        const { id, title, completed } = this.todo;

        return html`
            <div class="item">
                <input 
                    type="checkbox" 
                    class="checkbox" 
                    .checked=${completed}
                    @change=${this._handleToggle}
                >
                <span class="title ${completed ? 'completed' : ''}">${title}</span>
                <button class="btn-delete" @click=${this._handleDelete}>Delete</button>
            </div>
        `;
    }

    _handleToggle(e) {
        this.dispatchEvent(new CustomEvent('toggle', {
            detail: { id: this.todo.id, completed: e.target.checked },
            bubbles: true,
            composed: true
        }));
    }

    _handleDelete() {
        if (confirm('Are you sure you want to delete this todo?')) {
            this.dispatchEvent(new CustomEvent('delete', {
                detail: { id: this.todo.id },
                bubbles: true,
                composed: true
            }));
        }
    }
}

customElements.define('todo-item', TodoItem);
