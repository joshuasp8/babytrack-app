package sleep

import (
	"errors"
	"net/http"
)

// ---- Errors ----

var ErrSleepNotFound = errors.New("sleep session not found")

// ---- HTTP Layer Mapping ----

func WriteErrorResponse(w http.ResponseWriter, err error) {
	status := http.StatusInternalServerError
	switch {
	case errors.Is(err, ErrSleepNotFound):
		status = http.StatusNotFound
	}
	http.Error(w, err.Error(), status)
}
