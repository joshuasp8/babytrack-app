package middleware

import (
	"context"
	"net/http"
	"babytrack/pkg/auth"
)

// Context key to retrieve user data later
type contextKey string

const UserKey contextKey = "user"

// AuthCookieMiddleware validates JWT tokens from cookies and injects user claims into request context
func AuthCookieMiddleware(authenticator *auth.JwtAuthenticator, cookieName string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// 1. Get the cookie
			cookie, err := r.Cookie(cookieName)
			if err != nil {
				http.Error(w, "Missing auth cookie", http.StatusUnauthorized)
				return
			}

			// 2. Validate using auth package
			claims, err := authenticator.ValidateToken(cookie.Value)
			if err != nil {
				http.Error(w, "Invalid token", http.StatusUnauthorized)
				return
			}

			// 3. Store user info in context
			ctx := context.WithValue(r.Context(), UserKey, claims)

			// 4. Pass the request down the chain
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
