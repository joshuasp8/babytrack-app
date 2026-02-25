package httputils

import (
	"encoding/json"
	"net/http"
)

func WriteJsonResponseOk(w http.ResponseWriter, value any) {
	WriteJsonResponse(w, value, http.StatusOK)
}

func WriteJsonResponse(w http.ResponseWriter, value any, httpStatus int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(httpStatus)
	json.NewEncoder(w).Encode(value)
}

func DeserializeRequest[T any](r *http.Request, target *T) (*T, error) {
	err := json.NewDecoder(r.Body).Decode(target)
	if err != nil {
		return nil, err
	}
	return target, nil
}
