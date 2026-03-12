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

/* getDevProfileResponse returns a mock profile for development. Uses same details as dev_auth middleware. */
func (h *DevAuthHandler) getDevProfileResponse(w http.ResponseWriter, r *http.Request) {
	httputils.WriteJsonResponseOk(w, struct {
		UserId string `json:"userId"`
		Email string `json:"email"`
	}{UserId: "dev-user-id", Email: "dev@example.com"})
}
