package version

import (
	"encoding/json"
	"net/http"
)

var (
	// Set via build flags: -ldflags "-X babytrack/internal/version.Version=1.0.0 -X babytrack/internal/version.BuildTime=..."
	Version   = "dev-0.0.1"
	BuildTime = ""
)

type VersionResponse struct {
	Version   string `json:"version"`
	BuildTime string `json:"buildTime,omitempty"`
}

// NewVersionHandler creates a version endpoint handler
func NewVersionHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		response := VersionResponse{
			Version:   Version,
			BuildTime: BuildTime,
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	}
}
