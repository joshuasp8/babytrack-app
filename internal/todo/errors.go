package todo

import (
	"errors"
	"net/http"
)

// ---- Errors ----
var ErrTodoNotFound = errors.New("todo not found")

// ---- HTTP Layer Mapping ----
func WriteErrorResponse(w http.ResponseWriter, err error) {
	status := http.StatusInternalServerError
	if errors.Is(err, ErrTodoNotFound) {
		status = http.StatusNotFound
	}
	http.Error(w, err.Error(), status)
}
