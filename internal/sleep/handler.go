package sleep

import (
	"babytrack/pkg/auth"
	"babytrack/pkg/httputils"
	"babytrack/pkg/middleware"
	"babytrack/pkg/router"
	"errors"
	"log"
	"net/http"

	"github.com/google/uuid"
)

type SleepHttpHandler struct {
	service *SleepService
}

func NewHttpHandler(service *SleepService) *SleepHttpHandler {
	return &SleepHttpHandler{service: service}
}

func (h *SleepHttpHandler) Router(mx ...router.Middleware) http.Handler {
	r := router.NewRouter(mx...)
	r.Get("/api/v1/sleeps", h.getAll)
	r.Get("/api/v1/sleeps/{id}", h.getById)
	r.Post("/api/v1/sleeps", h.create)
	r.Put("/api/v1/sleeps/{id}", h.update)
	r.Delete("/api/v1/sleeps/{id}", h.delete)
	r.Post("/api/v1/sleeps/import", h.importSleeps)
	return r
}

func (h *SleepHttpHandler) getAll(w http.ResponseWriter, r *http.Request) {
	userID, err := extractCurrentUserID(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	sleeps, err := h.service.GetAll(userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if sleeps == nil {
		sleeps = []*Sleep{}
	}
	httputils.WriteJsonResponseOk(w, sleeps)
}

func (h *SleepHttpHandler) getById(w http.ResponseWriter, r *http.Request) {
	userID, err := extractCurrentUserID(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	sleep, err := h.service.GetById(userID, id)
	if err != nil {
		WriteErrorResponse(w, err)
		return
	}
	httputils.WriteJsonResponseOk(w, sleep)
}

func (h *SleepHttpHandler) create(w http.ResponseWriter, r *http.Request) {
	userID, err := extractCurrentUserID(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	req, err := httputils.DeserializeRequest(r, &CreateSleepRequest{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	sleep, err := h.service.Create(userID, req)
	if err != nil {
		WriteErrorResponse(w, err)
		return
	}
	httputils.WriteJsonResponse(w, sleep, http.StatusCreated)
}

func (h *SleepHttpHandler) update(w http.ResponseWriter, r *http.Request) {
	userID, err := extractCurrentUserID(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	req, err := httputils.DeserializeRequest(r, &UpdateSleepRequest{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	sleep, err := h.service.Update(userID, id, req)
	if err != nil {
		WriteErrorResponse(w, err)
		return
	}
	httputils.WriteJsonResponseOk(w, sleep)
}

func (h *SleepHttpHandler) delete(w http.ResponseWriter, r *http.Request) {
	userID, err := extractCurrentUserID(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	if err := h.service.Delete(userID, id); err != nil {
		WriteErrorResponse(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *SleepHttpHandler) importSleeps(w http.ResponseWriter, r *http.Request) {
	userID, err := extractCurrentUserID(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	req, err := httputils.DeserializeRequest(r, &ImportSleepsRequest{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	imported, err := h.service.Import(userID, req.Sleeps)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("import: user %s imported %d/%d sleeps", userID, imported, len(req.Sleeps))

	httputils.WriteJsonResponse(w, map[string]int{
		"imported": imported,
		"skipped":  len(req.Sleeps) - imported,
	}, http.StatusOK)
}

func extractCurrentUserID(r *http.Request) (string, error) {
	userData := r.Context().Value(middleware.UserKey)
	if userData == nil {
		return "", errors.New("no user data in request context")
	}
	return userData.(*auth.UserClaims).Subject, nil
}
