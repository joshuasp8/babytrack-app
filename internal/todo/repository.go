package todo

import (
	"database/sql"
	"sync"

	"github.com/google/uuid"
)

type TodoRepository interface {
	FindByID(id uuid.UUID) (*Todo, error)
	FindAll() ([]*Todo, error)
	Save(todo *Todo) error
	Delete(id uuid.UUID) error
}

// ----- In Memory repository -----

type InMemoryRepository struct {
	mutex sync.RWMutex
	store map[uuid.UUID]*Todo
}

func NewInMemoryRepository() *InMemoryRepository {
	return &InMemoryRepository{
		store: make(map[uuid.UUID]*Todo),
	}
}

func (this *InMemoryRepository) FindByID(id uuid.UUID) (*Todo, error) {
	item, ok := this.store[id]
	if !ok {
		return nil, ErrTodoNotFound
	}
	return item, nil
}

func (this *InMemoryRepository) FindAll() ([]*Todo, error) {
	all := []*Todo{}
	for _, v := range this.store {
		all = append(all, v)
	}
	return all, nil
}

func (this *InMemoryRepository) Save(todo *Todo) error {
	this.mutex.Lock()
	defer this.mutex.Unlock()

	this.store[todo.Id] = todo
	return nil
}

func (this *InMemoryRepository) Delete(id uuid.UUID) error {
	_, ok := this.store[id]
	if !ok {
		return ErrTodoNotFound
	}
	delete(this.store, id)
	return nil
}

// ----- Postgres Repository -----
type PostgresTodoRepository struct {
	db *sql.DB
}

func NewPostgresRepository(db *sql.DB) *PostgresTodoRepository {
	return &PostgresTodoRepository{
		db: db,
	}
}

func (this *PostgresTodoRepository) FindAll() ([]*Todo, error) {
	all := []*Todo{}

	query := "SELECT id, title, completed, created_at FROM todos order by created_at desc"
	rows, err := this.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var todo Todo
		rows.Scan(&todo.Id, &todo.Title, &todo.Completed, &todo.CreatedAt)
		all = append(all, &todo)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}

	return all, nil
}

func (r *PostgresTodoRepository) FindByID(id uuid.UUID) (*Todo, error) {
	query := `
		SELECT id, title, completed, created_at
		FROM todos
		WHERE id = $1
	`

	var todo Todo
	err := r.db.QueryRow(query, id).
		Scan(&todo.Id, &todo.Title, &todo.Completed, &todo.CreatedAt)

	if err == sql.ErrNoRows {
		return nil, ErrTodoNotFound
	}
	if err != nil {
		return nil, err
	}

	return &todo, nil
}

func (this *PostgresTodoRepository) Save(todo *Todo) error {
	// upsert
	query := `
		INSERT INTO todos (id, title, completed, created_at) 
		VALUES ($1, $2, $3, $4) 
		ON CONFLICT (id) DO UPDATE SET 
			title = EXCLUDED.title, 
			completed = EXCLUDED.completed
	`
	_, err := this.db.Exec(query, todo.Id, todo.Title, todo.Completed, todo.CreatedAt)
	if err != nil {
		return err
	}
	return nil
}

func (this *PostgresTodoRepository) Delete(id uuid.UUID) error {
	query := "DELETE FROM todos WHERE id = $1"
	_, err := this.db.Exec(query, id)
	if err != nil {
		return err
	}
	return nil
}
