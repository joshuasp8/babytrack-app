package sleep

import (
	"database/sql"
	"sync"

	"github.com/google/uuid"
)

// SleepRepository defines the data access interface for sleeps.
type SleepRepository interface {
	FindByID(userID string, id uuid.UUID) (*Sleep, error)
	FindAllByUser(userID string) ([]*Sleep, error)
	Save(sleep *Sleep) error
	SaveAll(sleeps []*Sleep) error
	Delete(userID string, id uuid.UUID) error
}

// ----- In Memory Repository (used in tests) -----

type InMemoryRepository struct {
	mutex sync.RWMutex
	store map[uuid.UUID]*Sleep
}

func NewInMemoryRepository() *InMemoryRepository {
	return &InMemoryRepository{
		store: make(map[uuid.UUID]*Sleep),
	}
}

func (r *InMemoryRepository) FindByID(userID string, id uuid.UUID) (*Sleep, error) {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	item, ok := r.store[id]
	if !ok || item.UserID != userID {
		return nil, ErrSleepNotFound
	}
	return item, nil
}

func (r *InMemoryRepository) FindAllByUser(userID string) ([]*Sleep, error) {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	var result []*Sleep
	for _, s := range r.store {
		if s.UserID == userID {
			result = append(result, s)
		}
	}
	return result, nil
}

func (r *InMemoryRepository) Save(sleep *Sleep) error {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	r.store[sleep.Id] = sleep
	return nil
}

func (r *InMemoryRepository) SaveAll(sleeps []*Sleep) error {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	for _, s := range sleeps {
		r.store[s.Id] = s
	}
	return nil
}

func (r *InMemoryRepository) Delete(userID string, id uuid.UUID) error {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	item, ok := r.store[id]
	if !ok || item.UserID != userID {
		return ErrSleepNotFound
	}
	delete(r.store, id)
	return nil
}

// ----- Postgres Repository -----

type PostgresRepository struct {
	db *sql.DB
}

func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) FindAllByUser(userID string) ([]*Sleep, error) {
	query := `
		SELECT id, user_id, start_time, duration_minutes, notes, created_at
		FROM sleeps
		WHERE user_id = $1
		ORDER BY start_time DESC
	`
	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []*Sleep
	for rows.Next() {
		var s Sleep
		if err := rows.Scan(
			&s.Id, &s.UserID, &s.StartTime,
			&s.DurationMinutes, &s.Notes, &s.CreatedAt,
		); err != nil {
			return nil, err
		}
		result = append(result, &s)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}

func (r *PostgresRepository) FindByID(userID string, id uuid.UUID) (*Sleep, error) {
	query := `
		SELECT id, user_id, start_time, duration_minutes, notes, created_at
		FROM sleeps
		WHERE id = $1 AND user_id = $2
	`
	var s Sleep
	err := r.db.QueryRow(query, id, userID).Scan(
		&s.Id, &s.UserID, &s.StartTime,
		&s.DurationMinutes, &s.Notes, &s.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, ErrSleepNotFound
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *PostgresRepository) Save(sleep *Sleep) error {
	query := `
		INSERT INTO sleeps (id, user_id, start_time, duration_minutes, notes, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (id) DO UPDATE SET
			start_time       = EXCLUDED.start_time,
			duration_minutes = EXCLUDED.duration_minutes,
			notes            = EXCLUDED.notes
	`
	_, err := r.db.Exec(query,
		sleep.Id, sleep.UserID, sleep.StartTime,
		sleep.DurationMinutes, sleep.Notes, sleep.CreatedAt,
	)
	return err
}

func (r *PostgresRepository) SaveAll(sleeps []*Sleep) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`
		INSERT INTO sleeps (id, user_id, start_time, duration_minutes, notes, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (id) DO UPDATE SET
			start_time       = EXCLUDED.start_time,
			duration_minutes = EXCLUDED.duration_minutes,
			notes            = EXCLUDED.notes
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, s := range sleeps {
		if _, err := stmt.Exec(
			s.Id, s.UserID, s.StartTime,
			s.DurationMinutes, s.Notes, s.CreatedAt,
		); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *PostgresRepository) Delete(userID string, id uuid.UUID) error {
	query := "DELETE FROM sleeps WHERE id = $1 AND user_id = $2"
	result, err := r.db.Exec(query, id, userID)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	// TODO: Note: consistent with feed repository returning not found or nil
	if rows == 0 {
		return ErrSleepNotFound
	}
	return nil
}
