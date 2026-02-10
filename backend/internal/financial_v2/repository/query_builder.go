package repository

import (
	"fmt"
	"strings"
)

// QueryBuilder helps build parameterized SQL WHERE clauses safely.
// It tracks argument indices automatically, preventing off-by-one errors
// that are common when manually managing argIdx across multiple optional filters.
type QueryBuilder struct {
	conditions []string
	args       []any
	argIdx     int
}

// NewQueryBuilder creates a new QueryBuilder with a required initial condition.
// The initialCondition should contain a $1 placeholder for the initialArg.
func NewQueryBuilder(initialCondition string, initialArg any) *QueryBuilder {
	return &QueryBuilder{
		conditions: []string{initialCondition},
		args:       []any{initialArg},
		argIdx:     2,
	}
}

// Where adds a required condition to the WHERE clause.
// The condition string should contain a single placeholder written as %s,
// which will be replaced with the correct $N parameter index.
func (queryBuilder *QueryBuilder) Where(conditionTemplate string, arg any) *QueryBuilder {
	condition := fmt.Sprintf(conditionTemplate, fmt.Sprintf("$%d", queryBuilder.argIdx))
	queryBuilder.conditions = append(queryBuilder.conditions, condition)
	queryBuilder.args = append(queryBuilder.args, arg)
	queryBuilder.argIdx++
	return queryBuilder
}

// WhereOptional adds a condition only if the arg is non-nil.
// The condition string should contain a single placeholder written as %s,
// which will be replaced with the correct $N parameter index.
// If arg is nil, no condition or argument is added.
func (queryBuilder *QueryBuilder) WhereOptional(conditionTemplate string, arg any) *QueryBuilder {
	if arg == nil {
		return queryBuilder
	}
	return queryBuilder.Where(conditionTemplate, arg)
}

// Build returns the combined WHERE clause and the collected arguments.
// The WHERE clause joins all conditions with " AND ".
func (queryBuilder *QueryBuilder) Build() (string, []any) {
	whereClause := strings.Join(queryBuilder.conditions, " AND ")
	return whereClause, queryBuilder.args
}

// ArgIdx returns the next available argument index.
// Useful when appending additional parameterized clauses (e.g. LIMIT, OFFSET)
// after the WHERE clause has been built.
func (queryBuilder *QueryBuilder) ArgIdx() int {
	return queryBuilder.argIdx
}
