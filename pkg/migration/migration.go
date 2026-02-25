package migration

import (
	"database/sql"
	"log"
	embeddings "babytrack"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	_ "github.com/lib/pq"
)

func MigrateDBPostgres(connectionUrl string) error {
	// connect to the database
	db, err := sql.Open("postgres", connectionUrl)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		log.Fatal(err)
	}

	// point to the embedded "migrations" directory
	sourceDriver, err := iofs.New(embeddings.EmbeddedMigrations, "migrations")
	if err != nil {
		log.Fatal(err)
	}

	m, err := migrate.NewWithInstance("iofs", sourceDriver, "postgres", driver)
	if err != nil {
		return err
	}

	// run migrations
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return err
	}

	log.Println("Migrations complete.")
	return nil
}
