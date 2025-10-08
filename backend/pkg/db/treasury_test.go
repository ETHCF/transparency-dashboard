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

func GetTestTreasuryDB(t *testing.T) TreasuryDB {
	sDB, err := NewSettingsDB(conf, dbConn)
	require.NoError(t, err)
	tdb, err := NewTreasuryDB(context.Background(), conf, dbConn, sDB)
	require.NoError(t, err)
	return tdb
}

func Test_TreasuryDB_GetAssets(t *testing.T) {
	var (
		db         = GetTestTreasuryDB(t)
		walletAddr = ethutils.GenRandEVMAddr()
		assetAddr  = ethutils.GenRandEVMAddr()
		asset      = types.Asset{
			ChainID:  1,
			Address:  assetAddr,
			Name:     "Test Token",
			Symbol:   "TEST",
			Decimals: 18,
		}
		walletBalance = types.WalletBalance{
			ChainID:     1,
			Address:     assetAddr,
			Wallet:      walletAddr,
			Amount:      "1000.5",
			UsdWorth:    1500.75,
			EthWorth:    "0.85",
			LastUpdated: time.Now(),
		}
	)

	// Insert test wallet first
	_, err := dbConn.ExecContext(t.Context(),
		"INSERT INTO wallets (address) VALUES ($1)",
		walletAddr)
	require.NoError(t, err)

	// Insert test asset
	_, err = dbConn.ExecContext(t.Context(),
		"INSERT INTO assets (chain_id, address, name, symbol, decimals) VALUES ($1, $2, $3, $4, $5)",
		asset.ChainID, asset.Address, asset.Name, asset.Symbol, asset.Decimals)
	require.NoError(t, err)

	// Insert wallet balance
	_, err = dbConn.ExecContext(t.Context(),
		"INSERT INTO wallet_balances (chain_id, address, wallet, amount, usd_worth, eth_worth, last_updated) VALUES ($1, $2, $3, $4, $5, $6, $7)",
		walletBalance.ChainID, walletBalance.Address, walletBalance.Wallet, walletBalance.Amount, walletBalance.UsdWorth, walletBalance.EthWorth, walletBalance.LastUpdated)
	require.NoError(t, err)

	// Get assets
	assets, err := db.GetAssets(t.Context())
	require.NoError(t, err)
	require.NotEmpty(t, assets)

	// Check if our test asset is in the results
	var found bool
	for _, a := range assets {
		if a.Address == asset.Address && a.ChainID == asset.ChainID {
			found = true
			require.Equal(t, asset.Name, a.Name)
			require.Equal(t, asset.Symbol, a.Symbol)
			break
		}
	}
	require.True(t, found, "test asset not found in retrieved assets")

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM wallet_balances WHERE address = $1 AND chain_id = $2", assetAddr, 1)
	require.NoError(t, err)
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM assets WHERE address = $1 AND chain_id = $2", assetAddr, 1)
	require.NoError(t, err)
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM wallets WHERE address = $1", walletAddr)
	require.NoError(t, err)
}

func Test_TreasuryDB_GetWallets(t *testing.T) {
	var (
		db     = GetTestTreasuryDB(t)
		wallet = types.Wallet{
			Address: ethutils.GenRandEVMAddr(),
		}
	)

	// Insert test wallet
	_, err := dbConn.ExecContext(t.Context(),
		"INSERT INTO wallets (address) VALUES ($1)",
		wallet.Address)
	require.NoError(t, err)

	// Get wallets
	wallets, err := db.GetWallets(t.Context())
	require.NoError(t, err)
	require.NotEmpty(t, wallets)

	// Check if our test wallet is in the results
	var found bool
	for _, w := range wallets {
		if w.Address == wallet.Address {
			found = true
			break
		}
	}
	require.True(t, found, "test wallet not found in retrieved wallets")

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM wallets WHERE address = $1", wallet.Address)
	require.NoError(t, err)
}

func Test_TreasuryDB_AddAsset(t *testing.T) {
	var (
		db    = GetTestTreasuryDB(t)
		asset = types.Asset{
			ChainID:  1,
			Address:  ethutils.GenRandEVMAddr(),
			Name:     "Test Add Asset",
			Symbol:   "TAA",
			Decimals: 18,
		}
	)

	// Add asset
	err := db.AddAsset(t.Context(), asset)
	require.NoError(t, err)

	// Get assets to verify it was added
	assets, err := db.GetAssets(t.Context())
	require.NoError(t, err)
	require.NotEmpty(t, assets)

	// Check if our test asset is in the results
	var found bool
	for _, a := range assets {
		if a.Address == asset.Address && a.ChainID == asset.ChainID {
			found = true
			require.Equal(t, asset.Name, a.Name)
			require.Equal(t, asset.Symbol, a.Symbol)
			require.Equal(t, asset.Decimals, a.Decimals)
			break
		}
	}
	require.True(t, found, "added asset not found in retrieved assets")

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM assets WHERE address = $1 AND chain_id = $2", asset.Address, asset.ChainID)
	require.NoError(t, err)
}

func Test_TreasuryDB_TransferOperations(t *testing.T) {
	var (
		db             = GetTestTreasuryDB(t)
		createTransfer = types.CreateTransfer{
			TxHash:         ethutils.GenRandEVMHash(),
			BlockNumber:    12545678,
			BlockTimestamp: time.Now().Unix(),
			FromAddress:    ethutils.GenRandEVMAddr(),
			ToAddress:      ethutils.GenRandEVMAddr(),
			Asset:          ethutils.GenRandEVMAddr(),
			Amount:         "50025",
			Direction:      types.TransferTypeIncoming,
			LogIndex:       0,
		}
	)

	// Create transfer
	err := db.CreateTransfer(t.Context(), createTransfer)
	require.NoError(t, err)

	// Get transfers
	transfers, err := db.GetTransfers(t.Context(), 10, 0)
	require.NoError(t, err)
	require.NotEmpty(t, transfers)

	// Check if our test transfer is in the results and get its ID
	var foundTransfer *types.Transfer
	for _, tr := range transfers {
		if tr.TxHash == createTransfer.TxHash {
			foundTransfer = &tr
			require.Equal(t, createTransfer.TxHash, tr.TxHash)
			require.Equal(t, createTransfer.Amount, tr.Amount)
			require.Equal(t, createTransfer.BlockNumber, tr.BlockNumber)
			require.Equal(t, createTransfer.LogIndex, tr.LogIndex)
			break
		}
	}
	require.NotNil(t, foundTransfer, "created transfer not found in retrieved transfers")

	// Get transfer by ID
	retrieved, err := db.GetTransferByID(t.Context(), foundTransfer.ID)
	require.NoError(t, err)
	require.NotNil(t, retrieved)
	require.Equal(t, foundTransfer.ID, retrieved.ID)
	require.Equal(t, createTransfer.TxHash, retrieved.TxHash)

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM transfers WHERE id = $1", foundTransfer.ID)
	require.NoError(t, err)
}

func Test_TreasuryDB_TransferPartyOperations(t *testing.T) {
	var (
		db      = GetTestTreasuryDB(t)
		address = ethutils.GenRandEVMAddr()
		party   = types.TransferParty{
			Address:   address,
			Name:      "Test Transfer Party",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
	)

	// Upsert transfer party
	err := db.UpsertTransferParty(t.Context(), party)
	require.NoError(t, err)

	// Get transfer parties
	parties, err := db.GetTransferParties(t.Context(), 10, 0)
	require.NoError(t, err)
	require.NotEmpty(t, parties)

	// Check if our test party is in the results
	var found bool
	for _, p := range parties {
		if p.Address == party.Address {
			found = true
			require.Equal(t, party.Name, p.Name)
			break
		}
	}
	require.True(t, found, "created transfer party not found in retrieved parties")

	// Get transfer party by address
	retrieved, err := db.GetTransferPartyByAddress(t.Context(), address)
	require.NoError(t, err)
	require.NotNil(t, retrieved)
	require.Equal(t, party.Address, retrieved.Address)
	require.Equal(t, party.Name, retrieved.Name)

	// Update transfer party name
	newName := "Updated Transfer Party Name"
	err = db.UpdateTransferPartyName(t.Context(), address, newName)
	require.NoError(t, err)

	// Verify name was updated
	updated, err := db.GetTransferPartyByAddress(t.Context(), address)
	require.NoError(t, err)
	require.Equal(t, newName, updated.Name)

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM transfer_parties WHERE address = $1", address)
	require.NoError(t, err)
}

func Test_TreasuryDB_GetTreasuryResponse(t *testing.T) {
	var (
		db         = GetTestTreasuryDB(t)
		walletAddr = ethutils.GenRandEVMAddr()
		assetAddr  = ethutils.GenRandEVMAddr()
		asset      = types.Asset{
			ChainID:  1,
			Address:  assetAddr,
			Name:     "Test Response Token",
			Symbol:   "TRT",
			Decimals: 18,
		}
		wallet = types.Wallet{
			Address: walletAddr,
		}
		walletBalance = types.WalletBalance{
			ChainID:     1,
			Address:     assetAddr,
			Wallet:      walletAddr,
			Amount:      "2000.00",
			UsdWorth:    3000.00,
			EthWorth:    "1.50",
			LastUpdated: time.Now(),
		}
	)

	// Insert test data
	_, err := dbConn.ExecContext(t.Context(),
		"INSERT INTO wallets (address) VALUES ($1)",
		wallet.Address)
	require.NoError(t, err)

	_, err = dbConn.ExecContext(t.Context(),
		"INSERT INTO assets (chain_id, address, name, symbol, decimals) VALUES ($1, $2, $3, $4, $5)",
		asset.ChainID, asset.Address, asset.Name, asset.Symbol, asset.Decimals)
	require.NoError(t, err)

	_, err = dbConn.ExecContext(t.Context(),
		"INSERT INTO wallet_balances (chain_id, address, wallet, amount, usd_worth, eth_worth, last_updated) VALUES ($1, $2, $3, $4, $5, $6, $7)",
		walletBalance.ChainID, walletBalance.Address, walletBalance.Wallet, walletBalance.Amount, walletBalance.UsdWorth, walletBalance.EthWorth, walletBalance.LastUpdated)
	require.NoError(t, err)

	// Insert test organization name setting
	_, err = dbConn.ExecContext(t.Context(),
		"INSERT INTO settings (key, value) VALUES ('org_name', 'Test Organization') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value")
	require.NoError(t, err)

	// Get treasury response
	response, err := db.GetTreasuryResponse(t.Context())
	require.NoError(t, err)
	require.NotNil(t, response)
	require.Equal(t, "Test Organization", response.OrganizationName)
	require.NotEmpty(t, response.Assets)
	require.NotEmpty(t, response.Wallets)
	require.True(t, response.TotalValueUsd >= walletBalance.UsdWorth)

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM wallet_balances WHERE address = $1 AND chain_id = $2", assetAddr, 1)
	require.NoError(t, err)
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM assets WHERE address = $1 AND chain_id = $2", assetAddr, 1)
	require.NoError(t, err)
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM wallets WHERE address = $1", wallet.Address)
	require.NoError(t, err)
}
