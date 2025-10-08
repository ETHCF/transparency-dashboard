//go:build integration
// +build integration

package db

import (
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gopkg.in/guregu/null.v4"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/types"
)

func GetTestBudgetDB(t *testing.T) BudgetDB {
	bdb, err := NewBudgetDB(t.Context(), conf, dbConn)
	require.NoError(t, err)
	return bdb
}

func Test_BudgetDB_CreateAndGetMonthlyBudgets(t *testing.T) {
	var (
		db     = GetTestBudgetDB(t)
		budget = types.MonthlyBudget{
			ID:        uuid.New(),
			Month:     time.Date(2025, 10, 1, 0, 0, 0, 0, time.UTC),
			Amount:    "10000.00",
			Category:  "operations",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
	)

	// Create budget
	budgetID, err := db.CreateMonthlyBudget(t.Context(), budget.ToCreate())
	require.NoError(t, err)
	require.NotEqual(t, uuid.Nil, budgetID)

	// Get budgets from start of 2025
	from := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	budgets, err := db.GetMonthlyBudgets(t.Context(), from, null.Time{})
	require.NoError(t, err)
	require.NotEmpty(t, budgets)

	// Check if our test budget is in the results
	var found bool
	for _, b := range budgets {
		if b.ID == budgetID {
			found = true
			require.Equal(t, budget.Month.Format("2006-01-02"), b.Month.Format("2006-01-02"))
			require.Equal(t, budget.Amount, b.Amount)
			require.Equal(t, budget.Category, b.Category)
			break
		}
	}
	require.True(t, found, "created budget not found in retrieved budgets")

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM monthly_budgets WHERE id = $1", budgetID)
	require.NoError(t, err)
}

func Test_BudgetDB_GetMonthlyBudgetsWithDateRange(t *testing.T) {
	var (
		db      = GetTestBudgetDB(t)
		budget1 = types.MonthlyBudget{
			ID:        uuid.New(),
			Month:     time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC),
			Amount:    "5000.00",
			Category:  "technology",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		budget2 = types.MonthlyBudget{
			ID:        uuid.New(),
			Month:     time.Date(2025, 10, 1, 0, 0, 0, 0, time.UTC),
			Amount:    "6000.00",
			Category:  "technology",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		budget3 = types.MonthlyBudget{
			ID:        uuid.New(),
			Month:     time.Date(2025, 11, 1, 0, 0, 0, 0, time.UTC),
			Amount:    "7000.00",
			Category:  "technology",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
	)

	// Create budgets
	id1, err := db.CreateMonthlyBudget(t.Context(), budget1.ToCreate())
	require.NoError(t, err)
	id2, err := db.CreateMonthlyBudget(t.Context(), budget2.ToCreate())
	require.NoError(t, err)
	id3, err := db.CreateMonthlyBudget(t.Context(), budget3.ToCreate())
	require.NoError(t, err)

	// Get budgets for October 2025 only
	from := time.Date(2025, 10, 1, 0, 0, 0, 0, time.UTC)
	to := null.TimeFrom(time.Date(2025, 10, 31, 0, 0, 0, 0, time.UTC))
	budgets, err := db.GetMonthlyBudgets(t.Context(), from, to)
	require.NoError(t, err)
	require.NotEmpty(t, budgets)

	// Should only find budget2 (October)
	foundOctober := false
	for _, b := range budgets {
		if b.ID == id2 {
			foundOctober = true
		}
		// Make sure September and November budgets are not in the results
		require.NotEqual(t, id1, b.ID, "September budget should not be in October range")
		require.NotEqual(t, id3, b.ID, "November budget should not be in October range")
	}
	require.True(t, foundOctober, "October budget should be found")

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM monthly_budgets WHERE id IN ($1, $2, $3)", id1, id2, id3)
	require.NoError(t, err)
}

func Test_BudgetDB_UpdateMonthlyBudget(t *testing.T) {
	var (
		db     = GetTestBudgetDB(t)
		budget = types.MonthlyBudget{
			ID:        uuid.New(),
			Month:     time.Date(2025, 10, 1, 0, 0, 0, 0, time.UTC),
			Amount:    "8000.00",
			Category:  "legal",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
	)

	// Create budget
	budgetID, err := db.CreateMonthlyBudget(t.Context(), budget.ToCreate())
	require.NoError(t, err)

	// Update budget
	budget.ID = budgetID
	budget.Amount = "12000.00"
	budget.Category = "legal_updated"

	err = db.UpdateMonthlyBudget(t.Context(), budgetID, budget)
	require.NoError(t, err)

	// Verify updates by fetching
	from := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	budgets, err := db.GetMonthlyBudgets(t.Context(), from, null.Time{})
	require.NoError(t, err)

	found := false
	for _, b := range budgets {
		if b.ID == budgetID {
			found = true
			require.Equal(t, "12000.00", b.Amount)
			require.Equal(t, "legal_updated", b.Category)
			break
		}
	}
	require.True(t, found, "updated budget not found")

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM monthly_budgets WHERE id = $1", budgetID)
	require.NoError(t, err)
}

func Test_BudgetDB_UpdateMonthlyBudget_NotFound(t *testing.T) {
	var (
		db            = GetTestBudgetDB(t)
		nonExistentID = uuid.New()
		budget        = types.MonthlyBudget{
			ID:        nonExistentID,
			Month:     time.Date(2025, 10, 1, 0, 0, 0, 0, time.UTC),
			Amount:    "5000.00",
			Category:  "operations",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
	)

	// Try to update non-existent budget
	err := db.UpdateMonthlyBudget(t.Context(), nonExistentID, budget)
	require.Error(t, err)
	require.Contains(t, err.Error(), "monthly budget not found")
}

func Test_BudgetDB_DeleteMonthlyBudget(t *testing.T) {
	var (
		db     = GetTestBudgetDB(t)
		budget = types.MonthlyBudget{
			ID:        uuid.New(),
			Month:     time.Date(2025, 10, 1, 0, 0, 0, 0, time.UTC),
			Amount:    "3000.00",
			Category:  "travel",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
	)

	// Create budget
	budgetID, err := db.CreateMonthlyBudget(t.Context(), budget.ToCreate())
	require.NoError(t, err)

	// Delete budget
	err = db.DeleteMonthlyBudget(t.Context(), budgetID)
	require.NoError(t, err)

	// Verify budget no longer exists
	from := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	budgets, err := db.GetMonthlyBudgets(t.Context(), from, null.Time{})
	require.NoError(t, err)

	for _, b := range budgets {
		require.NotEqual(t, budgetID, b.ID, "deleted budget should not exist")
	}

	// Try to delete non-existent budget
	err = db.DeleteMonthlyBudget(t.Context(), budgetID)
	require.Error(t, err)
	require.Contains(t, err.Error(), fmt.Sprintf("monthly budget %s not found", budgetID))
}

func Test_BudgetDB_CreateAndGetMonthlyBudgetAllocations(t *testing.T) {
	var (
		db         = GetTestBudgetDB(t)
		allocation = types.MonthlyBudgetAllocation{
			ID:        uuid.New(),
			Manager:   null.NewString("0x6e8b11a54c8e80ac44279a5e6ad3dabd55280987", true),
			Category:  "engineering",
			Amount:    "15000.00",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
	)

	// Create allocation
	allocationID, err := db.CreateMonthlyBudgetAllocation(t.Context(), allocation.ToCreate())
	require.NoError(t, err)
	require.NotEqual(t, uuid.Nil, allocationID)

	// Get allocations
	allocations, err := db.GetMonthlyBudgetAllocations(t.Context())
	require.NoError(t, err)
	require.NotEmpty(t, allocations)

	// Check if our test allocation is in the results
	var found bool
	for _, a := range allocations {
		if a.ID == allocationID {
			found = true
			require.Equal(t, allocation.Manager, a.Manager)
			require.Equal(t, allocation.Category, a.Category)
			require.Equal(t, allocation.Amount, a.Amount)
			break
		}
	}
	require.True(t, found, "created allocation not found in retrieved allocations")

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM monthly_budget_allocations WHERE id = $1", allocationID)
	require.NoError(t, err)
}

func Test_BudgetDB_CreateMonthlyBudgetAllocationNullManager(t *testing.T) {
	var (
		db         = GetTestBudgetDB(t)
		allocation = types.MonthlyBudgetAllocation{
			ID:        uuid.New(),
			Manager:   null.NewString("", false), // NULL manager
			Category:  "general",
			Amount:    "5000.00",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
	)

	// Create allocation
	allocationID, err := db.CreateMonthlyBudgetAllocation(t.Context(), allocation.ToCreate())
	require.NoError(t, err)
	require.NotEqual(t, uuid.Nil, allocationID)

	// Get allocations
	allocations, err := db.GetMonthlyBudgetAllocations(t.Context())
	require.NoError(t, err)

	// Check if our test allocation is in the results
	var found bool
	for _, a := range allocations {
		if a.ID == allocationID {
			found = true
			require.Empty(t, a.Manager)
			require.Equal(t, allocation.Category, a.Category)
			break
		}
	}
	require.True(t, found, "created allocation not found")

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM monthly_budget_allocations WHERE id = $1", allocationID)
	require.NoError(t, err)
}

func Test_BudgetDB_UpdateMonthlyBudgetAllocation(t *testing.T) {
	var (
		db         = GetTestBudgetDB(t)
		allocation = types.MonthlyBudgetAllocation{
			ID:        uuid.New(),
			Manager:   null.NewString("0xd8717a76e1791af9c70287033eb55c65330ae6dc", true),
			Category:  "marketing",
			Amount:    "7000.00",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
	)

	// Create allocation
	allocationID, err := db.CreateMonthlyBudgetAllocation(t.Context(), allocation.ToCreate())
	require.NoError(t, err)

	// Update allocation
	allocation.ID = allocationID
	allocation.Manager = null.NewString("0x5ec046a0a9378f7c82dfa816f02be178e0b6f9f2", true)
	allocation.Amount = "9000.00"

	err = db.UpdateMonthlyBudgetAllocation(t.Context(), allocationID, allocation)
	require.NoError(t, err)

	// Verify updates by fetching
	allocations, err := db.GetMonthlyBudgetAllocations(t.Context())
	require.NoError(t, err)

	found := false
	for _, a := range allocations {
		if a.ID == allocationID {
			found = true
			require.Equal(t, "0x5ec046a0a9378f7c82dfa816f02be178e0b6f9f2", a.Manager.String)
			require.Equal(t, "9000.00", a.Amount)
			break
		}
	}
	require.True(t, found, "updated allocation not found")

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM monthly_budget_allocations WHERE id = $1", allocationID)
	require.NoError(t, err)
}

func Test_BudgetDB_UpdateMonthlyBudgetAllocation_NotFound(t *testing.T) {
	var (
		db            = GetTestBudgetDB(t)
		nonExistentID = uuid.New()
		allocation    = types.MonthlyBudgetAllocation{
			ID:        nonExistentID,
			Manager:   null.NewString("0xebca8043ab4f1c26cf37f1d10c7d04383e88a7d9", true),
			Category:  "test",
			Amount:    "1000.00",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
	)

	// Try to update non-existent allocation
	err := db.UpdateMonthlyBudgetAllocation(t.Context(), nonExistentID, allocation)
	require.Error(t, err)
	require.Contains(t, err.Error(), "monthly budget allocation not found")
}

func Test_BudgetDB_DeleteMonthlyBudgetAllocation(t *testing.T) {
	var (
		db         = GetTestBudgetDB(t)
		allocation = types.MonthlyBudgetAllocation{
			ID:        uuid.New(),
			Manager:   null.NewString("0x1dda38807a9ef3b98127d3a0dc7ff9756b1268da", true),
			Category:  "research",
			Amount:    "4000.00",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
	)

	// Create allocation
	allocationID, err := db.CreateMonthlyBudgetAllocation(t.Context(), allocation.ToCreate())
	require.NoError(t, err)

	// Delete allocation
	err = db.DeleteMonthlyBudgetAllocation(t.Context(), allocationID)
	require.NoError(t, err)

	// Verify allocation no longer exists
	allocations, err := db.GetMonthlyBudgetAllocations(t.Context())
	require.NoError(t, err)

	for _, a := range allocations {
		require.NotEqual(t, allocationID, a.ID, "deleted allocation should not exist")
	}

	// Try to delete non-existent allocation
	err = db.DeleteMonthlyBudgetAllocation(t.Context(), allocationID)
	require.Error(t, err)
	require.Contains(t, err.Error(), fmt.Sprintf("monthly budget allocation %s not found", allocationID))
}

func Test_BudgetDB_GetMonthlyBudgets_EmptyResult(t *testing.T) {
	var (
		db = GetTestBudgetDB(t)
	)

	// Get budgets from far future - should return empty slice
	from := time.Date(2099, 1, 1, 0, 0, 0, 0, time.UTC)
	budgets, err := db.GetMonthlyBudgets(t.Context(), from, null.Time{})
	require.NoError(t, err)
	require.Empty(t, budgets)
}

func Test_BudgetDB_GetMonthlyBudgetAllocations_EmptyResult(t *testing.T) {
	var (
		db = GetTestBudgetDB(t)
	)

	// Clean up all allocations first
	_, err := dbConn.ExecContext(t.Context(), "DELETE FROM monthly_budget_allocations")
	require.NoError(t, err)

	// Get allocations - should return empty slice
	allocations, err := db.GetMonthlyBudgetAllocations(t.Context())
	require.NoError(t, err)
	require.Empty(t, allocations)
}
