// Chi-like syntactic sugar layer on top of stdlib http.ServeMux.
// From: https://gist.githubusercontent.com/alexaandru/747f9d7bdfb1fa35140b359bf23fa820/raw/e2e0725ee489a2cf7fc2245587c34b524ed43020/chi.go
package router

import (
	"net/http"
	"slices"
)

type (
	Middleware func(http.Handler) http.Handler
	router     struct {
		*http.ServeMux
		chain []Middleware
	}
)

func NewRouter(mx ...Middleware) *router {
	return &router{ServeMux: &http.ServeMux{}, chain: mx}
}

func (r *router) Use(mx ...Middleware) {
	r.chain = append(r.chain, mx...)
}

func (r *router) Group(fn func(r *router)) {
	fn(&router{ServeMux: r.ServeMux, chain: slices.Clone(r.chain)})
}

func (r *router) Get(path string, fn http.HandlerFunc, mx ...Middleware) {
	r.handle(http.MethodGet, path, fn, mx)
}

func (r *router) Post(path string, fn http.HandlerFunc, mx ...Middleware) {
	r.handle(http.MethodPost, path, fn, mx)
}

func (r *router) Put(path string, fn http.HandlerFunc, mx ...Middleware) {
	r.handle(http.MethodPut, path, fn, mx)
}

func (r *router) Delete(path string, fn http.HandlerFunc, mx ...Middleware) {
	r.handle(http.MethodDelete, path, fn, mx)
}

func (r *router) Head(path string, fn http.HandlerFunc, mx ...Middleware) {
	r.handle(http.MethodHead, path, fn, mx)
}

func (r *router) Options(path string, fn http.HandlerFunc, mx ...Middleware) {
	r.handle(http.MethodOptions, path, fn, mx)
}

func (r *router) Handle(pattern string, handler http.Handler) {
	mx := slices.Clone(r.chain)
	slices.Reverse(mx)

	for _, m := range mx {
		handler = m(handler)
	}

	r.ServeMux.Handle(pattern, handler)
}

func (r *router) handle(method, path string, fn http.HandlerFunc, mx []Middleware) {
	r.Handle(method+" "+path, r.wrap(fn, mx))
}

func (r *router) wrap(fn http.HandlerFunc, mx []Middleware) http.Handler {

	// Convert HandlerFunc to Handler
	var out http.Handler = fn

	// Apply route-specific middleware (mx) in reverse order
	slices.Reverse(mx)
	for _, m := range mx {
		out = m(out)
	}

	return out
}
