package embeddings

import "embed"

//go:embed migrations
var EmbeddedMigrations embed.FS

//go:embed frontend/src
var EmbeddedFrontend embed.FS
