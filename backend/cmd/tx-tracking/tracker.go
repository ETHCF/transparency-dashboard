package main

import (
	"context"
	"math/big"
	"strconv"
	"time"

	"github.com/ETHCF/ethutils"
	"github.com/cockroachdb/errors"
	"github.com/sirupsen/logrus"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/alchemy"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/config"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/constants"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/db"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/eth"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/types"
)

// 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef

type Tracker struct {
	conf       *config.Config
	log        logrus.Ext1FieldLogger
	ethClient  eth.Client
	alchemy    alchemy.API
	metaDB     db.MetaDB
	treasuryDB db.TreasuryDB
}

func NewTracker(conf *config.Config, ethClient eth.Client, alchemyAPI alchemy.API, metaDB db.MetaDB, treasuryDB db.TreasuryDB) *Tracker {
	return &Tracker{
		conf:       conf,
		log:        conf.GetLogger(),
		ethClient:  ethClient,
		alchemy:    alchemyAPI,
		metaDB:     metaDB,
		treasuryDB: treasuryDB,
	}
}

func (t *Tracker) GetAssets(ctx context.Context) (map[string]types.Asset, map[string]float64, error) {
	assets, err := t.treasuryDB.GetAssets(ctx)
	if err != nil {
		return nil, nil, errors.Wrap(err, "failed to get assets")
	}

	assetMap := make(map[string]types.Asset)
	assetList := []string{constants.WethAddress}
	for _, asset := range assets {
		assetMap[asset.Address] = asset
		assetList = append(assetList, asset.Address)
	}

	prices, err := t.alchemy.GetTokenPrices(ctx, assetList)
	if err != nil {
		return nil, nil, errors.Wrap(err, "failed to get token prices")
	}

	prices[constants.EtherAddress] = prices[constants.WethAddress]
	return assetMap, prices, nil
}

func (t *Tracker) processBalances(ctx context.Context, prices map[string]float64, assetMap map[string]types.Asset, wallet types.Wallet) error {
	balances, err := t.alchemy.TokenBalances(ctx, wallet.Address)
	if err != nil {
		return errors.Wrapf(err, "failed to get token balances for wallet %s", wallet.Address)
	}

	etherBalance, err := t.ethClient.GetBalance(ctx, wallet.Address, "latest")
	if err != nil {
		return errors.Wrapf(err, "failed to get ether balance for wallet %s", wallet.Address)
	}

	walletBalances := make([]types.WalletBalance, 0, len(balances)+1)
	etherBalDec := ethutils.ToDecimal(etherBalance, 18)
	etherUSDVal, _ := big.NewFloat(0).Mul(etherBalDec, big.NewFloat(prices[constants.EtherAddress])).Float64()
	walletBalances = append(walletBalances, types.WalletBalance{
		ChainID:     1,
		Address:     constants.EtherAddress,
		Wallet:      wallet.Address,
		Amount:      etherBalDec.String(),
		EthWorth:    etherBalDec.String(),
		UsdWorth:    etherUSDVal,
		LastUpdated: time.Now(),
	})

	for _, bal := range balances {
		asset, ok := assetMap[bal.Address]
		if !ok {
			t.log.WithField("address", bal.Address).Info("unknown asset address, skipping")
			// TODO: consider automatically adding new assets to the DB
			continue
		}
		price, ok := prices[bal.Address]
		if !ok {
			t.log.WithField("address", bal.Address).Info("no price found for asset, skipping")
			continue
		}
		balance := ethutils.ToDecimal(bal.Balance, asset.Decimals)
		usdVal, _ := balance.Mul(balance, big.NewFloat(price)).Float64()
		var ethVal float64 = 0
		if prices[constants.EtherAddress] != 0 {
			ethVal = usdVal / prices[constants.EtherAddress]
		}
		walletBalances = append(walletBalances, types.WalletBalance{
			ChainID:     1,
			Address:     bal.Address,
			Wallet:      wallet.Address,
			Amount:      balance.String(),
			EthWorth:    strconv.FormatFloat(ethVal, 'f', -1, 64),
			UsdWorth:    usdVal,
			LastUpdated: time.Now(),
		})
	}
	return t.treasuryDB.UpdateWalletBalances(ctx, wallet.Address, walletBalances)
}

func (t *Tracker) fetchTransfers(ctx context.Context, wallet types.Wallet, fromBlock uint64, toBlock uint64) ([]types.CreateTransfer, error) {
	outgoing, err := t.alchemy.GetAssetTransfers(ctx, alchemy.GetTransfersOptions{
		FromAddress: &wallet.Address,
		FromBlock:   fromBlock,
		ToBlock:     toBlock,
	})
	if err != nil {
		return nil, errors.Wrapf(err, "failed to get outgoing transfers for wallet %s", wallet.Address)
	}
	t.log.WithFields(logrus.Fields{
		"wallet":    wallet.Address,
		"fromBlock": fromBlock,
		"toBlock":   toBlock,
		"outgoing":  len(outgoing),
	}).Info("fetched outgoing transfers")
	incoming, err := t.alchemy.GetAssetTransfers(ctx, alchemy.GetTransfersOptions{
		ToAddress: &wallet.Address,
		FromBlock: fromBlock,
		ToBlock:   toBlock,
	})
	if err != nil {
		return nil, errors.Wrapf(err, "failed to get incoming transfers for wallet %s", wallet.Address)
	}
	t.log.WithFields(logrus.Fields{
		"wallet":    wallet.Address,
		"fromBlock": fromBlock,
		"toBlock":   toBlock,
		"incoming":  len(incoming),
	}).Info("fetched incoming transfers")

	allTransfers := make([]types.CreateTransfer, 0, len(outgoing)+len(incoming))
	for _, tr := range outgoing {
		allTransfers = append(allTransfers, types.CreateTransfer{
			TxHash:         tr.TxHash,
			Asset:          tr.AssetAddress,
			FromAddress:    tr.FromAddress,
			ToAddress:      tr.ToAddress,
			Amount:         tr.Amount.String(),
			BlockNumber:    tr.Block,
			BlockTimestamp: tr.Timestamp.Unix(),
			Direction:      types.TransferTypeOutgoing,
			LogIndex:       tr.LogIndex,
		})
	}

	for _, tr := range incoming {
		allTransfers = append(allTransfers, types.CreateTransfer{
			TxHash:         tr.TxHash,
			Asset:          tr.AssetAddress,
			FromAddress:    tr.FromAddress,
			ToAddress:      tr.ToAddress,
			Amount:         tr.Amount.String(),
			BlockNumber:    tr.Block,
			BlockTimestamp: tr.Timestamp.Unix(),
			Direction:      types.TransferTypeIncoming,
			LogIndex:       tr.LogIndex,
		})
	}

	return allTransfers, nil
}

func (t *Tracker) processTransfers(ctx context.Context, wallet types.Wallet) error {
	// Get the last processed block for this wallet
	lastBlock, err := t.getLastProcessedBlockForWallet(ctx, wallet.Address)
	if err != nil {
		return err
	}
	currentHead, err := t.ethClient.BlockNumber(ctx)
	if err != nil {
		return errors.Wrap(err, "failed to get current block number")
	}

	currentHead = currentHead - t.conf.BlockDelay
	if lastBlock >= currentHead {
		return nil
	}

	transfers, err := t.fetchTransfers(ctx, wallet, lastBlock, currentHead)
	if err != nil {
		return err
	}

	for _, tr := range transfers {
		if err := t.treasuryDB.CreateTransfer(ctx, tr); err != nil {
			t.log.WithError(err).WithField("transfer", tr).Error("failed to create transfer")
			return errors.Wrapf(err, "failed to create transfer for tx %s", tr.TxHash)
		}
		t.log.WithField("txHash", tr.TxHash).Info("processed transfer")
	}

	return t.setLastProcessedBlockForWallet(ctx, wallet.Address, currentHead)
}
func (t *Tracker) walletUpdates(ctx context.Context) error {

	assetMap, prices, err := t.GetAssets(ctx)
	if err != nil {
		return err
	}

	wallets, err := t.treasuryDB.GetWallets(ctx)
	if err != nil {
		t.log.WithError(err).Error("failed to get wallets")
		return err
	}

	for _, wallet := range wallets {
		t.log.WithField("wallet", wallet.Address).Info("processing wallet")
		err = t.processBalances(ctx, prices, assetMap, wallet)
		if err != nil {
			return errors.Wrapf(err, "failed to process balances for wallet %s", wallet.Address)
		}

		err = t.processTransfers(ctx, wallet)
		if err != nil {
			return errors.Wrapf(err, "failed to process transfers for wallet %s", wallet.Address)
		}
		t.log.WithField("wallet", wallet.Address).Info("finished processing wallet")
	}
	return nil
}

func (t *Tracker) Start(ctx context.Context) {
	t.log.Info("Starting transaction tracker...")
	err := t.walletUpdates(ctx)
	if err != nil {
		t.log.WithError(err).Error("error during wallet updates")
	} else {
		t.log.Info("Completed wallet updates")
	}
	for {
		select {
		case <-ctx.Done():
			t.log.Info("Shutting down transaction tracker...")
			return
		case <-time.After(t.conf.TrackerPollInterval):
			err := t.walletUpdates(ctx)
			if err != nil {
				t.log.WithError(err).Error("error during wallet updates")
			} else {
				t.log.Info("Completed wallet updates")
			}
		}
	}
}
