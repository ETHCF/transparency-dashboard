//go:build integration
// +build integration

package db

import (
	"crypto/ecdsa"
	"testing"

	"github.com/stretchr/testify/require"
)

func GetTestSettingsDB(t *testing.T) SettingsDB {
	sdb, err := NewSettingsDB(conf, dbConn)
	require.NoError(t, err)
	return sdb
}

func Test_SettingsDB_OrganizationName(t *testing.T) {
	var (
		db          = GetTestSettingsDB(t)
		testOrgName = "Test Organization Name"
	)

	// Set organization name
	err := db.SetOrganizationName(t.Context(), testOrgName)
	require.NoError(t, err)

	// Get organization name
	retrievedName, err := db.GetOrganizationName(t.Context())
	require.NoError(t, err)
	require.Equal(t, testOrgName, retrievedName)

	// Update organization name
	updatedName := "Updated Organization Name"
	err = db.SetOrganizationName(t.Context(), updatedName)
	require.NoError(t, err)

	// Verify the update
	retrievedUpdatedName, err := db.GetOrganizationName(t.Context())
	require.NoError(t, err)
	require.Equal(t, updatedName, retrievedUpdatedName)

	// Clean up
	_, err = dbConn.ExecContext(t.Context(),
		"DELETE FROM settings WHERE key = 'organization_name'")
	require.NoError(t, err)
}

func Test_SettingsDB_JWTKey(t *testing.T) {
	var (
		db = GetTestSettingsDB(t)
	)

	// Clean up any existing JWT key first
	_, err := dbConn.ExecContext(t.Context(),
		"DELETE FROM settings WHERE key = 'jwt_private_key'")
	require.NoError(t, err)

	// Load JWT key (should generate new one since none exists)
	key1, err := db.LoadJWTKey(t.Context())
	require.NoError(t, err)
	require.NotNil(t, key1)
	require.IsType(t, &ecdsa.PrivateKey{}, key1)

	// Load JWT key again (should load the existing one)
	key2, err := db.LoadJWTKey(t.Context())
	require.NoError(t, err)
	require.NotNil(t, key2)
	require.IsType(t, &ecdsa.PrivateKey{}, key2)

	// Keys should be the same (loaded from database)
	require.Equal(t, key1.D, key2.D)
	require.Equal(t, key1.X, key2.X)
	require.Equal(t, key1.Y, key2.Y)

	// Clean up
	_, err = dbConn.ExecContext(t.Context(),
		"DELETE FROM settings WHERE key = 'jwt_private_key'")
	require.NoError(t, err)
}

func Test_SettingsDB_GenericGetSet(t *testing.T) {
	var (
		db        = GetTestSettingsDB(t).(*settingsDB) // Cast to access private methods
		testKey   = "test_setting_key"
		testValue = "test_setting_value"
	)

	// Set a generic setting
	err := db.Set(t.Context(), testKey, testValue)
	require.NoError(t, err)

	// Get the generic setting
	retrievedValue, err := db.Get(t.Context(), testKey)
	require.NoError(t, err)
	require.Equal(t, testValue, retrievedValue)

	// Update the setting
	updatedValue := "updated_test_value"
	err = db.Set(t.Context(), testKey, updatedValue)
	require.NoError(t, err)

	// Verify the update
	retrievedUpdatedValue, err := db.Get(t.Context(), testKey)
	require.NoError(t, err)
	require.Equal(t, updatedValue, retrievedUpdatedValue)

	// Clean up
	_, err = dbConn.ExecContext(t.Context(),
		"DELETE FROM settings WHERE key = $1", testKey)
	require.NoError(t, err)
}
