package middleware

import (
	"context"
	"net/http"

	"github.com/google/uuid"
)

type requestIDKey string

const RequestIDKey requestIDKey = "requestID"

// RequestIDMiddleware propagates or generates a unique request ID for each request.
// If an incoming X-Request-ID header exists (e.g. from an upstream service), it is retained.
// Otherwise, a new UUID is generated.
func RequestIDMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Retain existing request ID from upstream, or generate a new one
			requestID := r.Header.Get("X-Request-ID")
			if requestID == "" {
				requestID = uuid.New().String()
			}

			// Add to response header
			w.Header().Set("X-Request-ID", requestID)

			// Add to context
			ctx := context.WithValue(r.Context(), RequestIDKey, requestID)

			// Pass down the chain
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetRequestID extracts request ID from context
func GetRequestID(r *http.Request) string {
	if id, ok := r.Context().Value(RequestIDKey).(string); ok {
		return id
	}
	return ""
}
