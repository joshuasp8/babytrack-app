import { Todo } from '../models/todo.js';

const API_BASE = '/api/v1/todos';

export const api = {
    /**
     * Get all todos.
     * @returns {Promise<Todo[]>} Array of todos.
     */
    async getAll() {
        const res = await fetch(API_BASE);
        const data = await res.json();
        return data.map(item => new Todo(item));
    },

    /**
     * Create a new todo.
     * @param {string} title - The title of the new todo.
     * @returns {Promise<Todo>} The created todo.
     */
    async create(title) {
        const res = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
        });
        if (!res.ok) throw new Error('Failed to create todo');
        const data = await res.json();
        return new Todo(data);
    },

    /**
     * Update an existing todo.
     * @param {string} id - The ID of the todo to update.
     * @param {Partial<Todo>} updates - The fields to update (e.g., title, completed).
     * @returns {Promise<Todo>} The updated todo.
     */
    async update(id, updates) {
        const res = await fetch(`${API_BASE}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!res.ok) throw new Error('Failed to update todo');
        const data = await res.json();
        return new Todo(data);
    },

    /**
     * Delete a todo.
     * @param {string} id - The ID of the todo to delete.
     * @returns {Promise<boolean>} True if successfully deleted.
     */
    async delete(id) {
        const res = await fetch(`${API_BASE}/${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to delete todo');
        return true;
    }
};
