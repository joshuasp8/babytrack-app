package feed

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

func testFeed(userID string) *Feed {
	side := "left"
	return &Feed{
		Id:                  uuid.New(),
		UserID:              userID,
		StartTime:           time.Now().UTC(),
		DurationMinutes:     15,
		DurationLeftMinutes: 15,
		AmountOz:            0,
		Type:                "breast",
		BreastSideStartedOn: &side,
		Notes:               "test feed",
		CreatedAt:           time.Now().UTC(),
	}
}

// ----- Tests -----

func TestCreateFeed(t *testing.T) {
	r, _ := newTestRouter()

	body := `{"startTime":"2026-02-25T08:00:00Z","durationMinutes":15,"durationLeftMinutes":15,"amountOz":0,"type":"breast","breastSideStartedOn":"left","notes":"morning"}`
	req, _ := http.NewRequest("POST", "/api/v1/feeds", bytes.NewBufferString(body))
	req = withAuth(req)

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", rr.Code, rr.Body.String())
	}

	var created Feed
	if err := json.NewDecoder(rr.Body).Decode(&created); err != nil {
		t.Fatal(err)
	}
	if created.Type != "breast" {
		t.Errorf("unexpected type: got %q want %q", created.Type, "breast")
	}
	if created.UserID != testUser.Subject {
		t.Errorf("user_id not set from JWT: got %q want %q", created.UserID, testUser.Subject)
	}
}

func TestListFeeds(t *testing.T) {
	r, repo := newTestRouter()

	f := testFeed(testUser.Subject)
	repo.Save(f)

	req, _ := http.NewRequest("GET", "/api/v1/feeds", nil)
	req = withAuth(req)

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}

	var list []*Feed
	if err := json.NewDecoder(rr.Body).Decode(&list); err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 {
		t.Errorf("expected 1 feed, got %d", len(list))
	}
}

func TestListFeedsReturnsEmptyArray(t *testing.T) {
	r, _ := newTestRouter()

	req, _ := http.NewRequest("GET", "/api/v1/feeds", nil)
	req = withAuth(req)

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
	// Body should be "[]" not "null"
	body := rr.Body.String()
	if body == "null\n" {
		t.Error("expected empty array [], got null")
	}
}

func TestGetFeedById(t *testing.T) {
	r, repo := newTestRouter()

	f := testFeed(testUser.Subject)
	repo.Save(f)

	req, _ := http.NewRequest("GET", fmt.Sprintf("/api/v1/feeds/%s", f.Id), nil)
	req = withAuth(req)

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}

	var got Feed
	if err := json.NewDecoder(rr.Body).Decode(&got); err != nil {
		t.Fatal(err)
	}
	if got.Id != f.Id {
		t.Errorf("unexpected id: got %v want %v", got.Id, f.Id)
	}
}

func TestUpdateFeed(t *testing.T) {
	r, repo := newTestRouter()

	f := testFeed(testUser.Subject)
	repo.Save(f)

	body := `{"startTime":"2026-02-25T09:00:00Z","durationMinutes":20,"amountOz":4.5,"type":"bottle","notes":"updated"}`
	req, _ := http.NewRequest("PUT", fmt.Sprintf("/api/v1/feeds/%s", f.Id), bytes.NewBufferString(body))
	req = withAuth(req)

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	updated, _ := repo.FindByID(testUser.Subject, f.Id)
	if updated.Type != "bottle" {
		t.Errorf("type not updated: got %q want %q", updated.Type, "bottle")
	}
	if updated.DurationMinutes != 20 {
		t.Errorf("duration not updated: got %d want %d", updated.DurationMinutes, 20)
	}
	if updated.AmountOz != 4.5 {
		t.Errorf("amount not updated: got %f want %f", updated.AmountOz, 4.5)
	}
}

func TestDeleteFeed(t *testing.T) {
	r, repo := newTestRouter()

	f := testFeed(testUser.Subject)
	repo.Save(f)

	req, _ := http.NewRequest("DELETE", fmt.Sprintf("/api/v1/feeds/%s", f.Id), nil)
	req = withAuth(req)

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", rr.Code)
	}

	if _, err := repo.FindByID(testUser.Subject, f.Id); !errors.Is(err, ErrFeedNotFound) {
		t.Error("feed was not deleted")
	}
}

func TestImportFeeds(t *testing.T) {
	r, repo := newTestRouter()

	id1 := uuid.New()
	id2 := uuid.New()
	body := fmt.Sprintf(`{
		"feeds": [
			{"id":"%s","startTime":"2026-02-24T07:00:00Z","durationMinutes":10,"type":"breast","breastSideStartedOn":"right","notes":""},
			{"id":"%s","startTime":"2026-02-24T10:00:00Z","durationMinutes":12,"amountOz":4.5,"type":"formula","notes":""}
		]
	}`, id1, id2)

	req, _ := http.NewRequest("POST", "/api/v1/feeds/import", bytes.NewBufferString(body))
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

	// Verify feeds are scoped to the correct user
	f, err := repo.FindByID(testUser.Subject, id1)
	if err != nil {
		t.Fatalf("imported feed not found: %v", err)
	}
	if f.UserID != testUser.Subject {
		t.Errorf("user_id not set from JWT on import")
	}
}

func TestImportSkipsInvalidRows(t *testing.T) {
	r, _ := newTestRouter()

	// One valid row, one missing type, one missing id
	validID := uuid.New()
	body := fmt.Sprintf(`{
		"feeds": [
			{"id":"%s","startTime":"2026-02-24T07:00:00Z","durationMinutes":10,"type":"breast"},
			{"id":"%s","startTime":"2026-02-24T10:00:00Z","durationMinutes":12,"type":""},
			{"startTime":"2026-02-24T11:00:00Z","durationMinutes":5,"type":"bottle"}
		]
	}`, validID, uuid.New())

	req, _ := http.NewRequest("POST", "/api/v1/feeds/import", bytes.NewBufferString(body))
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

func TestCreateFeedRejectsInvalidType(t *testing.T) {
	r, _ := newTestRouter()

	body := `{"startTime":"2026-02-25T08:00:00Z","durationMinutes":10,"type":"invalid"}`
	req, _ := http.NewRequest("POST", "/api/v1/feeds", bytes.NewBufferString(body))
	req = withAuth(req)

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid type, got %d", rr.Code)
	}
}

func TestCreateFeedWithAmount(t *testing.T) {
	r, _ := newTestRouter()

	body := `{"startTime":"2026-02-25T08:00:00Z","durationMinutes":15,"amountOz":4.5,"type":"bottle"}`
	req, _ := http.NewRequest("POST", "/api/v1/feeds", bytes.NewBufferString(body))
	req = withAuth(req)

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", rr.Code, rr.Body.String())
	}

	var created Feed
	if err := json.NewDecoder(rr.Body).Decode(&created); err != nil {
		t.Fatal(err)
	}
	if created.AmountOz != 4.5 {
		t.Errorf("unexpected amount_oz: got %f want %f", created.AmountOz, 4.5)
	}
}

func TestCreateFeedOmittedAmountOzDefaultsToZero(t *testing.T) {
	r, _ := newTestRouter()

	// omission of amountOz should default to 0 and pass validation
	body := `{"startTime":"2026-02-25T08:00:00Z","durationMinutes":15,"type":"bottle"}`
	req, _ := http.NewRequest("POST", "/api/v1/feeds", bytes.NewBufferString(body))
	req = withAuth(req)

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", rr.Code, rr.Body.String())
	}

	var created Feed
	if err := json.NewDecoder(rr.Body).Decode(&created); err != nil {
		t.Fatal(err)
	}
	if created.AmountOz != 0 {
		t.Errorf("unexpected amount_oz: got %f want %f", created.AmountOz, 0.0)
	}
}

func TestCreateFeedRejectsInvalidAmount(t *testing.T) {
	r, _ := newTestRouter()

	tests := []struct {
		amount float64
	}{
		{-1.0},
		{25.5},
	}

	for _, tt := range tests {
		body := fmt.Sprintf(`{"startTime":"2026-02-25T08:00:00Z","durationMinutes":15,"amountOz":%f,"type":"bottle"}`, tt.amount)
		req, _ := http.NewRequest("POST", "/api/v1/feeds", bytes.NewBufferString(body))
		req = withAuth(req)

		rr := httptest.NewRecorder()
		r.ServeHTTP(rr, req)

		if rr.Code != http.StatusBadRequest {
			t.Errorf("expected 400 for invalid amount %f, got %d", tt.amount, rr.Code)
		}
	}
}

func TestRequestFailsWhenNoAuthToken(t *testing.T) {
	r, _ := newTestRouter()

	req, _ := http.NewRequest("GET", "/api/v1/feeds", nil)
	// Deliberately no auth context

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
}
