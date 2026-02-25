package todo

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
	"babytrack/pkg/auth"
	"babytrack/pkg/middleware"

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

func TestCreateTodo(t *testing.T) {
	// Initialize dependencies
	repository := NewInMemoryRepository()
	service := NewService(repository)
	todohandler := NewHttpHandler(service)
	router := todohandler.Router()

	payload := []byte(`{"title":"Test Todo"}`)
	req, err := http.NewRequest("POST", "/api/v1/todos", bytes.NewBuffer(payload))
	if err != nil {
		t.Fatal(err)
	}
	// populate the request context with a test user's auth data
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserKey, testUser))

	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusCreated {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusCreated)
	}

	var created Todo
	if err := json.NewDecoder(rr.Body).Decode(&created); err != nil {
		t.Fatal(err)
	}

	if created.Title != "Test Todo" {
		t.Errorf("handler returned unexpected title: got %v want %v",
			created.Title, "Test Todo")
	}
}

func TestListTodos(t *testing.T) {
	// Setup
	repository := NewInMemoryRepository()
	service := NewService(repository)
	todohandler := NewHttpHandler(service)
	router := todohandler.Router()

	// Add test data
	repository.Save(&Todo{
		Id:        uuid.New(),
		CreatedAt: time.Now().UTC(),
		Title:     "Existing Todo",
		Completed: false,
	})

	req, err := http.NewRequest("GET", "/api/v1/todos", nil)
	if err != nil {
		t.Fatal(err)
	}
	// populate the request context with a test user's auth data
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserKey, testUser))

	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	var list []Todo
	if err := json.NewDecoder(rr.Body).Decode(&list); err != nil {
		t.Fatal(err)
	}

	if len(list) != 1 {
		t.Errorf("handler returned unexpected number of items: got %v want %v",
			len(list), 1)
	}
	if list[0].Title != "Existing Todo" {
		t.Errorf("handler returned unexpected title: got %v want %v",
			list[0].Title, "Existing Todo")
	}
}

func TestUpdateTodo(t *testing.T) {
	// Setup
	repository := NewInMemoryRepository()
	service := NewService(repository)
	todohandler := NewHttpHandler(service)
	router := todohandler.Router()

	// Add test data
	oldTodo := &Todo{
		Id:        uuid.New(),
		CreatedAt: time.Now().UTC(),
		Title:     "Old Title",
		Completed: false,
	}
	repository.Save(oldTodo)

	payload := []byte(`{"title":"New Title", "completed": true}`)
	req, err := http.NewRequest("PUT", fmt.Sprintf("/api/v1/todos/%s", oldTodo.Id.String()), bytes.NewBuffer(payload))
	if err != nil {
		t.Fatal(err)
	}
	// populate the request context with a test user's auth data
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserKey, testUser))

	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	updated, err := repository.FindByID(oldTodo.Id)
	if err != nil {
		t.Errorf("Todo not found: %v", err)
	}
	if updated.Title != "New Title" {
		t.Errorf("Todo title not updated: got %v want %v",
			updated.Title, "New Title")
	}
	if !updated.Completed {
		t.Errorf("Todo completed status not updated: got %v want %v",
			updated.Completed, true)
	}
}

func TestDeleteTodo(t *testing.T) {
	// Setup
	repository := NewInMemoryRepository()
	service := NewService(repository)
	todohandler := NewHttpHandler(service)
	router := todohandler.Router()

	// Add test data
	todo := &Todo{
		Id:        uuid.New(),
		CreatedAt: time.Now().UTC(),
		Title:     "To Delete",
		Completed: false,
	}
	repository.Save(todo)

	req, err := http.NewRequest("DELETE", fmt.Sprintf("/api/v1/todos/%s", todo.Id.String()), nil)
	if err != nil {
		t.Fatal(err)
	}
	// populate the request context with a test user's auth data
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserKey, testUser))

	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusNoContent {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusNoContent)
	}

	if _, err := repository.FindByID(todo.Id); !errors.Is(err, ErrTodoNotFound) {
		t.Errorf("Todo was not deleted")
	}
}

func TestRequestFailsWhenNoAuthToken(t *testing.T) {
	// Setup
	repository := NewInMemoryRepository()
	service := NewService(repository)
	todohandler := NewHttpHandler(service)
	router := todohandler.Router()

	// Test invalid request (we omit adding an auth token to the context)
	payload := []byte(`{"title":"Test Todo"}`)
	req, err := http.NewRequest("POST", "/api/v1/todos", bytes.NewBuffer(payload))
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusUnauthorized {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusUnauthorized)
	}
}
