/**
 * Represents a Todo item in the application.
 */
export class Todo {
    /**
     * @param {Object} data - The raw todo data
     * @param {string} [data.id] - The unique identifier of the todo
     * @param {string} data.title - The title/description of the todo
     * @param {boolean} [data.completed] - Whether the todo is completed
     * @param {string} [data.created_at] - The creation timestamp in ISO format
     * @param {string} [data.updated_at] - The last modification timestamp in ISO format
     */
    constructor({ id, title, completed = false, created_at, updated_at }) {
        this.id = id;
        this.title = title;
        this.completed = completed;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }
}
