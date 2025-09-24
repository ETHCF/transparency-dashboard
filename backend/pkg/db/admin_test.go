//go:build integration
// +build integration

package db

import (
	"context"
	"testing"

	"github.com/ETHCF/ethutils"
	"github.com/stretchr/testify/require"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/types"
)

func GetTestAdminDB(t *testing.T) AdminDB {
	adb, err := NewAdminDB(context.Background(), conf, dbConn)
	require.NoError(t, err)
	return adb
}

func Test_AdminDB_AddAndGetAdmins(t *testing.T) {
	var (
		db      = GetTestAdminDB(t)
		address = ethutils.GenRandEVMAddr()
		name    = "Test Admin"
	)

	// Create test admin
	admin := types.Admin{
		Name:    name,
		Address: address,
	}

	err := db.AddAdmin(t.Context(), admin)
	require.NoError(t, err)

	// Get all admins
	admins, err := db.GetAdmins(t.Context())
	require.NoError(t, err)
	require.NotEmpty(t, admins)

	// Check if our test admin is in the results
	require.Contains(t, admins, admin)

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM admins WHERE address = $1", address)
	require.NoError(t, err)
}

func Test_AdminDB_AdminExists(t *testing.T) {
	var (
		db      = GetTestAdminDB(t)
		address = ethutils.GenRandEVMAddr()
		name    = "Test Admin Exists"
	)

	// Check admin doesn't exist yet
	exists, err := db.AdminExists(t.Context(), address)
	require.NoError(t, err)
	require.False(t, exists)

	// Create test admin
	admin := types.Admin{
		Name:    name,
		Address: address,
	}

	err = db.AddAdmin(t.Context(), admin)
	require.NoError(t, err)

	// Check admin now exists
	exists, err = db.AdminExists(t.Context(), address)
	require.NoError(t, err)
	require.True(t, exists)

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM admins WHERE address = $1", address)
	require.NoError(t, err)
}

func Test_AdminDB_RemoveAdmin(t *testing.T) {
	var (
		db      = GetTestAdminDB(t)
		address = ethutils.GenRandEVMAddr()
		name    = "Test Admin Remove"
	)

	// Create test admin
	admin := types.Admin{
		Name:    name,
		Address: address,
	}

	err := db.AddAdmin(t.Context(), admin)
	require.NoError(t, err)

	// Verify admin exists
	exists, err := db.AdminExists(t.Context(), address)
	require.NoError(t, err)
	require.True(t, exists)

	// Remove admin
	err = db.RemoveAdmin(t.Context(), address)
	require.NoError(t, err)

	// Verify admin no longer exists
	exists, err = db.AdminExists(t.Context(), address)
	require.NoError(t, err)
	require.False(t, exists)

	// Try to remove non-existent admin
	err = db.RemoveAdmin(t.Context(), address)
	require.Error(t, err)
	require.Contains(t, err.Error(), "admin not found")
}
