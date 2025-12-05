package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	_ "github.com/lib/pq"
)

func main() {
	connStr := "host=localhost port=5432 user=financial_user_dev_2024 password=financial_pass_dev_2024 dbname=financial_db_dev_2024 sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	ctx := context.Background()

	// Check assets count
	var assetCount int
	err = db.QueryRowContext(ctx, "SELECT COUNT(*) FROM finance_assets").Scan(&assetCount)
	if err != nil {
		log.Fatal("Error counting assets:", err)
	}
	fmt.Printf("Total assets in DB: %d\n", assetCount)

	// Check incomes count  
	var incomeCount int
	err = db.QueryRowContext(ctx, "SELECT COUNT(*) FROM finance_incomes").Scan(&incomeCount)
	if err != nil {
		log.Fatal("Error counting incomes:", err)
	}
	fmt.Printf("Total incomes in DB: %d\n", incomeCount)

	// Get sample asset
	rows, err := db.QueryContext(ctx, "SELECT id, name, start_year, user_id FROM finance_assets LIMIT 3")
	if err != nil {
		log.Fatal("Error querying assets:", err)
	}
	defer rows.Close()

	fmt.Println("\nSample assets:")
	for rows.Next() {
		var id, name, userID string
		var startYear int
		if err := rows.Scan(&id, &name, &startYear, &userID); err != nil {
			log.Fatal(err)
		}
		fmt.Printf("  ID: %s, Name: %s, StartYear: %d, UserID: %s\n", id, name, startYear, userID)
	}
}
