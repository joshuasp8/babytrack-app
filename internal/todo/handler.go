package todo

import (
	"errors"
	"log"
	"net/http"
	"babytrack/pkg/auth"
	"babytrack/pkg/httputils"
	"babytrack/pkg/middleware"
	"babytrack/pkg/router"

	"github.com/google/uuid"
)

type TodoHttpHandler struct {
	service *TodoService
}

func NewHttpHandler(service *TodoService) *TodoHttpHandler {
	return &TodoHttpHandler{
		service: service,
	}
}

func (this *TodoHttpHandler) Router(middleware ...router.Middleware) http.Handler {
	router := router.NewRouter(middleware...)
	router.Get("/api/v1/todos", this.getAll)
	router.Get("/api/v1/todos/{id}", this.getById)
	router.Post("/api/v1/todos", this.create)
	router.Put("/api/v1/todos/{id}", this.update)
	router.Delete("/api/v1/todos/{id}", this.delete)

	return router
}

func (this *TodoHttpHandler) getAll(w http.ResponseWriter, r *http.Request) {
	userId, err := this.extractCurrentUserId(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}
	log.Println("User ID: ", userId)

	todos, err := this.service.GetAll()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	httputils.WriteJsonResponseOk(w, todos)
}

func (this *TodoHttpHandler) getById(w http.ResponseWriter, r *http.Request) {
	userId, err := this.extractCurrentUserId(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}
	log.Println("User ID: ", userId)

	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	todo, err := this.service.GetById(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	httputils.WriteJsonResponseOk(w, todo)
}

func (this *TodoHttpHandler) create(w http.ResponseWriter, r *http.Request) {
	userId, err := this.extractCurrentUserId(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}
	log.Println("User ID: ", userId)

	requestBody, err := httputils.DeserializeRequest(r, &CreateTodoRequest{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
	}

	todo, err := this.service.Create(requestBody)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	httputils.WriteJsonResponse(w, todo, http.StatusCreated)
}

func (this *TodoHttpHandler) update(w http.ResponseWriter, r *http.Request) {
	userId, err := this.extractCurrentUserId(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}
	log.Println("User ID: ", userId)

	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	requestBody, err := httputils.DeserializeRequest(r, &UpdateTodoRequest{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	todo, err := this.service.Update(id, requestBody)
	if err != nil {
		WriteErrorResponse(w, err)
		return
	}

	httputils.WriteJsonResponseOk(w, todo)
}

func (this *TodoHttpHandler) delete(w http.ResponseWriter, r *http.Request) {
	userId, err := this.extractCurrentUserId(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}
	log.Println("User ID: ", userId)

	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	err = this.service.Delete(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Extracts the current user ID from the request context.
func (this *TodoHttpHandler) extractCurrentUserId(r *http.Request) (string, error) {
	userData := r.Context().Value(middleware.UserKey)
	if userData == nil {
		return "", errors.New("no user data in request context")
	}
	userClaims := userData.(*auth.UserClaims)
	return userClaims.Subject, nil
}
