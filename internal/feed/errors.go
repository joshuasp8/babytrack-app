package feed

import (
	"errors"
	"net/http"
)

// ---- Errors ----

var ErrFeedNotFound = errors.New("feed not found")
var ErrInvalidFeedType = errors.New("invalid feed type: must be 'breast', 'bottle', or 'formula'")
var ErrInvalidBreastSide = errors.New("invalid breast side: must be 'left', 'right', or null")

// ---- HTTP Layer Mapping ----

func WriteErrorResponse(w http.ResponseWriter, err error) {
	status := http.StatusInternalServerError
	switch {
	case errors.Is(err, ErrFeedNotFound):
		status = http.StatusNotFound
	case errors.Is(err, ErrInvalidFeedType), errors.Is(err, ErrInvalidBreastSide):
		status = http.StatusBadRequest
	}
	http.Error(w, err.Error(), status)
}
