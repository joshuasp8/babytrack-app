package sleep

import (
	"time"

	"github.com/google/uuid"
)

// Sleep represents a single sleep session.
type Sleep struct {
	Id              uuid.UUID `json:"id"`
	UserID          string    `json:"userId"`
	StartTime       time.Time `json:"startTime"`
	DurationMinutes int       `json:"durationMinutes"`
	Notes           string    `json:"notes"`
	CreatedAt       time.Time `json:"createdAt"`
}

// CreateSleepRequest is the payload for creating a new sleep.
type CreateSleepRequest struct {
	StartTime       time.Time `json:"startTime"`
	DurationMinutes int       `json:"durationMinutes"`
	Notes           string    `json:"notes"`
}

// UpdateSleepRequest is the payload for updating an existing sleep.
type UpdateSleepRequest struct {
	StartTime       time.Time `json:"startTime"`
	DurationMinutes int       `json:"durationMinutes"`
	Notes           string    `json:"notes"`
}

type SleepResponse struct {
	Sleep *Sleep `json:"sleep"`
}

type SleepListResponse struct {
	Sleeps []*Sleep `json:"sleeps"`
}

// ImportSleepItem represents a single sleep entry from a localStorage export.
// Id and StartTime are required.
type ImportSleepItem struct {
	Id              uuid.UUID `json:"id"`
	StartTime       time.Time `json:"startTime"`
	DurationMinutes int       `json:"durationMinutes"`
	Notes           string    `json:"notes"`
}

// ImportSleepsRequest is the payload for bulk-importing sleeps.
type ImportSleepsRequest struct {
	Sleeps []ImportSleepItem `json:"sleeps"`
}
