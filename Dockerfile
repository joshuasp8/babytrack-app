# ---- Build stage ----
# 1. Lock the build stage to the machine's native architecture (e.g., arm64 on M1/M2/M3)
#    This prevents slow QEMU emulation during the build.
FROM --platform=$BUILDPLATFORM golang:1.25 AS build

WORKDIR /app

# 2. Copy go.sum along with go.mod to ensure reproducible builds
COPY go.mod go.sum ./
RUN go mod download

COPY . .

# 3. Use Docker's automatic ARGs to tell Go what to build for
ARG TARGETOS
ARG TARGETARCH

# 4. Version info injected at build time
ARG APP_VERSION=0.0.3

# 5. Build with version and build time baked in via ldflags
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -ldflags "\
      -X babytrack/internal/version.Version=${APP_VERSION} \
      -X babytrack/internal/version.BuildTime=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    -o app cmd/main.go

# ---- Runtime stage ----
# 5. Switch to 'static' distroless since CGO is 0 (smaller & safer)
FROM gcr.io/distroless/static-debian12

WORKDIR /app

COPY --from=build /app/app app

EXPOSE 8080

USER nonroot:nonroot

ENTRYPOINT ["/app/app"]