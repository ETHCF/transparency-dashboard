//go:build integration
// +build integration

package alchemy

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/config"
)

const testAddr = "0x5c43B1eD97e52d009611D89b74fA829FE4ac56b1"

func Test_API_TokenBalances(t *testing.T) {
	conf, err := config.NewConfig(t.Context())
	require.NoError(t, err)
	if conf.AlchemyAPIKey == "" {
		t.Skip("ALCHEMY_API_KEY not set, skipping integration test")
	}
	api := NewAPI(conf)
	balances, err := api.TokenBalances(t.Context(), testAddr)
	require.NoError(t, err)
	require.NotEmpty(t, balances)

	allNotEmpty := true
	for _, b := range balances {
		if b.Balance.Sign() != 0 {
			allNotEmpty = false
			break
		}
	}

	require.False(t, allNotEmpty, "all token balances are zero")
}

func Test_API_GetAssetTransfers(t *testing.T) {
	conf, err := config.NewConfig(t.Context())
	require.NoError(t, err)
	if conf.AlchemyAPIKey == "" {
		t.Skip("ALCHEMY_API_KEY not set, skipping integration test")
	}
	api := NewAPI(conf)
	var addr = testAddr
	transfers, err := api.GetAssetTransfers(t.Context(), GetTransfersOptions{
		FromAddress: &addr,
		FromBlock:   0,
		ToBlock:     0,
	})
	require.NoError(t, err)
	require.NotEmpty(t, transfers)
}

func Test_API_GetAssetTransfers2(t *testing.T) {
	conf, err := config.NewConfig(t.Context())
	require.NoError(t, err)
	if conf.AlchemyAPIKey == "" {
		t.Skip("ALCHEMY_API_KEY not set, skipping integration test")
	}
	api := NewAPI(conf)
	var addr = "0x6a946845a742a80a07ce1181e68d91d3f0232ec0"
	transfers, err := api.GetAssetTransfers(t.Context(), GetTransfersOptions{
		FromAddress: &addr,
		FromBlock:   0,
		ToBlock:     23428161,
	})
	require.NoError(t, err)
	require.NotEmpty(t, transfers)
	require.Greater(t, len(transfers), 10)
}
