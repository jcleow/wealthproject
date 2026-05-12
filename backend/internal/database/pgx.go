package database

import (
	"context"
	"crypto/x509"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

// loadSupabaseCA loads the Supabase CA certificate chain if available.
func loadSupabaseCA() *x509.CertPool {
	candidates := []string{
		"supabase-ca-chain.pem",
		"/workspace/supabase-ca-chain.pem",
	}
	for _, path := range candidates {
		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		pool := x509.NewCertPool()
		if pool.AppendCertsFromPEM(data) {
			return pool
		}
	}
	return nil
}

// ConnectPgx creates a new pgxpool connection pool.
// This is used for financial_v2 repositories that benefit from pgx features.
func ConnectPgx(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database URL: %w", err)
	}

	// Configure pool settings
	config.MaxConns = 25
	config.MinConns = 5

	// Load Supabase CA cert for SSL verification (only if TLS is already enabled by the connection string)
	if caPool := loadSupabaseCA(); caPool != nil && config.ConnConfig.TLSConfig != nil {
		config.ConnConfig.TLSConfig.RootCAs = caPool
	}

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	// Verify connection
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return pool, nil
}
