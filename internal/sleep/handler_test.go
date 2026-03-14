package sleep

import (
	"babytrack/pkg/auth"
	"babytrack/pkg/middleware"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var testRegisteredClaims = jwt.RegisteredClaims{
	Issuer:    "jscom",
	Subject:   "test-user-id-123",
	Audience:  []string{"jscom"},
	ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
	IssuedAt:  jwt.NewNumericDate(time.Now()),
	ID:        "test",
}

var testUser = &auth.UserClaims{
	Email:            "test@test.com",
	RegisteredClaims: testRegisteredClaims,
}

// withAuth injects testUser into the request context.
func withAuth(req *http.Request) *http.Request {
	return req.WithContext(context.WithValue(req.Context(), middleware.UserKey, testUser))
}

func newTestRouter() (http.Handler, *InMemoryRepository) {
	repo := NewInMemoryRepository()
	service := NewService(repo)
	handler := NewHttpHandler(service)
	return handler.Router(), repo
}

func testSleep(userID string) *Sleep {
	return &Sleep{
		Id:              uuid.New(),
		UserID:          userID,
		StartTime:       time.Now().UTC(),
		DurationMinutes: 120,
		Notes:           "test sleep",
		CreatedAt:       time.Now().UTC(),
	}
}

// ----- Tests -----

func TestCreateSleep(t *testing.T) {
	r, _ := newTestRouter()

	body := `{"startTime":"2026-02-25T08:00:00Z","durationMinutes":120,"notes":"night"}`
	req, _ := http.NewRequest("POST", "/api/v1/sleeps", bytes.NewBufferString(body))
	req = withAuth(req)

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", rr.Code, rr.Body.String())
	}

	var created Sleep
	if err := json.NewDecoder(rr.Body).Decode(&created); err != nil {
		t.Fatal(err)
	}
	if created.DurationMinutes != 120 {
		t.Errorf("unexpected duration: got %d want %d", created.DurationMinutes, 120)
	}
	if created.UserID != testUser.Subject {
		t.Errorf("user_id not set from JWT: got %q want %q", created.UserID, testUser.Subject)
	}
}

func TestListSleeps(t *testing.T) {
	r, repo := newTestRouter()

	s := testSleep(testUser.Subject)
	repo.Save(s)

	req, _ := http.NewRequest("GET", "/api/v1/sleeps", nil)
	req = withAuth(req)

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}

	var list []*Sleep
	if err := json.NewDecoder(rr.Body).Decode(&list); err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 {
		t.Errorf("expected 1 sleep, got %d", len(list))
	}
}

func TestListSleepsReturnsEmptyArray(t *testing.T) {
	r, _ := newTestRouter()

	req, _ := http.NewRequest("GET", "/api/v1/sleeps", nil)
	req = withAuth(req)

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
	body := rr.Body.String()
	if body == "null\n" {
		t.Error("expected empty array [], got null")
	}
}

func TestGetSleepById(t *testing.T) {
	r, repo := newTestRouter()

	s := testSleep(testUser.Subject)
	repo.Save(s)

	req, _ := http.NewRequest("GET", fmt.Sprintf("/api/v1/sleeps/%s", s.Id), nil)
	req = withAuth(req)

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}

	var got Sleep
	if err := json.NewDecoder(rr.Body).Decode(&got); err != nil {
		t.Fatal(err)
	}
	if got.Id != s.Id {
		t.Errorf("unexpected id: got %v want %v", got.Id, s.Id)
	}
}

func TestUpdateSleep(t *testing.T) {
	r, repo := newTestRouter()

	s := testSleep(testUser.Subject)
	repo.Save(s)

	body := `{"startTime":"2026-02-25T09:00:00Z","durationMinutes":130,"notes":"updated"}`
	req, _ := http.NewRequest("PUT", fmt.Sprintf("/api/v1/sleeps/%s", s.Id), bytes.NewBufferString(body))
	req = withAuth(req)

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	updated, _ := repo.FindByID(testUser.Subject, s.Id)
	if updated.DurationMinutes != 130 {
		t.Errorf("duration not updated: got %d want %d", updated.DurationMinutes, 130)
	}
	if updated.Notes != "updated" {
		t.Errorf("notes not updated: got %q want %q", updated.Notes, "updated")
	}
}

func TestDeleteSleep(t *testing.T) {
	r, repo := newTestRouter()

	s := testSleep(testUser.Subject)
	repo.Save(s)

	req, _ := http.NewRequest("DELETE", fmt.Sprintf("/api/v1/sleeps/%s", s.Id), nil)
	req = withAuth(req)

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", rr.Code)
	}

	if _, err := repo.FindByID(testUser.Subject, s.Id); !errors.Is(err, ErrSleepNotFound) {
		t.Error("sleep was not deleted")
	}
}

func TestImportSleeps(t *testing.T) {
	r, repo := newTestRouter()

	id1 := uuid.New()
	id2 := uuid.New()
	body := fmt.Sprintf(`{
		"sleeps": [
			{"id":"%s","startTime":"2026-02-24T07:00:00Z","durationMinutes":60,"notes":"nap"},
			{"id":"%s","startTime":"2026-02-24T20:00:00Z","durationMinutes":480,"notes":"night"}
		]
	}`, id1, id2)

	req, _ := http.NewRequest("POST", "/api/v1/sleeps/import", bytes.NewBufferString(body))
	req = withAuth(req)

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var result map[string]int
	json.NewDecoder(rr.Body).Decode(&result)
	if result["imported"] != 2 {
		t.Errorf("expected 2 imported, got %d", result["imported"])
	}

	// Verify sleeps are scoped to the correct user
	s, err := repo.FindByID(testUser.Subject, id1)
	if err != nil {
		t.Fatalf("imported sleep not found: %v", err)
	}
	if s.UserID != testUser.Subject {
		t.Errorf("user_id not set from JWT on import")
	}
}

func TestImportSleepsSkipsInvalidRows(t *testing.T) {
	r, _ := newTestRouter()

	// One valid row, one missing id, one missing start_time
	validID := uuid.New()
	body := fmt.Sprintf(`{
		"sleeps": [
			{"id":"%s","startTime":"2026-02-24T07:00:00Z","durationMinutes":60},
			{"startTime":"2026-02-24T10:00:00Z","durationMinutes":120},
			{"id":"%s","durationMinutes":180}
		]
	}`, validID, uuid.New())

	req, _ := http.NewRequest("POST", "/api/v1/sleeps/import", bytes.NewBufferString(body))
	req = withAuth(req)

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var result map[string]int
	json.NewDecoder(rr.Body).Decode(&result)
	if result["imported"] != 1 {
		t.Errorf("expected 1 imported, got %d", result["imported"])
	}
	if result["skipped"] != 2 {
		t.Errorf("expected 2 skipped, got %d", result["skipped"])
	}
}

func TestRequestFailsWhenNoAuthToken(t *testing.T) {
	r, _ := newTestRouter()

	req, _ := http.NewRequest("GET", "/api/v1/sleeps", nil)

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
}
