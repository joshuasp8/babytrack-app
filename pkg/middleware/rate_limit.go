package middleware

import (
	"net/http"
	"sync"
	"time"

	"babytrack/pkg/httputils"
)

type rateLimitClient struct {
	requests int
	lastSeen time.Time
}

type rateLimiter struct {
	mu      sync.Mutex
	clients map[string]*rateLimitClient
	limit   int
	window  time.Duration
}

// NewRateLimitMiddleware returns a middleware that limits requests by IP address
func NewRateLimitMiddleware(limit int, window time.Duration) func(http.Handler) http.Handler {
	rl := &rateLimiter{
		clients: make(map[string]*rateLimitClient),
		limit:   limit,
		window:  window,
	}

	// Clean up stale clients every minute to prevent memory exhaustion
	go func() {
		for {
			time.Sleep(time.Minute)
			rl.mu.Lock()
			for ip, client := range rl.clients {
				if time.Since(client.lastSeen) > rl.window {
					delete(rl.clients, ip)
				}
			}
			rl.mu.Unlock()
		}
	}()

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Determine original client IP
			ip := r.RemoteAddr
			if forwardedFor := r.Header.Get("X-Forwarded-For"); forwardedFor != "" {
				ip = forwardedFor
			} else if realIP := r.Header.Get("X-Real-IP"); realIP != "" {
				ip = realIP
			}

			rl.mu.Lock()
			if _, found := rl.clients[ip]; !found {
				rl.clients[ip] = &rateLimitClient{requests: 0, lastSeen: time.Now()}
			}

			client := rl.clients[ip]

			// Reset counter if window has passed
			if time.Since(client.lastSeen) > rl.window {
				client.requests = 0
				client.lastSeen = time.Now()
			}

			client.requests++
			client.lastSeen = time.Now()

			if client.requests > rl.limit {
				rl.mu.Unlock()
				httputils.WriteJsonResponse(w, map[string]string{"error": "Too Many Requests"}, http.StatusTooManyRequests)
				return
			}
			rl.mu.Unlock()

			next.ServeHTTP(w, r)
		})
	}
}
