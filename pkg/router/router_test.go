package router

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestMiddlewareIsAppliedToHandle(t *testing.T) {
	middlewareCalls := 0
	mw := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			middlewareCalls++
			next.ServeHTTP(w, r)
		})
	}

	r := NewRouter(mw)
	subHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	r.Handle("/sub", subHandler)

	req := httptest.NewRequest("GET", "/sub", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if middlewareCalls != 1 {
		t.Errorf("Handle: middleware called %d times, expected 1", middlewareCalls)
	}

	// Reset and test Get
	middlewareCalls = 0
	r.Get("/get", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	req = httptest.NewRequest("GET", "/get", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if middlewareCalls != 1 {
		t.Errorf("Get: middleware called %d times, expected 1", middlewareCalls)
	}
}
