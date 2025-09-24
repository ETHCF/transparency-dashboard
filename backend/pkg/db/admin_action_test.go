//go:build integration
// +build integration

package db

import (
	"context"
	"testing"
	"time"

	"github.com/ETHCF/ethutils"
	"github.com/stretchr/testify/require"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/types"
)

func GetTestAdminActionDB(t *testing.T) AdminActionDB {
	aadb, err := NewAdminActionDB(context.Background(), conf, dbConn)
	require.NoError(t, err)
	return aadb
}

func Test_AdminActionDB_RecordAdminAction(t *testing.T) {
	var (
		db           = GetTestAdminActionDB(t)
		adminDB      = GetTestAdminDB(t)
		adminAddress = ethutils.GenRandEVMAddr()
		action       = types.AdminAction{
			AdminAddress: adminAddress,
			Action:       "create_grant",
			ResourceType: "grant",
			ResourceID:   "grant_test_001",
			Details: types.AdminActionDetails{
				"grant_name": "Test Grant",
				"amount":     "5000.00",
			},
			CreatedAt: time.Now(),
		}
	)

	// Create admin first to satisfy foreign key constraint
	err := adminDB.AddAdmin(t.Context(), types.Admin{
		Address: adminAddress,
		Name:    "Test Admin",
	})
	require.NoError(t, err)

	// Record admin action
	err = db.RecordAdminAction(t.Context(), action)
	require.NoError(t, err)

	// List admin actions to verify it was recorded
	actions, err := db.ListAdminActions(t.Context(), action.ResourceType, action.ResourceID)
	require.NoError(t, err)
	require.NotEmpty(t, actions)

	// Check if our test action is in the results
	var found bool
	for _, a := range actions {
		if a.AdminAddress == action.AdminAddress && a.Action == action.Action {
			found = true
			require.Equal(t, action.ResourceType, a.ResourceType)
			require.Equal(t, action.ResourceID, a.ResourceID)
			break
		}
	}
	require.True(t, found, "recorded admin action not found in list")

	// Clean up
	_, err = dbConn.ExecContext(t.Context(),
		"DELETE FROM admin_actions WHERE admin_address = $1 AND resource_type = $2 AND resource_id = $3",
		action.AdminAddress, action.ResourceType, action.ResourceID)
	require.NoError(t, err)

	err = adminDB.RemoveAdmin(t.Context(), adminAddress)
	require.NoError(t, err)
}

func Test_AdminActionDB_ListAdminActions(t *testing.T) {
	var (
		db        = GetTestAdminActionDB(t)
		adminDB   = GetTestAdminDB(t)
		adminAddr = ethutils.GenRandEVMAddr()
		actions   = []types.AdminAction{
			{
				AdminAddress: adminAddr,
				Action:       "create_expense",
				ResourceType: "expense",
				ResourceID:   "exp_test_001",
				Details:      types.AdminActionDetails{"item": "Office Supplies"},
				CreatedAt:    time.Now(),
			},
			{
				AdminAddress: adminAddr,
				Action:       "update_expense",
				ResourceType: "expense",
				ResourceID:   "exp_test_001",
				Details:      types.AdminActionDetails{"field": "quantity", "new_value": 5},
				CreatedAt:    time.Now().Add(1 * time.Minute),
			},
			{
				AdminAddress: adminAddr,
				Action:       "create_grant",
				ResourceType: "grant",
				ResourceID:   "grant_test_002",
				Details:      types.AdminActionDetails{"grant_name": "Another Grant"},
				CreatedAt:    time.Now().Add(2 * time.Minute),
			},
		}
	)

	// Create admin first to satisfy foreign key constraint
	err := adminDB.AddAdmin(t.Context(), types.Admin{
		Address: adminAddr,
		Name:    "Test Admin",
	})
	require.NoError(t, err)

	// Record multiple admin actions
	for _, action := range actions {
		err = db.RecordAdminAction(t.Context(), action)
		require.NoError(t, err)
	}

	// List all expense-related actions
	expenseActions, err := db.ListAdminActions(t.Context(), "expense", "exp_test_001")
	require.NoError(t, err)
	require.Len(t, expenseActions, 2)

	// Verify both expense actions are found
	foundCreate := false
	foundUpdate := false
	for _, a := range expenseActions {
		if a.Action == "create_expense" {
			foundCreate = true
		}
		if a.Action == "update_expense" {
			foundUpdate = true
		}
	}
	require.True(t, foundCreate, "create_expense action not found")
	require.True(t, foundUpdate, "update_expense action not found")

	// List grant-related actions
	grantActions, err := db.ListAdminActions(t.Context(), "grant", "grant_test_002")
	require.NoError(t, err)
	require.Len(t, grantActions, 1)
	require.Equal(t, "create_grant", grantActions[0].Action)

	// Clean up
	_, err = dbConn.ExecContext(t.Context(),
		"DELETE FROM admin_actions WHERE admin_address = $1", adminAddr)
	require.NoError(t, err)

	err = adminDB.RemoveAdmin(t.Context(), adminAddr)
	require.NoError(t, err)
}

func Test_AdminActionDB_ListAdminActions_EmptyResults(t *testing.T) {
	var (
		db = GetTestAdminActionDB(t)
	)

	// List actions for non-existent resource
	actions, err := db.ListAdminActions(t.Context(), "nonexistent", "resource_999")
	require.NoError(t, err)
	require.Empty(t, actions)
}
