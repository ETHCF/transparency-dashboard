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
