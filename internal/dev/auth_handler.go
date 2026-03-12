package dev

import (
	"babytrack/pkg/httputils"
	"babytrack/pkg/router"
	"net/http"
)

/* DevAuthHandler provides a mock authentication endpoint for development */
type DevAuthHandler struct {

}

func NewDevAuthHandler() *DevAuthHandler {
	return &DevAuthHandler{}
}

func (h *DevAuthHandler) Router(mx ...router.Middleware) http.Handler {
	r := router.NewRouter(mx...)
	r.Get("/api/v1/auth/me", h.getDevProfileResponse)

	return r
}

/* getDevProfileResponse returns a mock profile for development. User ID is a random UUID. */
func (h *DevAuthHandler) getDevProfileResponse(w http.ResponseWriter, r *http.Request) {
	httputils.WriteJsonResponseOk(w, struct {
		UserId string `json:"userId"`
		Email string `json:"email"`
	}{UserId: "b7c15da8-4fc3-4792-97ce-df7ffe978375", Email: "dev@email.dev"})
}
