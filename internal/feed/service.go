package feed

import (
	"log"
	"time"

	"github.com/google/uuid"
)

var validFeedTypes = map[string]bool{
	"breast":  true,
	"bottle":  true,
	"formula": true,
}

var validBreastSides = map[string]bool{
	"left":  true,
	"right": true,
}

type FeedService struct {
	repository FeedRepository
}

func NewService(repository FeedRepository) *FeedService {
	return &FeedService{repository: repository}
}

func (s *FeedService) GetAll(userID string) ([]*Feed, error) {
	return s.repository.FindAllByUser(userID)
}

func (s *FeedService) GetById(userID string, id uuid.UUID) (*Feed, error) {
	return s.repository.FindByID(userID, id)
}

func (s *FeedService) Create(userID string, req *CreateFeedRequest) (*Feed, error) {
	if err := validateFeedType(req.Type); err != nil {
		return nil, err
	}
	if err := validateBreastSide(req.BreastSideStartedOn); err != nil {
		return nil, err
	}
	if err := validateAmount(req.AmountOz); err != nil {
		return nil, err
	}


	feed := &Feed{
		Id:                   uuid.New(),
		UserID:               userID,
		StartTime:            req.StartTime,
		DurationMinutes:      req.DurationMinutes,
		DurationLeftMinutes:  req.DurationLeftMinutes,
		DurationRightMinutes: req.DurationRightMinutes,
		AmountOz:             req.AmountOz,
		Type:                 req.Type,
		BreastSideStartedOn:  req.BreastSideStartedOn,
		Notes:                req.Notes,
		CreatedAt:            time.Now().UTC(),

	}

	if err := s.repository.Save(feed); err != nil {
		return nil, err
	}
	return feed, nil
}

func (s *FeedService) Update(userID string, id uuid.UUID, req *UpdateFeedRequest) (*Feed, error) {
	feed, err := s.repository.FindByID(userID, id)
	if err != nil {
		return nil, err
	}

	if err := validateFeedType(req.Type); err != nil {
		return nil, err
	}
	if err := validateBreastSide(req.BreastSideStartedOn); err != nil {
		return nil, err
	}
	if err := validateAmount(req.AmountOz); err != nil {
		return nil, err
	}


	feed.StartTime = req.StartTime
	feed.DurationMinutes = req.DurationMinutes
	feed.DurationLeftMinutes = req.DurationLeftMinutes
	feed.DurationRightMinutes = req.DurationRightMinutes
	feed.AmountOz = req.AmountOz
	feed.Type = req.Type
	feed.BreastSideStartedOn = req.BreastSideStartedOn
	feed.Notes = req.Notes


	if err := s.repository.Save(feed); err != nil {
		return nil, err
	}
	return feed, nil
}

func (s *FeedService) Delete(userID string, id uuid.UUID) error {
	return s.repository.Delete(userID, id)
}

// Import bulk-imports feeds from a localStorage export.
// Rows missing id, start_time, or type are logged and skipped.
// user_id is always taken from the authenticated user, never the payload.
func (s *FeedService) Import(userID string, items []ImportFeedItem) (int, error) {
	var toSave []*Feed
	skipped := 0

	for _, item := range items {
		// Validate required fields
		if item.Id == uuid.Nil {
			log.Printf("import: skipping row with missing id")
			skipped++
			continue
		}
		if item.StartTime.IsZero() {
			log.Printf("import: skipping row %s — missing start_time", item.Id)
			skipped++
			continue
		}
		if item.Type == "" {
			log.Printf("import: skipping row %s — missing type", item.Id)
			skipped++
			continue
		}
		if err := validateFeedType(item.Type); err != nil {
			log.Printf("import: skipping row %s — %v", item.Id, err)
			skipped++
			continue
		}
		if err := validateBreastSide(item.BreastSideStartedOn); err != nil {
			log.Printf("import: skipping row %s — %v", item.Id, err)
			skipped++
			continue
		}

		toSave = append(toSave, &Feed{
			Id:                   item.Id,
			UserID:               userID,
			StartTime:            item.StartTime,
			DurationMinutes:      item.DurationMinutes,
			DurationLeftMinutes:  item.DurationLeftMinutes,
			DurationRightMinutes: item.DurationRightMinutes,
			AmountOz:             item.AmountOz,
			Type:                 item.Type,
			BreastSideStartedOn:  item.BreastSideStartedOn,
			Notes:                item.Notes,
			CreatedAt:            time.Now().UTC(),
		})
	}

	if len(toSave) == 0 {
		return 0, nil
	}

	if err := s.repository.SaveAll(toSave); err != nil {
		return 0, err
	}

	return len(toSave), nil
}

func validateFeedType(t string) error {
	if !validFeedTypes[t] {
		return ErrInvalidFeedType
	}
	return nil
}

func validateBreastSide(side *string) error {
	if side == nil || *side == "" {
		return nil
	}
	if !validBreastSides[*side] {
		return ErrInvalidBreastSide
	}
	return nil
}

func validateAmount(amount float64) error {
	if amount < 0 || amount > 20 {
		return ErrInvalidAmount
	}
	return nil
}
