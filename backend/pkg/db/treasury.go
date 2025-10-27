package db

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/innodv/psql"
	"github.com/jmoiron/sqlx"
	"github.com/numbergroup/errors"
	"github.com/sirupsen/logrus"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/config"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/types"
)

type TreasuryDB interface {
	// Treasury management methods
	GetTreasuryResponse(ctx context.Context) (*types.TreasuryResponse, error)
	AddAsset(ctx context.Context, asset types.Asset) error
	GetAssets(ctx context.Context) ([]types.Asset, error)
	GetWallets(ctx context.Context) ([]types.Wallet, error)
	AddWallet(ctx context.Context, wallet types.Wallet) error
	DeleteWallet(ctx context.Context, address string) error
	GetWalletBalances(ctx context.Context) ([]types.WalletBalance, error)
	UpdateWalletBalances(ctx context.Context, wallet string, balances []types.WalletBalance) error

	// Transfer management methods
	GetTransfers(ctx context.Context, limit, offset int) ([]types.Transfer, error)
	CreateTransfer(ctx context.Context, transfer types.CreateTransfer) error
	GetTransferByID(ctx context.Context, id uuid.UUID) (*types.Transfer, error)

	// Transfer party management methods
	GetTransferParties(ctx context.Context, limit, offset int) ([]types.TransferParty, error)
	GetTransferPartyByAddress(ctx context.Context, address string) (*types.TransferParty, error)
	UpdateTransferPartyName(ctx context.Context, address, name string) error
	UpsertTransferParty(ctx context.Context, party types.TransferParty) error
}

// Treasury methods
func (t *treasury) GetTreasuryResponse(ctx context.Context) (*types.TreasuryResponse, error) {
	// Get assets
	assets, err := t.GetAssets(ctx)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get assets")
	}

	// Get wallets
	wallets, err := t.GetWallets(ctx)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get wallets")
	}

	balances, err := t.GetWalletBalances(ctx)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get wallet balances")
	}

	// Calculate totals
	var totalValueUsd float64
	var totalValueEth string = "0" // Placeholder until ETH calc is implemented
	for _, asset := range balances {
		totalValueUsd += asset.UsdWorth
	}
	orgName, err := t.settingDB.GetOrganizationName(ctx)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get organization name")
	}

	totalFundsRaised, err := t.settingDB.GetTotalFundsRaised(ctx)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get total funds raised")
	}

	totalFundsRaisedUnit, err := t.settingDB.GetTotalFundsRaisedUnit(ctx)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get total funds raised unit")
	}

	return &types.TreasuryResponse{
		OrganizationName:     orgName,
		Assets:               assets,
		WalletBalances:       balances,
		Wallets:              wallets,
		TotalValueUsd:        totalValueUsd,
		TotalValueEth:        totalValueEth,
		TotalFundsRaised:     totalFundsRaised,
		TotalFundsRaisedUnit: totalFundsRaisedUnit,
		LastUpdated:          time.Now(),
	}, nil
}

type treasury struct {
	settingDB                 SettingsDB
	log                       logrus.Ext1FieldLogger
	dbConn                    *sqlx.DB
	getAssets                 *sqlx.Stmt
	addAsset                  *sqlx.NamedStmt
	getWallets                *sqlx.Stmt
	getWalletBalances         *sqlx.Stmt
	addWallet                 *sqlx.NamedStmt
	deleteWallet              *sqlx.Stmt
	getTransfers              *sqlx.Stmt
	createTransfer            *sqlx.NamedStmt
	getTransferByID           *sqlx.Stmt
	getTransferParties        *sqlx.Stmt
	getTransferPartyByAddress *sqlx.Stmt
	updateTransferPartyName   *sqlx.Stmt
	upsertTransferParty       *sqlx.NamedStmt
}

func NewTreasuryDB(ctx context.Context, conf *config.Config, dbConn *sqlx.DB, settingDB SettingsDB) (TreasuryDB, error) {

	walletCols := psql.GetSQLColumnsQuoted[types.Wallet]()
	transferPartyCols := psql.GetSQLColumnsQuoted[types.TransferParty]()

	// Asset queries - join assets with wallet_balances to get portfolio data
	getAssets, err := dbConn.PreparexContext(ctx, `SELECT * FROM assets`)
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare GetAssets statement")
	}

	assetCols := psql.GetSQLColumnsQuoted[types.Asset]()
	assetColsNoQuote := psql.GetSQLColumns[types.Asset]()
	addAsset, err := dbConn.PrepareNamedContext(ctx, fmt.Sprintf(`
		INSERT INTO assets (%s) VALUES (%s)`,
		strings.Join(assetCols, ", "), ":"+strings.Join(assetColsNoQuote, ", :")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare AddAsset statement")
	}

	// Wallet queries
	getWallets, err := dbConn.PreparexContext(ctx, fmt.Sprintf(`
		SELECT %s FROM wallets`, strings.Join(walletCols, ", ")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare GetWallets statement")
	}

	walletColsNoQuote := psql.GetSQLColumns[types.Wallet]()
	addWallet, err := dbConn.PrepareNamedContext(ctx, fmt.Sprintf(`
		INSERT INTO wallets (%s) VALUES (%s)`,
		strings.Join(walletCols, ", "), ":"+strings.Join(walletColsNoQuote, ", :")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare AddWallet statement")
	}

	deleteWallet, err := dbConn.PreparexContext(ctx, `DELETE FROM wallets WHERE address = $1`)
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare DeleteWallet statement")
	}

	walletBalanceCols := psql.GetSQLColumnsQuoted[types.WalletBalance]()
	getWalletBalances, err := dbConn.PreparexContext(ctx, fmt.Sprintf(`
		SELECT %s FROM wallet_balances`, strings.Join(walletBalanceCols, ", ")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare GetWalletBalances statement")
	}

	getTransfersQuery := `
	SELECT t.id AS id,
		t.tx_hash,
		t.block_number,
		t.block_timestamp,
		t.payer_address,
		t.payee_address, 
		t.asset AS asset,
		COALESCE(a.name, 'unknown') AS asset_name,
		COALESCE(a.symbol, 'unknown') AS asset_symbol,
		t.amount AS amount,
		t.direction AS direction,
		t.log_index,
		COALESCE(wf.name,'unknown') AS payer_name,  
		COALESCE(wt.name, 'unknown') as payee_name  
	FROM transfers t
		LEFT JOIN transfer_parties wf ON (t.payer_address = wf.address)
		LEFT JOIN transfer_parties wt ON (t.payee_address = wt.address)
		LEFT JOIN assets a ON (t.asset = a.address)`

	getTransfers, err := dbConn.PreparexContext(ctx, getTransfersQuery+" ORDER BY t.block_timestamp DESC, t.log_index DESC LIMIT $1 OFFSET $2")
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare GetTransfers statement")
	}

	createTransfer, err := dbConn.PrepareNamedContext(ctx, fmt.Sprintf(`
		INSERT INTO transfers (%s) VALUES (%s) ON CONFLICT (chain_id, tx_hash, log_index) DO NOTHING`,
		strings.Join(psql.GetSQLColumnsQuoted[types.CreateTransfer](), ", "), ":"+strings.Join(psql.GetSQLColumns[types.CreateTransfer](), ", :")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare CreateTransfer statement")
	}

	getTransferByID, err := dbConn.PreparexContext(ctx, getTransfersQuery+" WHERE t.id = $1")
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare GetTransferByID statement")
	}

	// Transfer party queries
	getTransferParties, err := dbConn.PreparexContext(ctx, fmt.Sprintf(`
		SELECT %s FROM transfer_parties LIMIT $1 OFFSET $2`, strings.Join(transferPartyCols, ", ")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare GetTransferParties statement")
	}

	getTransferPartyByAddress, err := dbConn.PreparexContext(ctx, fmt.Sprintf(`
		SELECT %s FROM transfer_parties WHERE address = $1`, strings.Join(transferPartyCols, ", ")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare GetTransferPartyByAddress statement")
	}

	updateTransferPartyName, err := dbConn.PreparexContext(ctx, `
		UPDATE transfer_parties SET name = $2, updated_at = NOW() WHERE address = $1`)
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare UpdateTransferPartyName statement")
	}

	upsertTransferParty, err := dbConn.PrepareNamedContext(ctx, fmt.Sprintf(`
		INSERT INTO transfer_parties (%s) VALUES (%s)
		ON CONFLICT (address) DO UPDATE SET
			name = EXCLUDED.name,
			updated_at = NOW()`,
		strings.Join(transferPartyCols, ", "), ":"+strings.Join(psql.GetSQLColumns[types.TransferParty](), ", :")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare UpsertTransferParty statement")
	}

	return &treasury{
		log:                       conf.GetLogger(),
		settingDB:                 settingDB,
		dbConn:                    dbConn,
		getAssets:                 getAssets,
		addAsset:                  addAsset,
		getWallets:                getWallets,
		getWalletBalances:         getWalletBalances,
		addWallet:                 addWallet,
		deleteWallet:              deleteWallet,
		getTransfers:              getTransfers,
		createTransfer:            createTransfer,
		getTransferByID:           getTransferByID,
		getTransferParties:        getTransferParties,
		getTransferPartyByAddress: getTransferPartyByAddress,
		updateTransferPartyName:   updateTransferPartyName,
		upsertTransferParty:       upsertTransferParty,
	}, nil
}

func (t *treasury) GetAssets(ctx context.Context) ([]types.Asset, error) {
	var assets []types.Asset
	err := t.getAssets.SelectContext(ctx, &assets)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get assets")
	}
	if len(assets) == 0 {
		return []types.Asset{}, nil
	}
	return assets, nil
}

func (t *treasury) GetWalletBalances(ctx context.Context) ([]types.WalletBalance, error) {
	var balances []types.WalletBalance
	err := t.getWalletBalances.SelectContext(ctx, &balances)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get wallet balances")
	}
	for i := range balances {
		balances[i].Amount = TrimZeros(balances[i].Amount)
		balances[i].EthWorth = TrimZeros(balances[i].EthWorth)
	}
	if len(balances) == 0 {
		return []types.WalletBalance{}, nil
	}
	return balances, nil
}

func (t *treasury) AddAsset(ctx context.Context, asset types.Asset) error {
	_, err := t.addAsset.ExecContext(ctx, asset)
	if err != nil {
		return errors.Wrap(err, "failed to add asset")
	}
	return nil
}

func (t *treasury) GetWallets(ctx context.Context) ([]types.Wallet, error) {
	var wallets []types.Wallet
	err := t.getWallets.SelectContext(ctx, &wallets)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get wallets")
	}
	if len(wallets) == 0 {
		return []types.Wallet{}, nil
	}
	return wallets, nil
}

func (t *treasury) AddWallet(ctx context.Context, wallet types.Wallet) error {
	_, err := t.addWallet.ExecContext(ctx, wallet)
	if err != nil {
		return errors.Wrap(err, "failed to add wallet")
	}
	return nil
}

func (t *treasury) DeleteWallet(ctx context.Context, address string) error {
	result, err := t.deleteWallet.ExecContext(ctx, address)
	if err != nil {
		return errors.Wrap(err, "failed to delete wallet")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return errors.Wrap(err, "failed to get rows affected")
	}

	if rowsAffected == 0 {
		return errors.New("wallet not found")
	}

	return nil
}

// Transfer methods
func (t *treasury) GetTransfers(ctx context.Context, limit, offset int) ([]types.Transfer, error) {
	var transfers []types.Transfer
	err := t.getTransfers.SelectContext(ctx, &transfers, limit, offset)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get transfers")
	}
	if len(transfers) == 0 {
		return []types.Transfer{}, nil
	}
	for i := range transfers {
		transfers[i].Amount = TrimZeros(transfers[i].Amount)
	}
	return transfers, nil
}

func (t *treasury) CreateTransfer(ctx context.Context, transfer types.CreateTransfer) error {
	_, err := t.createTransfer.ExecContext(ctx, transfer)
	if err != nil {
		return errors.Wrap(err, "failed to create transfer")
	}
	return nil
}

func (t *treasury) GetTransferByID(ctx context.Context, id uuid.UUID) (*types.Transfer, error) {
	var transfer types.Transfer
	err := t.getTransferByID.GetContext(ctx, &transfer, id)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get transfer by ID")
	}
	return &transfer, nil
}

// Transfer party methods
func (t *treasury) GetTransferParties(ctx context.Context, limit, offset int) ([]types.TransferParty, error) {
	var parties []types.TransferParty
	err := t.getTransferParties.SelectContext(ctx, &parties, limit, offset)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get transfer parties")
	}
	if len(parties) == 0 {
		return []types.TransferParty{}, nil
	}
	return parties, nil
}

func (t *treasury) GetTransferPartyByAddress(ctx context.Context, address string) (*types.TransferParty, error) {
	var party types.TransferParty
	err := t.getTransferPartyByAddress.GetContext(ctx, &party, address)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get transfer party by address")
	}
	return &party, nil
}

func (t *treasury) UpdateTransferPartyName(ctx context.Context, address, name string) error {
	result, err := t.updateTransferPartyName.ExecContext(ctx, address, name)
	if err != nil {
		return errors.Wrap(err, "failed to update transfer party name")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return errors.Wrap(err, "failed to get rows affected")
	}

	if rowsAffected == 0 {
		return errors.New("transfer party not found")
	}

	return nil
}

func (t *treasury) UpsertTransferParty(ctx context.Context, party types.TransferParty) error {
	_, err := t.upsertTransferParty.ExecContext(ctx, party)
	if err != nil {
		return errors.Wrap(err, "failed to upsert transfer party")
	}
	return nil
}

func (t *treasury) UpdateWalletBalances(ctx context.Context, wallet string, balances []types.WalletBalance) error {
	// Use a transaction for batch update
	tx, err := t.dbConn.BeginTxx(ctx, nil)
	if err != nil {
		return errors.Wrap(err, "failed to begin transaction")
	}
	defer tx.Rollback()

	// First delete all of the existing balances for the wallet
	_, err = tx.ExecContext(ctx, "DELETE FROM \"wallet_balances\" WHERE \"wallet\" = $1", wallet)
	if err != nil {
		return errors.Wrap(err, "failed to delete existing wallet balances")
	}

	// Then insert the new balances
	if len(balances) > 0 {
		query := `INSERT INTO "wallet_balances" (chain_id, address, wallet, amount, usd_worth, eth_worth, last_updated) VALUES ($1, $2, $3, $4, $5, $6, $7)`
		for _, balance := range balances {
			_, err = tx.ExecContext(ctx, query,
				balance.ChainID,
				balance.Address,
				balance.Wallet,
				balance.Amount,
				balance.UsdWorth,
				balance.EthWorth,
				balance.LastUpdated,
			)
			if err != nil {
				return errors.Wrap(err, "failed to insert wallet balance")
			}
		}
	}

	// Commit the transaction
	err = tx.Commit()
	if err != nil {
		return errors.Wrap(err, "failed to commit transaction")
	}

	return nil
}
