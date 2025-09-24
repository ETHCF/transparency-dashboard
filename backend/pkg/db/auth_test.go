//go:build integration
// +build integration

package db

import (
	"context"
	"testing"

	"github.com/ETHCF/ethutils"
	"github.com/jmoiron/sqlx"
	"github.com/stretchr/testify/require"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/config"
)

/*
These are integration tests, they require a connect to a real postgres database.
This instance must have all of the migrations in the ./migrations folder applied.
They should be run on a new instance each time preferably, but can use the same instance for faster feedback.
*/

var conf *config.Config
var dbConn *sqlx.DB

func TestMain(m *testing.M) {
	var err error
	conf, err = config.NewConfig(context.Background())
	if err != nil {
		panic(err)
	}
	conf.PSQL.DBHost = "127.0.0.1"
	conf.PSQL.DBPort = 5432
	conf.PSQL.DBName = "tpd"
	conf.PSQL.DBUser = "tpd"
	conf.PSQL.DBPassword = "tpd"

	dbConn, err = conf.ConnectPSQL(context.Background())
	if err != nil {
		panic(err)
	}
	m.Run()
}

func GetTestAuthDB(t *testing.T) AuthDB {
	kdb, err := NewAuthDB(t.Context(), conf, dbConn)
	require.NoError(t, err)
	return kdb
}

func Test_AuthDB_GenerateNonce(t *testing.T) {
	var (
		db   = GetTestAuthDB(t)
		user = ethutils.GenRandEVMAddr()
		ip   = "127.0.0.1"
	)

	nonce, err := db.GenerateNonce(t.Context(), user, ip)
	require.NoError(t, err)

	nonce2, err := db.GenerateNonce(t.Context(), user, ip)
	require.NoError(t, err)

	require.EqualValues(t, nonce, nonce2)

	// Now a different ip

	nonce3, err := db.GenerateNonce(t.Context(), user, "127.0.0.2")
	require.NoError(t, err)

	require.NotEqual(t, nonce, nonce3)

	// Different user
	user2 := ethutils.GenRandEVMAddr()
	nonce4, err := db.GenerateNonce(t.Context(), user2, ip)
	require.NoError(t, err)

	require.NotEqual(t, nonce, nonce4)

	// Clean up test nonces
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM \"auth_nonces\" WHERE \"address\" = $1 OR \"address\" = $2", user, user2)
	require.NoError(t, err)
}

func Test_AuthDB_CheckAndConsumeNonce(t *testing.T) {
	var (
		db   = GetTestAuthDB(t)
		user = ethutils.GenRandEVMAddr()
		ip   = "127.6.6.6"
	)

	nonce, err := db.GenerateNonce(t.Context(), user, ip)
	require.NoError(t, err)

	ok, err := db.CheckAndConsumeNonce(t.Context(), user, ip, nonce)
	require.NoError(t, err)
	require.True(t, ok)

	ok, err = db.CheckAndConsumeNonce(t.Context(), user, ip, nonce)
	require.NoError(t, err)
	require.False(t, ok)

	// Try to use a nonce from another ip address
	nonce, err = db.GenerateNonce(t.Context(), user, "127.3.3.3")
	require.NoError(t, err)

	ok, err = db.CheckAndConsumeNonce(t.Context(), user, ip, nonce)
	require.NoError(t, err)
	require.False(t, ok)

	// Doesn't impact the original sender
	ok, err = db.CheckAndConsumeNonce(t.Context(), user, "127.3.3.3", nonce)
	require.NoError(t, err)
	require.True(t, ok)

	// Clean up test nonces
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM \"auth_nonces\" WHERE \"address\" = $1", user)
	require.NoError(t, err)
}
