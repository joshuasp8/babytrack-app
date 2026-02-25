package health

import (
	"database/sql"
	"encoding/json"
	"net/http"
)

type HealthResponse struct {
	Status   string `json:"status"`
	Database string `json:"database,omitempty"`
}

// NewHealthHandler creates a health check handler
func NewHealthHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		response := HealthResponse{
			Status: "ok",
		}

		// Ping database to verify connectivity
		if err := db.Ping(); err != nil {
			response.Status = "degraded"
			response.Database = "disconnected"
			w.WriteHeader(http.StatusServiceUnavailable)
		} else {
			response.Database = "connected"
			w.WriteHeader(http.StatusOK)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}
}
