package main

import (
	"context"
)

func (t *Tracker) setLastProcessedBlockForWallet(ctx context.Context, walletAddress string, blockNumber uint64) error {
	key := "last_processed_block_" + walletAddress
	return t.metaDB.Set(ctx, key, blockNumber)
}

func (t *Tracker) getLastProcessedBlockForWallet(ctx context.Context, walletAddress string) (uint64, error) {
	key := "last_processed_block_" + walletAddress
	out, err := t.metaDB.GetUint64(ctx, key)
	if err != nil {
		t.log.WithError(err).Warnf("failed to get last processed block for wallet %s, defaulting to 0", walletAddress)
		return 0, nil
	}
	return out, nil
}
