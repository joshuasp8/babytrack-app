package feed

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

type FeedHttpHandler struct {
	service *FeedService
}

func NewHttpHandler(service *FeedService) *FeedHttpHandler {
	return &FeedHttpHandler{service: service}
}

func (h *FeedHttpHandler) Router(mx ...router.Middleware) http.Handler {
	r := router.NewRouter(mx...)
	r.Get("/api/v1/feeds", h.getAll)
	r.Get("/api/v1/feeds/{id}", h.getById)
	r.Post("/api/v1/feeds", h.create)
	r.Put("/api/v1/feeds/{id}", h.update)
	r.Delete("/api/v1/feeds/{id}", h.delete)
	r.Post("/api/v1/feeds/import", h.importFeeds)
	return r
}

/**
 * @api {get} /api/v1/feeds Get all feeds
 * @apiName GetFeeds
 * @apiSuccess {FeedListResponse} response contains Array of feeds
 */
func (h *FeedHttpHandler) getAll(w http.ResponseWriter, r *http.Request) {
	userID, err := extractCurrentUserID(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	feeds, err := h.service.GetAll(userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Return an empty array rather than null when there are no feeds
	if feeds == nil {
		feeds = []*Feed{}
	}
	httputils.WriteJsonResponseOk(w, feeds)
}

/**
 * @api {get} /api/v1/feeds/{id} Get feed by ID
 * @apiName GetFeedById
 * @apiSuccess {FeedResponse} response contains Feed
 */
func (h *FeedHttpHandler) getById(w http.ResponseWriter, r *http.Request) {
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

	feed, err := h.service.GetById(userID, id)
	if err != nil {
		WriteErrorResponse(w, err)
		return
	}
	httputils.WriteJsonResponseOk(w, feed)
}

/**
 * @api {post} /api/v1/feeds Create feed
 * @apiName CreateFeed
 * @apiSuccess {FeedResponse} response contains Feed
 */
func (h *FeedHttpHandler) create(w http.ResponseWriter, r *http.Request) {
	userID, err := extractCurrentUserID(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	req, err := httputils.DeserializeRequest(r, &CreateFeedRequest{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	feed, err := h.service.Create(userID, req)
	if err != nil {
		WriteErrorResponse(w, err)
		return
	}
	httputils.WriteJsonResponse(w, feed, http.StatusCreated)
}

/**
 * @api {put} /api/v1/feeds/{id} Update feed
 * @apiName UpdateFeed
 * @apiSuccess {FeedResponse} response contains Feed
 */
func (h *FeedHttpHandler) update(w http.ResponseWriter, r *http.Request) {
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

	req, err := httputils.DeserializeRequest(r, &UpdateFeedRequest{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	feed, err := h.service.Update(userID, id, req)
	if err != nil {
		WriteErrorResponse(w, err)
		return
	}
	httputils.WriteJsonResponseOk(w, feed)
}

/**
 * @api {delete} /api/v1/feeds/{id} Delete feed
 * @apiName DeleteFeed
 */
func (h *FeedHttpHandler) delete(w http.ResponseWriter, r *http.Request) {
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

/**
 * @api {post} /api/v1/feeds/import Import feeds
 * @apiName ImportFeeds
 * @apiSuccess {Object} response contains imported and skipped counts
 */
func (h *FeedHttpHandler) importFeeds(w http.ResponseWriter, r *http.Request) {
	userID, err := extractCurrentUserID(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	req, err := httputils.DeserializeRequest(r, &ImportFeedsRequest{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	imported, err := h.service.Import(userID, req.Feeds)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("import: user %s imported %d/%d feeds", userID, imported, len(req.Feeds))

	httputils.WriteJsonResponse(w, map[string]int{
		"imported": imported,
		"skipped":  len(req.Feeds) - imported,
	}, http.StatusOK)
}

// extractCurrentUserID retrieves the authenticated user's ID from the request context.
func extractCurrentUserID(r *http.Request) (string, error) {
	userData := r.Context().Value(middleware.UserKey)
	if userData == nil {
		return "", errors.New("no user data in request context")
	}
	return userData.(*auth.UserClaims).Subject, nil
}
