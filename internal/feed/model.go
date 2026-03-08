package feed

import (
	"time"

	"github.com/google/uuid"
)

// Feed represents a single feeding event.
type Feed struct {
	Id                   uuid.UUID  `json:"id"`
	UserID               string     `json:"user_id"`
	StartTime            time.Time  `json:"startTime"`
	DurationMinutes      int        `json:"durationMinutes"`
	DurationLeftMinutes  int        `json:"durationLeftMinutes"`
	DurationRightMinutes int        `json:"durationRightMinutes"`
	Type                 string     `json:"type"`
	BreastSideStartedOn  *string    `json:"breastSideStartedOn"`
	Notes                string     `json:"notes"`
	CreatedAt            time.Time  `json:"created_at"`
}

// CreateFeedRequest is the payload for creating a new feed.
type CreateFeedRequest struct {
	StartTime            time.Time `json:"startTime"`
	DurationMinutes      int       `json:"durationMinutes"`
	DurationLeftMinutes  int       `json:"durationLeftMinutes"`
	DurationRightMinutes int       `json:"durationRightMinutes"`
	Type                 string    `json:"type"`
	BreastSideStartedOn  *string   `json:"breastSideStartedOn"`
	Notes                string    `json:"notes"`
}

// UpdateFeedRequest is the payload for updating an existing feed.
type UpdateFeedRequest struct {
	StartTime            time.Time `json:"startTime"`
	DurationMinutes      int       `json:"durationMinutes"`
	DurationLeftMinutes  int       `json:"durationLeftMinutes"`
	DurationRightMinutes int       `json:"durationRightMinutes"`
	Type                 string    `json:"type"`
	BreastSideStartedOn  *string   `json:"breastSideStartedOn"`
	Notes                string    `json:"notes"`
}

type FeedResponse struct {
	Feed *Feed `json:"feed"`
}

type FeedListResponse struct {
	Feeds []*Feed `json:"feeds"`
}

// ImportFeedItem represents a single feed entry from a localStorage export.
// Id and StartTime are required; rows missing these or Type will be skipped.
type ImportFeedItem struct {
	Id                   uuid.UUID `json:"id"`
	StartTime            time.Time `json:"startTime"`
	DurationMinutes      int       `json:"durationMinutes"`
	DurationLeftMinutes  int       `json:"durationLeftMinutes"`
	DurationRightMinutes int       `json:"durationRightMinutes"`
	Type                 string    `json:"type"`
	BreastSideStartedOn  *string   `json:"breastSideStartedOn"`
	Notes                string    `json:"notes"`
}

// ImportFeedsRequest is the payload for bulk-importing feeds from localStorage.
type ImportFeedsRequest struct {
	Feeds []ImportFeedItem `json:"feeds"`
}
