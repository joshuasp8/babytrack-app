import { LitElement, html } from 'lit';
import { api } from '../services/api.js';
import { Todo } from '../models/todo.js';
import './todo-item.js';

class TodoApp extends LitElement {
    static properties = {
        todos: { type: Array },
        error: { type: String }
    };

    constructor() {
        super();
        /**
         * @type {Todo[]}
         */
        this.todos = [];
        /**
         * @type {string | null}
         */
        this.error = null;
    }

    // Use light DOM for the app container to inherit global styles easily,
    // as it was in the original implementation.
    createRenderRoot() {
        return this;
    }

    connectedCallback() {
        super.connectedCallback();
        this.loadTodos();
    }

    async loadTodos() {
        try {
            this.todos = await api.getAll();
        } catch (err) {
            this.error = `Error loading todos: ${err.message}`;
        }
    }

    async _handleAdd(e) {
        e.preventDefault();
        const input = this.querySelector('.todo-input');
        const title = input.value.trim();
        if (title) {
            try {
                const newTodo = await api.create(title);
                this.todos = [...this.todos, newTodo];
                input.value = '';
            } catch (err) {
                alert('Error creating todo: ' + err.message);
            }
        }
    }

    async _handleToggle(e) {
        const { id, completed } = e.detail;
        try {
            const currentTodo = this.todos.find(t => t.id === id);
            const updated = await api.update(id, { title: currentTodo.title, completed });
            this.todos = this.todos.map(t => t.id === id ? updated : t);
        } catch (err) {
            alert('Error updating todo: ' + err.message);
            this.requestUpdate();
        }
    }

    async _handleDelete(e) {
        const { id } = e.detail;
        try {
            await api.delete(id);
            this.todos = this.todos.filter(t => t.id !== id);
        } catch (err) {
            alert('Error deleting todo: ' + err.message);
        }
    }

    render() {
        const sortedTodos = [...this.todos].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        return html`
            <form class="todo-form" id="add-form" @submit=${this._handleAdd}>
                <input type="text" class="todo-input" placeholder="What needs to be done?" required>
                <button type="submit" class="btn btn-primary">Add</button>
            </form>
            
            <div class="todo-list" @toggle=${this._handleToggle} @delete=${this._handleDelete}>
                ${this.error
                ? html`<p style="color: var(--error-color)">${this.error}</p>`
                : sortedTodos.length === 0
                    ? html`<p style="text-align: center; color: var(--text-secondary)">No todos yet. Add one above!</p>`
                    : sortedTodos.map(todo => html`<todo-item .todo=${todo}></todo-item>`)
            }
            </div>
        `;
    }
}

customElements.define('todo-app', TodoApp);
