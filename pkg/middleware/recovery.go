package middleware

import (
	"fmt"
	"log"
	"net/http"
	"runtime/debug"
)

// RecoveryMiddleware catches panics and returns a 500 error instead of crashing
func RecoveryMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if err := recover(); err != nil {
					// Log the panic with stack trace
					log.Printf("PANIC: %v\n%s", err, debug.Stack())

					// Get request ID if available
					requestID := GetRequestID(r)
					if requestID != "" {
						log.Printf("Request ID: %s", requestID)
					}

					// Return 500 error
					http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				}
			}()

			next.ServeHTTP(w, r)
		})
	}
}

// panicHandler is a custom panic error for better error messages
type panicError struct {
	value interface{}
}

func (p *panicError) Error() string {
	return fmt.Sprintf("panic: %v", p.value)
}
