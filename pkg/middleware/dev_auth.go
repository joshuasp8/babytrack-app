package middleware

import (
	"context"
	"net/http"
	"babytrack/pkg/auth"

	"github.com/golang-jwt/jwt/v5"
)

// DevAuthMiddleware injects a dummy user into the request context for development
func DevAuthMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Create dummy claims
			dummyClaims := &auth.UserClaims{
				Email: "dev@example.com",
				RegisteredClaims: jwt.RegisteredClaims{
					Subject: "dev-user-id",
				},
			}

			// Store user info in context
			ctx := context.WithValue(r.Context(), UserKey, dummyClaims)

			// Pass the request down the chain
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
