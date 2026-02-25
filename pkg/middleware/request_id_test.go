package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRequestIDMiddleware_GeneratesNewID(t *testing.T) {
	var id string
	handler := RequestIDMiddleware()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify request ID is in context
		id = GetRequestID(r)
		if id == "" {
			t.Error("expected request ID in context, got empty string")
		}
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	// Verify X-Request-ID header is set on response
	responseID := rr.Header().Get("X-Request-ID")
	if responseID == "" {
		t.Error("expected X-Request-ID header in response, got empty string")
	}
	if id != responseID {
		t.Errorf("expected context request ID to be %q, got %q", responseID, id)
	}
}

func TestRequestIDMiddleware_RetainsUpstreamID(t *testing.T) {
	upstreamID := "upstream-trace-abc-123"

	var contextID string
	handler := RequestIDMiddleware()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		contextID = GetRequestID(r)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("X-Request-ID", upstreamID)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	// Context should contain the upstream ID, not a generated one
	if contextID != upstreamID {
		t.Errorf("expected context request ID to be %q, got %q", upstreamID, contextID)
	}

	// Response header should echo back the upstream ID
	responseID := rr.Header().Get("X-Request-ID")
	if responseID != upstreamID {
		t.Errorf("expected response X-Request-ID to be %q, got %q", upstreamID, responseID)
	}
}
