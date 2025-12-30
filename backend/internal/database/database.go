package database

import (
    "database/sql"
    "errors"
    "fmt"
    "log"
    "os"
    "path/filepath"
    "strings"

    "github.com/golang-migrate/migrate/v4"
    "github.com/golang-migrate/migrate/v4/database/postgres"
    _ "github.com/golang-migrate/migrate/v4/source/file"
    _ "github.com/lib/pq"
)

// findCAPath returns the path to the Supabase CA cert if it exists.
func findCAPath() string {
	candidates := []string{
		"supabase-ca-chain.pem",
		"/workspace/supabase-ca-chain.pem",
	}
	for _, path := range candidates {
		if _, err := os.Stat(path); err == nil {
			return path
		}
	}
	return ""
}

func Connect(databaseURL string) (*sql.DB, error) {
	// Add sslrootcert if CA cert is available and not already specified
	if caPath := findCAPath(); caPath != "" && !strings.Contains(databaseURL, "sslrootcert") {
		sep := "?"
		if strings.Contains(databaseURL, "?") {
			sep = "&"
		}
		databaseURL = databaseURL + sep + "sslrootcert=" + caPath
	}

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

// RunMigrations applies migrations from the migrations directory using golang-migrate.
// MIGRATIONS_DIR env var can override the default directory (backend/migrations or ./migrations).
func RunMigrations(db *sql.DB) error {
	dir := resolveMigrationsDir()
	if dir == "" {
		return errors.New("no migrations directory found")
	}

	// Ensure there are migration files
	files, err := os.ReadDir(dir)
	if err != nil {
		return fmt.Errorf("failed to read migrations dir %s: %w", dir, err)
	}
	hasSQL := false
	for _, f := range files {
		if !f.IsDir() && strings.HasSuffix(f.Name(), ".sql") {
			hasSQL = true
			break
		}
	}
	if !hasSQL {
		return errors.New("no migration files found")
	}

	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		return fmt.Errorf("failed to init migration driver: %w", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		fmt.Sprintf("file://%s", filepath.ToSlash(dir)),
		"postgres",
		driver,
	)
    if err != nil {
        return fmt.Errorf("failed to init migrate: %w", err)
    }

	log.Printf("migrations: starting (dir=%s)", dir)

	// Check for dirty state and auto-recover by forcing to current version as clean
	// This allows the migration to be retried (assuming migrations are idempotent)
	if version, dirty, err := m.Version(); err == nil && dirty {
		log.Printf("migrations: detected dirty state at version %d, marking as clean to allow retry", version)
		if err := m.Force(int(version)); err != nil {
			log.Printf("migrations: warning - could not force clean state: %v", err)
		}
	}

	if err := m.Up(); err != nil {
		if errors.Is(err, migrate.ErrNoChange) {
			log.Printf("migrations: no change (already at latest)")
		} else {
			return fmt.Errorf("migration failed: %w", err)
		}
	}

	if v, dirty, err := m.Version(); err == nil {
		log.Printf("migrations: completed version=%d dirty=%v", v, dirty)
	} else if errors.Is(err, migrate.ErrNilVersion) {
		log.Printf("migrations: no version applied yet (nil version)")
	} else {
		log.Printf("migrations: version check failed: %v", err)
	}

    return nil
}

func resolveMigrationsDir() string {
	if dir := strings.TrimSpace(os.Getenv("MIGRATIONS_DIR")); dir != "" {
		return dir
	}
	candidates := []string{
		filepath.Join("backend", "migrations"),
		"migrations",
	}
	for _, c := range candidates {
		if stat, err := os.Stat(c); err == nil && stat.IsDir() {
			// ensure deterministic ordering if multiple options exist
			return c
		}
	}
	return ""
}
