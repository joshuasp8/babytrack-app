package embeddings

import "embed"

//go:embed migrations
var EmbeddedMigrations embed.FS

//go:embed frontend
var EmbeddedFrontend embed.FS
