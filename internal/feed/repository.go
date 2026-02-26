package feed

import (
	"database/sql"
	"sync"

	"github.com/google/uuid"
)

// FeedRepository defines the data access interface for feeds.
type FeedRepository interface {
	FindByID(userID string, id uuid.UUID) (*Feed, error)
	FindAllByUser(userID string) ([]*Feed, error)
	Save(feed *Feed) error
	SaveAll(feeds []*Feed) error
	Delete(userID string, id uuid.UUID) error
}

// ----- In Memory Repository (used in tests) -----

type InMemoryRepository struct {
	mutex sync.RWMutex
	store map[uuid.UUID]*Feed
}

func NewInMemoryRepository() *InMemoryRepository {
	return &InMemoryRepository{
		store: make(map[uuid.UUID]*Feed),
	}
}

func (r *InMemoryRepository) FindByID(userID string, id uuid.UUID) (*Feed, error) {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	item, ok := r.store[id]
	if !ok || item.UserID != userID {
		return nil, ErrFeedNotFound
	}
	return item, nil
}

func (r *InMemoryRepository) FindAllByUser(userID string) ([]*Feed, error) {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	var result []*Feed
	for _, f := range r.store {
		if f.UserID == userID {
			result = append(result, f)
		}
	}
	return result, nil
}

func (r *InMemoryRepository) Save(feed *Feed) error {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	r.store[feed.Id] = feed
	return nil
}

func (r *InMemoryRepository) SaveAll(feeds []*Feed) error {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	for _, f := range feeds {
		r.store[f.Id] = f
	}
	return nil
}

func (r *InMemoryRepository) Delete(userID string, id uuid.UUID) error {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	item, ok := r.store[id]
	if !ok || item.UserID != userID {
		return ErrFeedNotFound
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

func (r *PostgresRepository) FindAllByUser(userID string) ([]*Feed, error) {
	query := `
		SELECT id, user_id, start_time, duration_minutes, duration_left_minutes,
		       duration_right_minutes, type, breast_side_started_on, notes, created_at
		FROM feeds
		WHERE user_id = $1
		ORDER BY start_time DESC
	`
	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []*Feed
	for rows.Next() {
		var f Feed
		if err := rows.Scan(
			&f.Id, &f.UserID, &f.StartTime,
			&f.DurationMinutes, &f.DurationLeftMinutes, &f.DurationRightMinutes,
			&f.Type, &f.BreastSideStartedOn, &f.Notes, &f.CreatedAt,
		); err != nil {
			return nil, err
		}
		result = append(result, &f)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}

func (r *PostgresRepository) FindByID(userID string, id uuid.UUID) (*Feed, error) {
	query := `
		SELECT id, user_id, start_time, duration_minutes, duration_left_minutes,
		       duration_right_minutes, type, breast_side_started_on, notes, created_at
		FROM feeds
		WHERE id = $1 AND user_id = $2
	`
	var f Feed
	err := r.db.QueryRow(query, id, userID).Scan(
		&f.Id, &f.UserID, &f.StartTime,
		&f.DurationMinutes, &f.DurationLeftMinutes, &f.DurationRightMinutes,
		&f.Type, &f.BreastSideStartedOn, &f.Notes, &f.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, ErrFeedNotFound
	}
	if err != nil {
		return nil, err
	}
	return &f, nil
}

func (r *PostgresRepository) Save(feed *Feed) error {
	query := `
		INSERT INTO feeds (id, user_id, start_time, duration_minutes, duration_left_minutes,
		                   duration_right_minutes, type, breast_side_started_on, notes, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (id) DO UPDATE SET
			start_time             = EXCLUDED.start_time,
			duration_minutes       = EXCLUDED.duration_minutes,
			duration_left_minutes  = EXCLUDED.duration_left_minutes,
			duration_right_minutes = EXCLUDED.duration_right_minutes,
			type                   = EXCLUDED.type,
			breast_side_started_on = EXCLUDED.breast_side_started_on,
			notes                  = EXCLUDED.notes
	`
	_, err := r.db.Exec(query,
		feed.Id, feed.UserID, feed.StartTime,
		feed.DurationMinutes, feed.DurationLeftMinutes, feed.DurationRightMinutes,
		feed.Type, feed.BreastSideStartedOn, feed.Notes, feed.CreatedAt,
	)
	return err
}

func (r *PostgresRepository) SaveAll(feeds []*Feed) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`
		INSERT INTO feeds (id, user_id, start_time, duration_minutes, duration_left_minutes,
		                   duration_right_minutes, type, breast_side_started_on, notes, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (id) DO UPDATE SET
			start_time             = EXCLUDED.start_time,
			duration_minutes       = EXCLUDED.duration_minutes,
			duration_left_minutes  = EXCLUDED.duration_left_minutes,
			duration_right_minutes = EXCLUDED.duration_right_minutes,
			type                   = EXCLUDED.type,
			breast_side_started_on = EXCLUDED.breast_side_started_on,
			notes                  = EXCLUDED.notes
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, f := range feeds {
		if _, err := stmt.Exec(
			f.Id, f.UserID, f.StartTime,
			f.DurationMinutes, f.DurationLeftMinutes, f.DurationRightMinutes,
			f.Type, f.BreastSideStartedOn, f.Notes, f.CreatedAt,
		); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *PostgresRepository) Delete(userID string, id uuid.UUID) error {
	query := "DELETE FROM feeds WHERE id = $1 AND user_id = $2"
	result, err := r.db.Exec(query, id, userID)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	// TODO: consider not returning an error if no rows are affected
	if rows == 0 {
		return ErrFeedNotFound
	}
	return nil
}
