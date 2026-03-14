package sleep

import (
	"log"
	"time"

	"github.com/google/uuid"
)

type SleepService struct {
	repository SleepRepository
}

func NewService(repository SleepRepository) *SleepService {
	return &SleepService{repository: repository}
}

func (s *SleepService) GetAll(userID string) ([]*Sleep, error) {
	return s.repository.FindAllByUser(userID)
}

func (s *SleepService) GetById(userID string, id uuid.UUID) (*Sleep, error) {
	return s.repository.FindByID(userID, id)
}

func (s *SleepService) Create(userID string, req *CreateSleepRequest) (*Sleep, error) {
	sleep := &Sleep{
		Id:              uuid.New(),
		UserID:          userID,
		StartTime:       req.StartTime,
		DurationMinutes: req.DurationMinutes,
		Notes:           req.Notes,
		CreatedAt:       time.Now().UTC(),
	}

	if err := s.repository.Save(sleep); err != nil {
		return nil, err
	}
	return sleep, nil
}

func (s *SleepService) Update(userID string, id uuid.UUID, req *UpdateSleepRequest) (*Sleep, error) {
	sleep, err := s.repository.FindByID(userID, id)
	if err != nil {
		return nil, err
	}

	sleep.StartTime = req.StartTime
	sleep.DurationMinutes = req.DurationMinutes
	sleep.Notes = req.Notes

	if err := s.repository.Save(sleep); err != nil {
		return nil, err
	}
	return sleep, nil
}

func (s *SleepService) Delete(userID string, id uuid.UUID) error {
	return s.repository.Delete(userID, id)
}

// Import bulk-imports sleeps from a localStorage export.
// Rows missing id or start_time are logged and skipped.
// user_id is always taken from the authenticated user, never the payload.
func (s *SleepService) Import(userID string, items []ImportSleepItem) (int, error) {
	var toSave []*Sleep
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

		toSave = append(toSave, &Sleep{
			Id:              item.Id,
			UserID:          userID,
			StartTime:       item.StartTime,
			DurationMinutes: item.DurationMinutes,
			Notes:           item.Notes,
			CreatedAt:       time.Now().UTC(),
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
