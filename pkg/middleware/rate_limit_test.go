package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestRateLimitMiddleware(t *testing.T) {
	// Simple handler that just returns 200 OK
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {})

	t.Run("Under Limit Allows Request", func(t *testing.T) {
		// Limit 2 requests per second
		middleware := NewRateLimitMiddleware(2, time.Second)
		handlerToTest := middleware(nextHandler)

		req := httptest.NewRequest("GET", "http://testing", nil)
		req.RemoteAddr = "192.168.1.1:1234"

		// First request should pass
		rr1 := httptest.NewRecorder()
		handlerToTest.ServeHTTP(rr1, req)
		if status := rr1.Code; status != http.StatusOK {
			t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
		}

		// Second request should pass
		rr2 := httptest.NewRecorder()
		handlerToTest.ServeHTTP(rr2, req)
		if status := rr2.Code; status != http.StatusOK {
			t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
		}
	})

	t.Run("Over Limit Blocks Request", func(t *testing.T) {
		// Limit 1 request per second
		middleware := NewRateLimitMiddleware(1, time.Second)
		handlerToTest := middleware(nextHandler)

		req := httptest.NewRequest("GET", "http://testing", nil)
		req.RemoteAddr = "192.168.1.2:1234"

		// First request should pass
		rr1 := httptest.NewRecorder()
		handlerToTest.ServeHTTP(rr1, req)
		if status := rr1.Code; status != http.StatusOK {
			t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
		}

		// Second request should be rate limited (429)
		rr2 := httptest.NewRecorder()
		handlerToTest.ServeHTTP(rr2, req)
		if status := rr2.Code; status != http.StatusTooManyRequests {
			t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusTooManyRequests)
		}
	})

	t.Run("Window Expiry Resets Limit", func(t *testing.T) {
		// Very short window for testing
		window := 50 * time.Millisecond
		middleware := NewRateLimitMiddleware(1, window)
		handlerToTest := middleware(nextHandler)

		req := httptest.NewRequest("GET", "http://testing", nil)
		req.RemoteAddr = "192.168.1.3:1234"

		// First request should pass
		rr1 := httptest.NewRecorder()
		handlerToTest.ServeHTTP(rr1, req)
		if status := rr1.Code; status != http.StatusOK {
			t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
		}

		// Second request immediately should fail
		rr2 := httptest.NewRecorder()
		handlerToTest.ServeHTTP(rr2, req)
		if status := rr2.Code; status != http.StatusTooManyRequests {
			t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusTooManyRequests)
		}

		// Wait for window to expire
		time.Sleep(window + 10*time.Millisecond)

		// Third request should pass again
		rr3 := httptest.NewRecorder()
		handlerToTest.ServeHTTP(rr3, req)
		if status := rr3.Code; status != http.StatusOK {
			t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
		}
	})

	t.Run("Different IPs Tracked Separately", func(t *testing.T) {
		middleware := NewRateLimitMiddleware(1, time.Second)
		handlerToTest := middleware(nextHandler)

		req1 := httptest.NewRequest("GET", "http://testing", nil)
		req1.RemoteAddr = "10.0.0.1:1234"

		req2 := httptest.NewRequest("GET", "http://testing", nil)
		req2.RemoteAddr = "10.0.0.2:1234"

		// First request IP 1 should pass
		rr1 := httptest.NewRecorder()
		handlerToTest.ServeHTTP(rr1, req1)
		if status := rr1.Code; status != http.StatusOK {
			t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
		}

		// First request IP 2 should pass
		rr2 := httptest.NewRecorder()
		handlerToTest.ServeHTTP(rr2, req2)
		if status := rr2.Code; status != http.StatusOK {
			t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
		}
	})

	t.Run("Respects X-Forwarded-For Header", func(t *testing.T) {
		middleware := NewRateLimitMiddleware(1, time.Second)
		handlerToTest := middleware(nextHandler)

		req1 := httptest.NewRequest("GET", "http://testing", nil)
		req1.RemoteAddr = "127.0.0.1:1234" // Internal proxy IP
		req1.Header.Set("X-Forwarded-For", "203.0.113.1")

		req2 := httptest.NewRequest("GET", "http://testing", nil)
		req2.RemoteAddr = "127.0.0.1:5678"                // Same internal proxy IP
		req2.Header.Set("X-Forwarded-For", "203.0.113.1") // Same forwarded IP

		// First request should pass
		rr1 := httptest.NewRecorder()
		handlerToTest.ServeHTTP(rr1, req1)
		if status := rr1.Code; status != http.StatusOK {
			t.Errorf("handler returned wrong status code for req1: got %v want %v", status, http.StatusOK)
		}

		// Second request from same forwarded IP should fail (Proxy IP is ignored)
		rr2 := httptest.NewRecorder()
		handlerToTest.ServeHTTP(rr2, req2)
		if status := rr2.Code; status != http.StatusTooManyRequests {
			t.Errorf("handler returned wrong status code for req2: got %v want %v", status, http.StatusTooManyRequests)
		}
	})

	t.Run("Respects X-Real-IP Header", func(t *testing.T) {
		middleware := NewRateLimitMiddleware(1, time.Second)
		handlerToTest := middleware(nextHandler)

		req1 := httptest.NewRequest("GET", "http://testing", nil)
		req1.RemoteAddr = "127.0.0.1:1234"
		req1.Header.Set("X-Real-IP", "203.0.113.2")

		req2 := httptest.NewRequest("GET", "http://testing", nil)
		req2.RemoteAddr = "127.0.0.1:5678"
		req2.Header.Set("X-Real-IP", "203.0.113.2")

		// First request should pass
		rr1 := httptest.NewRecorder()
		handlerToTest.ServeHTTP(rr1, req1)
		if status := rr1.Code; status != http.StatusOK {
			t.Errorf("handler returned wrong status code for req1: got %v want %v", status, http.StatusOK)
		}

		// Second request from same Real IP should fail
		rr2 := httptest.NewRecorder()
		handlerToTest.ServeHTTP(rr2, req2)
		if status := rr2.Code; status != http.StatusTooManyRequests {
			t.Errorf("handler returned wrong status code for req2: got %v want %v", status, http.StatusTooManyRequests)
		}
	})
}
